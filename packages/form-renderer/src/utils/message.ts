export function sendMessageToParent(eventName: string, payload?: Record<string, unknown>) {
  window.parent?.postMessage(
    {
      source: 'HEYFORM',
      eventName,
      ...payload
    },
    '*'
  )
}
