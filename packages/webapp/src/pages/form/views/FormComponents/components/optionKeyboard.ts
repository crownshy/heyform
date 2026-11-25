import type { KeyboardEvent } from 'react'

const OPTION_SELECTOR = '[role="radio"], [role="checkbox"]'
const NEXT_KEYS = ['ArrowDown', 'ArrowRight']
const PREVIOUS_KEYS = ['ArrowUp', 'ArrowLeft']

export function optionRole(allowMultiple: boolean) {
  return allowMultiple ? 'checkbox' : 'radio'
}

export function groupRole(allowMultiple: boolean) {
  return allowMultiple ? 'group' : 'radiogroup'
}

// Single-select groups are one tab stop (the checked option, else the first) and arrows
// move between options. Multi-select options are each a tab stop, like native checkboxes.
export function optionTabIndex(allowMultiple: boolean, index: number, checkedIndex: number) {
  if (allowMultiple) {
    return 0
  }

  return index === Math.max(checkedIndex, 0) ? 0 : -1
}

// Arrows only move focus. Selecting a single choice auto-advances the form, so moving
// and selecting together would skip the question on the first key press.
export function moveOptionFocus(event: KeyboardEvent<HTMLElement>) {
  const step = NEXT_KEYS.includes(event.key) ? 1 : PREVIOUS_KEYS.includes(event.key) ? -1 : 0

  if (step === 0) {
    return
  }

  const options = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(OPTION_SELECTOR))
  const current = options.indexOf(event.target as HTMLElement)

  if (current === -1) {
    return
  }

  event.preventDefault()
  options[(current + step + options.length) % options.length].focus()
}

export function selectOnSpace(
  event: KeyboardEvent<HTMLElement>,
  select: (event: KeyboardEvent<HTMLElement>) => void
) {
  if (event.key === ' ' && event.target === event.currentTarget) {
    event.preventDefault()
    select(event)
  }
}
