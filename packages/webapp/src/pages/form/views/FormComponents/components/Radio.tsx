import { helper } from '@heyform-inc/utils'
import { IconCheck, IconPhoto } from '@tabler/icons-react'
import clsx from 'clsx'
import type { FC, KeyboardEvent, ReactNode } from 'react'

import type { IComponentProps } from '@/components/ui/typing'
import { useKey } from '@/utils'

import { selectOnSpace } from './optionKeyboard'

export interface RadioOption {
  keyName?: string
  label: string
  value: any
  icon?: ReactNode
  image?: string
  enableImage?: boolean
  disabled?: boolean
}

interface RadioProps extends RadioOption, Omit<IComponentProps, 'onClick'> {
  isChecked?: boolean
  isHotkeyShow?: boolean
  role?: 'radio' | 'checkbox'
  tabIndex?: number
  onClick?: (value: any) => void
}

export const Radio: FC<RadioProps> = ({
  className,
  keyName,
  image,
  label,
  value,
  icon,
  enableImage,
  isHotkeyShow,
  disabled,
  isChecked,
  role = 'radio',
  tabIndex,
  onClick,
  ...restProps
}) => {
  function handleClick() {
    if (!disabled) {
      onClick?.(value)
    }
  }

  useKey(keyName?.toLowerCase() as string, handleClick)

  return (
    <div
      className={clsx(
        'heyform-radio',
        {
          'heyform-radio-selected': isChecked
        },
        className
      )}
      onClick={handleClick}
      role={role}
      tabIndex={tabIndex}
      aria-checked={!!isChecked}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={keyName && isHotkeyShow ? keyName : undefined}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => selectOnSpace(event, handleClick)}
      {...restProps}
    >
      <div className="heyform-radio-container">
        {enableImage && (
          <div className="heyform-radio-image">
            {helper.isURL(image) ? (
              <img src={image} alt={label} />
            ) : icon ? (
              icon
            ) : (
              <IconPhoto className="heyform-radio-placeholder" />
            )}
          </div>
        )}
        <div className="heyform-radio-content">
          {keyName && isHotkeyShow && <div className="heyform-radio-hotkey">{keyName}</div>}
          <div className="heyform-radio-label">{label}</div>
        </div>
        <div className="heyform-radio-icon" aria-hidden="true">
          <IconCheck />
        </div>
      </div>
    </div>
  )
}
