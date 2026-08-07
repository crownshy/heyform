import { Content, Portal, Root, Trigger } from '@radix-ui/react-tooltip'
import clsx from 'clsx'
import { FC, ReactNode } from 'react'

import { IComponentProps } from '../typings'

export interface TooltipProps extends IComponentProps {
  disabled?: boolean
  ariaLabel: ReactNode
  // Extra class applied to the floating content, e.g. to widen inline tooltips.
  contentClassName?: string
}

export const Tooltip: FC<TooltipProps> = ({
  ariaLabel,
  contentClassName,
  children,
  ...restProps
}) => {
  return (
    <Root delayDuration={0}>
      <Trigger asChild {...restProps}>
        {children}
      </Trigger>
      <Portal>
        <Content
          className={clsx(
            'heyform-tooltip-content z-50 overflow-hidden rounded-md bg-[var(--heyform-button-color)] px-3 py-1.5 text-sm text-[var(--heyform-button-text-color)] shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            contentClassName
          )}
          sideOffset={6}
          collisionPadding={8}
        >
          {ariaLabel}
        </Content>
      </Portal>
    </Root>
  )
}
