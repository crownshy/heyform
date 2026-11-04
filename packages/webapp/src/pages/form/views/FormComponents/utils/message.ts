import { useEffect, useRef } from 'react'

export function sendHideModalMessage() {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName: 'HIDE_EMBED_MODAL'
    },
    '*'
  )
}

// Report the active question's content height to an embedding parent, so a
// cross-origin iframe can size itself to the question instead of guessing. The parent can't measure
// us across origins, so we measure here and post it out.
export function sendResizeMessage(height: number) {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName: 'FORM_RESIZE',
      height
    },
    '*'
  )
}

// Tell an embedding parent that a new question became active, so it can scroll the page back to the
// top and move its own progress indicator. The iframe auto-sizes to each question, so the parent
// window (not the iframe) is what scrolls; without this it would stay at the previous question's
// scroll offset after advancing.
//
// `index` and `total` are the position in the logic-applied field list (thank-you screen included),
// so `index / total` is how far through the form the participant is. `percentage` is the form's own
// answered-questions figure, the one the in-form progress bar shows.
export function sendStepChangeMessage(progress: {
  index: number
  total: number
  percentage: number
}) {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName: 'FORM_STEP_CHANGE',
      ...progress
    },
    '*'
  )
}

// Tell an embedding parent whether it can page back and whether forward will submit, so a host
// that hides our arrows (`?hideNavigation=true`) can page the form from its own buttons.
export function sendNavigationStateMessage(navigation: {
  canGoPrevious: boolean
  isLastQuestion: boolean
}) {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName: 'FORM_NAVIGATION_STATE',
      ...navigation
    },
    '*'
  )
}

type ParentEventName = 'REQUEST_RESIZE' | 'NAVIGATE_NEXT' | 'NAVIGATE_PREVIOUS'

export function useParentMessage(eventName: ParentEventName, callback: () => void) {
  // Held in a ref so the listener always calls the latest closure without re-subscribing.
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return

    function onMessage(e: MessageEvent) {
      if (e.data?.source === 'COMHAIRLE' && e.data.eventName === eventName) {
        callbackRef.current()
      }
    }

    window.addEventListener('message', onMessage)

    return () => window.removeEventListener('message', onMessage)
  }, [eventName])
}
