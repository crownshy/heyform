import { htmlUtils } from '@heyform-inc/answer-utils'
import type { FormModel } from '@heyform-inc/shared-types-enums'
import { FieldKindEnum } from '@heyform-inc/shared-types-enums'
import { helper } from '@heyform-inc/utils'
import { type FC, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { Async } from '@/components'
import { Spin, notification } from '@/components/ui'
import { IFormField } from '@/pages/form/views/FormComponents/typings'
import { FormService } from '@/service'
import { useStore } from '@/store'
import { useParam } from '@/utils'

import type { IState } from './store'
import { StoreContext, storeReducer } from './store'
import './style.scss'
import { initFields } from './utils'
import { Queue } from './utils/queue'
import { Compose } from './views/Compose'
import { LeftSidebar } from './views/LeftSidebar'
import { LogicBulkEditPanel } from './views/LogicBulkEditPanel'
import { LogicFlow } from './views/LogicFlow'
import { LogicPanel } from './views/LogicPanel'
import { RightSidebar } from './views/RightSidebar'
import { VariablePanel } from './views/VariablePanel'

// Keep in sync with FORM_REVISION_CONFLICT_MESSAGE in
// packages/server/src/service/form.service.ts
const FORM_REVISION_CONFLICT_MESSAGE =
  'This form was changed in another tab or by a teammate while you were editing. Refresh the page to see the latest version before making more changes.'

const QUEUE_OPTIONS = {
  concurrency: 1,
  scheduleInterval: 1_000,
  taskIntervalTime: 10_000
}

const FormBuilder: FC<{ form: FormModel }> = ({ form }) => {
  const formStore = useStore('formStore')
  const initialState: IState = {
    formId: form.id,
    version: 0,
    reversion: form.reversion || 0,
    references: [],
    activeTabName: 'question',
    variables: form.variables,
    locale: form.settings?.locale || 'en',
    hiddenFields: form.hiddenFields || [],
    ...initFields(form.fields, form.logics)
  }
  const [state, dispatch] = useReducer(storeReducer, initialState)
  const store = useMemo(() => ({ state, dispatch }), [state])

  // Always-current snapshot of state for use inside queued saves, so a save
  // reads the latest fields/logics/variables/reversion at the moment it
  // actually runs rather than whatever was current when it was scheduled.
  const stateRef = useRef(state)
  stateRef.current = state

  // Fields, logics and variables are saved independently (separate
  // mutations), but all three share one optimistic-concurrency counter on
  // the server. Serializing their network calls here stops this tab's own
  // saves from racing each other and tripping a false conflict.
  const writeLockRef = useRef<Promise<unknown>>(Promise.resolve())

  function serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = writeLockRef.current.then(fn, fn)
    writeLockRef.current = run.catch(() => undefined)
    return run
  }

  // Each kind of edit gets its own debounce/coalescing queue; sharing one
  // queue across kinds would let a logics save silently discard a still-
  // pending fields save (or vice versa).
  const fieldsQueue = useMemo(() => new Queue(QUEUE_OPTIONS), [form.id])
  const logicsQueue = useMemo(() => new Queue(QUEUE_OPTIONS), [form.id])
  const variablesQueue = useMemo(() => new Queue(QUEUE_OPTIONS), [form.id])

  // Helper function to sanitize choices before server submission
  function sanitizeChoices(choices: any[]) {
    if (!helper.isValidArray(choices)) {
      return choices
    }
    return choices.map(choice => ({
      id: choice.id,
      label: choice.label,
      ...(choice.image && { image: choice.image })
    }))
  }

  function getUpdates(fields?: IFormField[]) {
    const result = {
      fields: [] as IFormField[]
    }

    if (helper.isValidArray(fields)) {
      for (const row of fields!) {
        const field: IFormField = {
          id: row.id,
          kind: row.kind,
          title: htmlUtils.parse(row.title! as string),
          description: htmlUtils.parse(row.description! as string),
          validations: row.validations,
          properties: row.properties,
          layout: row.layout
        }

        // Sanitize choices before sending to server
        if (field.properties?.choices && helper.isValidArray(field.properties.choices)) {
          field.properties.choices = sanitizeChoices(field.properties.choices)
        }

        if (row.kind === FieldKindEnum.GROUP) {
          field.properties = {
            ...field.properties,
            ...getUpdates(row.properties?.fields)
          }
        }

        result.fields.push(field)
      }
    }

    return result
  }

  function handleConflict() {
    if (stateRef.current.conflict) {
      return
    }

    dispatch({ type: 'setConflict' })
    fieldsQueue.clear()
    logicsQueue.clear()
    variablesQueue.clear()

    notification.error({
      title: 'Form changed elsewhere',
      message:
        'Someone else saved changes to this form while you were editing, so your last change could not be saved. Reload the page to continue on the latest version.',
      duration: 0
    })
  }

  async function withConflictHandling(op: () => Promise<unknown>) {
    if (stateRef.current.conflict) {
      return
    }

    try {
      await serialize(op)
      dispatch({ type: 'incrementReversion' })
    } catch (err: any) {
      if (err.message === FORM_REVISION_CONFLICT_MESSAGE) {
        handleConflict()
        return
      }

      notification.error({
        message: 'Error',
        title: err.message
      })
    }
  }

  async function syncForm() {
    await withConflictHandling(() =>
      FormService.updateFormSchemas(
        form.id,
        getUpdates(stateRef.current.fields!),
        stateRef.current.reversion
      )
    )
  }

  async function syncLogics() {
    await withConflictHandling(() =>
      FormService.updateLogics(form.id, stateRef.current.logics || [], stateRef.current.reversion)
    )
  }

  async function syncVariables() {
    await withConflictHandling(() =>
      FormService.updateVariables(
        form.id,
        stateRef.current.variables || [],
        stateRef.current.reversion
      )
    )
  }

  function visibilityListener() {
    if (document.visibilityState === 'hidden') {
      syncForm()
    }
  }

  useEffect(() => {
    formStore.update({
      logics: state.logics,
      variables: state.variables
    })
  }, [state.logics, state.variables])

  const didMountLogics = useRef(false)
  useEffect(() => {
    if (didMountLogics.current) {
      logicsQueue.add(syncLogics)
    } else {
      didMountLogics.current = true
    }
  }, [state.logics])

  const didMountVariables = useRef(false)
  useEffect(() => {
    if (didMountVariables.current) {
      variablesQueue.add(syncVariables)
    } else {
      didMountVariables.current = true
    }
  }, [state.variables])

  useEffect(() => {
    formStore.update(getUpdates(state.fields!))

    // Add to queue
    if (state.version > 0) {
      fieldsQueue.add(syncForm)
    }

    document.addEventListener('visibilitychange', visibilityListener)

    return () => {
      document.removeEventListener('visibilitychange', visibilityListener)
    }
  }, [state.version])

  return (
    <StoreContext.Provider value={store}>
      <>
        <div className="form-builder">
          {state.activeTabName === 'logic' ? (
            <LogicFlow />
          ) : (
            <>
              <LeftSidebar />
              <Compose />
            </>
          )}
          <RightSidebar />
          {state.isLogicPanelOpen && <LogicPanel />}
          {state.isVariablePanelOpen && <VariablePanel />}
          {state.isBulkEditPanelOpen && <LogicBulkEditPanel />}
        </div>

        <div className="flex h-full items-center justify-center px-8 text-center md:hidden">
          Please edit the form via the web page on your computer.
        </div>
      </>
    </StoreContext.Provider>
  )
}

const FormCreate = () => {
  const { formId } = useParam()
  const [form, setForm] = useState<FormModel>()

  async function request() {
    const result: FormModel = await FormService.detail(formId)
    setForm(result)
    return true
  }

  const Skeleton = (
    <div className="flex h-full items-center justify-center text-blue-700">
      <Spin />
    </div>
  )

  return (
    <Async className="h-full" request={request} skeleton={Skeleton} deps={[formId]}>
      {form && <FormBuilder form={form!} />}
    </Async>
  )
}

export default FormCreate
