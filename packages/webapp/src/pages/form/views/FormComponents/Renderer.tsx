import { applyLogicToFields } from '@heyform-inc/answer-utils'
import {
  ActionEnum,
  FieldKindEnum,
  FormField,
  OTHER_FIELD_KINDS,
  QUESTION_FIELD_KINDS
} from '@heyform-inc/shared-types-enums'
import { helper } from '@heyform-inc/utils'
import clsx from 'clsx'
import type { FC } from 'react'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { FORM_LOCALES_OPTIONS } from '@/consts'
import { useQuery } from '@/utils'

import { ClosedMessage } from './blocks/ClosedMessage'
import type { IState, IStripe } from './store'
import { StoreContext, StoreReducer, getStorage } from './store'
import { getTheme } from './theme'
import type { IFormModel } from './typings'
import {
  flattenFieldsWithGroups,
  getPreferredLanguage,
  parseFields,
  progressPercentage,
  sendResizeMessage,
  sendStepChangeMessage
} from './utils'
import { Blocks } from './views/Blocks'
import { Sidebar } from './views/Sidebar'

export interface RendererProps {
  className?: string
  form: IFormModel
  stripeApiKey?: string
  stripeAccountId?: string
  autoSave?: boolean
  customUrlRedirects?: boolean
  reportAbuseURL?: string
  alwaysShowNextButton?: boolean
  onSubmit?: (values: Record<string, any>, isPartial?: boolean, stripe?: IStripe) => Promise<void>
}

function initStore(form: IFormModel, autoSave: boolean, allowPayment: boolean): IState {
  const locale = getPreferredLanguage({
    languages: FORM_LOCALES_OPTIONS.map(l => l.value),
    fallback: form.settings?.locale || 'en'
  })
  const list = parseFields(form.fields, form.translations?.[locale])

  const welcomeField = list.find(f => f.kind === FieldKindEnum.WELCOME)
  const thankYouField = list.find(f => f.kind === FieldKindEnum.THANK_YOU)

  let allFields = flattenFieldsWithGroups(list.filter(f => !OTHER_FIELD_KINDS.includes(f.kind)))

  if (!allowPayment) {
    allFields = allFields.filter(f => f.kind !== FieldKindEnum.PAYMENT)
  }

  const jumpFieldIds = (form.logics || [])
    .filter(l => l.payloads.some(p => p.action.kind === ActionEnum.NAVIGATE))
    .map(l => l.fieldId)

  const values = getStorage(form.id, autoSave)
  const { fields, variables } = applyLogicToFields(
    [...allFields, thankYouField].filter(Boolean) as FormField[],
    form.logics,
    form.variables,
    values
  )

  // Calculate answering progress percentage
  const questionCount = fields.filter(f => QUESTION_FIELD_KINDS.includes(f.kind)).length
  const percentage = progressPercentage(Object.keys(values).length, questionCount)

  return {
    welcomeField,
    thankYouField,
    allFields,
    fields,
    hiddenFields: form.hiddenFields || [],
    translations: form.translations,
    query: {},
    jumpFieldIds,
    logics: form.logics,
    parameters: form.variables,
    variables,
    values,
    percentage,
    questionCount,
    formId: form.id,
    scrollIndex: 0,
    scrollTo: 'next',
    settings: form.settings,
    autoSave,
    locale,
    theme: getTheme(form.themeSettings?.theme)
  }
}

export const Renderer: FC<RendererProps> = ({
  className,
  form,
  autoSave = true,
  stripeApiKey,
  stripeAccountId,
  reportAbuseURL,
  alwaysShowNextButton = false,
  customUrlRedirects = false,
  onSubmit
}) => {
  const query = useQuery()
  const [isAndroid, setAndroid] = useState(false)

  useEffect(() => {
    setAndroid(window.heyform.device.android)
  }, [])

  const allowPayment = useMemo(
    () => !!(stripeApiKey && stripeAccountId),
    [stripeApiKey, stripeAccountId]
  )
  const memoState: IState = useMemo(
    () => ({
      reportAbuseURL,
      customUrlRedirects,
      alwaysShowNextButton,
      onSubmit,
      ...initStore(form, autoSave, allowPayment),
      query
    }),
    [
      reportAbuseURL,
      customUrlRedirects,
      alwaysShowNextButton,
      onSubmit,
      query,
      form,
      autoSave,
      allowPayment
    ]
  )
  const [state, dispatch] = useReducer(StoreReducer, memoState)

  // Post the active question's content height out to an embedding parent, so a
  // cross-origin iframe can size itself to the question and stop its footer overlapping long
  // answers. We measure `.heyform-block-main` (the question's content box): its offsetHeight is the
  // real content height, and its bottom margin keeps the pinned footer clear. (The scroll wrapper is
  // floored to the frame height by min-h-full, so measuring it can't shrink short questions.)
  // Re-emits on question change, form start, and any reflow (fonts, wrapping options, validation).
  // Skipped when not embedded.
  //
  // We also answer a `REQUEST_RESIZE` ping from the parent by re-measuring on demand. The mount emit
  // is one-shot, so on a hard refresh (where a cached iframe can boot and emit before the parent's
  // message listener is attached) that first height can be missed and the frame stays stuck at its
  // fallback height. The parent pings until it hears a height back, and this handler replies, which
  // makes the handshake self-healing instead of dependent on who booted first.
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return

    let frame = 0

    function emit() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const wrapper = document.querySelector<HTMLElement>(
          '.heyform-body-active .heyform-block-main'
        )

        if (wrapper) {
          const height = Math.ceil(wrapper.offsetHeight)

          if (height > 0) {
            sendResizeMessage(height)
          }
        }
      })
    }

    function onParentMessage(e: MessageEvent) {
      if (e.data?.source === 'COMHAIRLE' && e.data.eventName === 'REQUEST_RESIZE') {
        emit()
      }
    }

    emit()

    const wrapper = document.querySelector<HTMLElement>('.heyform-body-active .heyform-block-main')
    const observer = new ResizeObserver(emit)

    if (wrapper) {
      observer.observe(wrapper)
    }

    window.addEventListener('resize', emit)
    window.addEventListener('message', onParentMessage)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', emit)
      window.removeEventListener('message', onParentMessage)
    }
  }, [state.scrollIndex, state.isStarted])

  // Tell an embedding parent when the active question changes so it can scroll the page back to the
  // top; the iframe auto-sizes to each question, so after clicking Next the parent window would
  // otherwise stay at the previous question's scroll offset. We compare against the previous index
  // (rather than a "first run" flag) so a genuine navigation is the only trigger, even if the effect
  // is invoked twice on mount under StrictMode.
  const prevScrollIndex = useRef(state.scrollIndex)
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return

    if (prevScrollIndex.current === state.scrollIndex) return
    prevScrollIndex.current = state.scrollIndex

    sendStepChangeMessage()
  }, [state.scrollIndex])

  if (!helper.isValidArray(form.fields)) {
    return <ClosedMessage form={form} />
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (allowPayment) {
      const paymentField = memoState.fields.find(f => f.kind === FieldKindEnum.PAYMENT)

      if (paymentField) {
        const stripe = (window as any).Stripe(stripeApiKey, {
          stripeAccount: stripeAccountId
        })

        dispatch({
          type: 'setStripe',
          payload: {
            stripe: {
              elements: stripe.elements({ locale: memoState.locale }),
              confirmCardPayment: stripe.confirmCardPayment.bind(stripe),
              apiKey: stripeApiKey,
              accountId: stripeAccountId
            }
          }
        })
      }
    }
  }, [])

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <div
        className={clsx(
          'heyform-root',
          {
            'heyform-root-open': state.isSidebarOpen,
            'heyform-root-android': isAndroid
          },
          className
        )}
      >
        <div
          className={clsx('heyform-wrapper', {
            'heyform-is-welcome': !state.isStarted && state.welcomeField
          })}
        >
          <Blocks />
        </div>
        {state.settings?.enableQuestionList && <Sidebar />}
      </div>
    </StoreContext.Provider>
  )
}
