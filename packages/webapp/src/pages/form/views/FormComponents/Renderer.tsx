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

// In-flow chrome that sits above `.heyform-block-main` inside the active question and so falls
// outside the height we measure: the group header, and a non-inline media layout (h-64 below
// 800px). An inline layout renders inside block-main and is already counted.
const CHROME_ABOVE_MAIN = ['.heyform-block-group', '.heyform-block-scroll > .heyform-layout']

// Margins included, and 0 when the element is out of the flow: above 800px both selectors above are
// absolutely positioned and overlay the question rather than pushing it down.
function inFlowHeight(el: HTMLElement) {
  const style = window.getComputedStyle(el)

  if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') {
    return 0
  }

  return (
    el.offsetHeight + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0)
  )
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

  // Post the height the active question needs out to an embedding parent, so a cross-origin iframe
  // can size itself to the question instead of guessing. The parent can't measure us across
  // origins, so we measure here and post it out.
  //
  // Base is `.heyform-block-main` (the question's content box), whose bottom margin also keeps the
  // pinned footer clear. Not the scroll wrapper or container, even though those are what overflow:
  // both are floored to the frame height (h-full / min-h-full), so measuring them would report the
  // frame straight back and it could never shrink again for a short question.
  //
  // Plus the chrome above the wrapper that is in flow below 800px (group header, non-inline media
  // layout at its mobile h-64). It sits outside block-main, and this document is `h-screen
  // overflow-hidden` with `overflow-y: auto` inner containers below 800px, so a frame short by that
  // much gives the embed a second scrollbar inside the frame rather than a taller page.
  //
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

    function activeElements() {
      const body = document.querySelector<HTMLElement>('.heyform-body-active')

      if (!body) {
        return { main: null, chrome: [] as HTMLElement[] }
      }

      return {
        main: body.querySelector<HTMLElement>('.heyform-block-main'),
        chrome: CHROME_ABOVE_MAIN.flatMap(selector =>
          Array.from(body.querySelectorAll<HTMLElement>(selector))
        )
      }
    }

    function emit() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { main, chrome } = activeElements()

        if (!main) {
          return
        }

        const height = Math.ceil(
          main.offsetHeight + chrome.reduce((total, el) => total + inFlowHeight(el), 0)
        )

        if (height > 0) {
          sendResizeMessage(height)
        }
      })
    }

    function onParentMessage(e: MessageEvent) {
      if (e.data?.source === 'COMHAIRLE' && e.data.eventName === 'REQUEST_RESIZE') {
        emit()
      }
    }

    emit()

    const { main, chrome } = activeElements()
    const observer = new ResizeObserver(emit)

    if (main) {
      observer.observe(main)
    }

    // The chrome is observed too: a group header wrapping onto a second line, or a media layout
    // settling once its image decodes, changes the height the frame needs without touching
    // block-main, so block-main alone would never fire.
    chrome.forEach(el => observer.observe(el))

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

    sendStepChangeMessage({
      index: state.scrollIndex ?? 0,
      total: state.fields.length,
      percentage: state.percentage
    })
  }, [state.scrollIndex, state.fields.length, state.percentage])

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
