import { helper } from '@heyform-inc/utils'
import { IconCheck, IconPhoto } from '@tabler/icons-react'
import clsx from 'clsx'
import { FC, KeyboardEvent, ReactNode, useCallback, useMemo } from 'react'

import { Input, stopEvent } from '@/components/ui'
import type { IComponentProps } from '@/components/ui/typing'
import { useKey } from '@/utils'

import { useTranslation } from '../utils'
import { selectOnSpace } from './optionKeyboard'

export interface ChoiceRadioOption {
  keyName?: string
  label: string
  value: any
  icon?: ReactNode
  image?: string
  enableImage?: boolean
  disabled?: boolean
}

interface ChoiceRadioProps extends ChoiceRadioOption, Omit<IComponentProps, 'onClick'> {
  isChecked?: boolean
  isOther?: boolean
  isHotkeyShow?: boolean
  role?: 'radio' | 'checkbox'
  tabIndex?: number
  onClick?: (value: any) => void
  onChange?: (value: any) => void
}

export const ChoiceRadio: FC<ChoiceRadioProps> = ({
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
  isOther,
  role = 'radio',
  tabIndex,
  onClick,
  onChange,
  ...restProps
}) => {
  const { t } = useTranslation()

  const handleClick = useCallback(
    (event: any) => {
      stopEvent(event)

      if (!disabled) {
        onClick?.(value)
      }
    },
    [disabled, onClick, value]
  )

  const handleInputChange = useCallback(
    (newValue: any) => {
      onChange?.(newValue)
    },
    [onChange]
  )

  const labelChildren = useMemo(() => {
    if (isOther) {
      if (!isChecked) {
        return <div className="heyform-radio-label-text">{value || label}</div>
      }

      return (
        <Input
          value={value}
          placeholder={t('Type your answer')}
          aria-label={t('Other')}
          autoFocus={true}
          onClick={stopEvent}
          onChange={handleInputChange}
        />
      )
    }

    return label
  }, [isChecked, isOther, label, value])

  useKey(keyName?.toLowerCase() as string, handleClick)

  // While "Other" shows its text box, the card stops being a radio: a radio's children are
  // hidden from screen readers, which would hide the box. The box is labelled "Other" instead.
  const isEditingOther = isOther && isChecked
  const optionProps = isEditingOther
    ? {}
    : {
        role,
        tabIndex,
        'aria-checked': !!isChecked,
        'aria-disabled': disabled || undefined,
        'aria-keyshortcuts': keyName && isHotkeyShow ? keyName : undefined,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => selectOnSpace(event, handleClick)
      }

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
      {...optionProps}
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
          <div className="heyform-radio-label">{labelChildren}</div>
        </div>
        <div className="heyform-radio-icon" aria-hidden="true">
          <IconCheck />
        </div>
      </div>
    </div>
  )
}
