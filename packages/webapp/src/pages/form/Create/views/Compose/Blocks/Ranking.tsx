import { Choice } from '@heyform-inc/shared-types-enums'
import { nanoid } from '@heyform-inc/utils'
import { IconX, IconGripVertical } from '@tabler/icons-react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactSortable } from 'react-sortablejs'

import { Button, Input, KeyCode } from '@/components/ui'
import { useStoreContext } from '@/pages/form/Create/store'

import type { BlockProps } from './Block'
import { Block } from './Block'

interface RankingItemProps {
  index: number
  choice: Choice
  enableRemove?: boolean
  onRemove: (id: string) => void
  onChange?: (id: string, label: string) => void
}

const RankingItem: FC<RankingItemProps> = ({
  index,
  choice,
  enableRemove,
  onRemove,
  onChange
}) => {
  const { t } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)

  function handleRemove() {
    onRemove(choice.id)
  }

  function handleChange(value: any) {
    onChange?.(choice.id, value)
  }

  function handleBlur() {
    setIsFocused(false)
  }

  function handleFocus() {
    setIsFocused(true)
  }

  return (
    <div className="heyform-radio">
      <div className="heyform-radio-container">
        <div className="heyform-radio-content">
          <div className="heyform-radio-grip">
            <IconGripVertical size={16} />
          </div>
          <div className="heyform-radio-hotkey">{index + 1}</div>
          <div className="heyform-radio-label">
            <Input
              value={choice.label}
              placeholder={isFocused ? t('formBuilder.choicePlaceholder') : undefined}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onChange={handleChange}
            />
          </div>
          {enableRemove && (
            <div className="heyform-radio-remove" onClick={handleRemove}>
              <IconX />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const Ranking: FC<BlockProps> = ({ field, locale, ...restProps }) => {
  const { t } = useTranslation()
  const { dispatch } = useStoreContext()

  function handleAddChoice() {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            choices: [
              ...(field.properties?.choices || []),
              {
                id: nanoid(12),
                label: ''
              }
            ]
          }
        }
      }
    })
  }

  function handleChoiceRemove(id: string) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            choices: field.properties?.choices?.filter(c => c.id !== id)
          }
        }
      }
    })
  }

  function handleLabelChange(id: string, label: string) {
    const choices = field.properties?.choices || []
    const index = choices.findIndex(c => c.id === id)

    choices[index].label = label

    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            choices
          }
        }
      }
    })
  }

  const handleChoicesReorder = useCallback((newChoices: Choice[]) => {
    // Clean the choices to remove any extra properties added by ReactSortable
    const cleanedChoices = newChoices.map(choice => ({
      id: choice.id,
      label: choice.label,
      ...(choice.image && { image: choice.image })
    }))
    
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            choices: cleanedChoices
          }
        }
      }
    })
  }, [field.id, field.properties, dispatch])

  const handleAddChoiceCallback = useCallback(handleAddChoice, [field.properties])
  const handleChoiceRemoveCallback = useCallback(handleChoiceRemove, [field.properties])
  const handleLabelChangeCallback = useCallback(handleLabelChange, [field.properties])

  return (
    <Block className="heyform-multiple-choice" field={field} locale={locale} {...restProps}>
      <ReactSortable
        list={field.properties?.choices || []}
        setList={handleChoicesReorder}
        className="heyform-multiple-choice-list"
        ghostClass="heyform-radio-ghost"
        chosenClass="heyform-radio-chosen"
        dragClass="heyform-radio-dragging"
        animation={150}
        handle=".heyform-radio-grip"
      >
        {field.properties?.choices?.map((choice, index) => (
          <RankingItem
            key={choice.id}
            index={index}
            choice={choice}
            enableRemove={field.properties!.choices!.length > 1}
            onRemove={handleChoiceRemoveCallback}
            onChange={handleLabelChangeCallback}
          />
        ))}
      </ReactSortable>
      <div className="heyform-add-choice">
        <Button.Link className="heyform-add-column" onClick={handleAddChoiceCallback}>
          {t('formBuilder.addChoice')}
        </Button.Link>
      </div>
    </Block>
  )
}