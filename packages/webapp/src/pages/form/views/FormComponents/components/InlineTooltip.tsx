import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole
} from '@floating-ui/react'
import { FC, ReactNode, useState } from 'react'

export interface InlineTooltipProps {
  definition: ReactNode
  children: ReactNode
}

// Inline term tooltip for the form preview. Uses Floating UI (flip + shift) so
// the bubble stays inside the viewport, and a portal so it isn't clipped by the
// preview's overflow/scroll containers. Opens on hover and keyboard focus.
export const InlineTooltip: FC<InlineTooltipProps> = ({ definition, children }) => {
  const [open, setOpen] = useState(false)

  const { x, y, reference, floating, strategy, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context),
    useFocus(context),
    useRole(context, { role: 'tooltip' }),
    useDismiss(context)
  ])

  return (
    <>
      <span
        ref={reference}
        className="heyform-tooltip"
        tabIndex={0}
        {...getReferenceProps()}
      >
        {children}
      </span>

      {open && (
        <FloatingPortal>
          <div
            ref={floating}
            className="heyform-tooltip-inline"
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0
            }}
            {...getFloatingProps()}
          >
            {definition}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
