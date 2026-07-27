export function sendHideModalMessage() {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName: 'HIDE_EMBED_MODAL'
    },
    '*'
  )
}

// Report the active question's content height to an embedding parent (e.g. comhairle), so a
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
