import { helper } from '@heyform-inc/utils'
import { FC, useCallback, useEffect, useState } from 'react'

import { FormField } from '../components'
import { useStore } from '../store'
import { useTranslation } from '../utils'
import type { BlockProps } from './Block'
import { Block } from './Block'
import { Form } from './Form'
import { useChoicesOption } from './hook'

interface RankingOption {
  id: string
  label: string
}

interface DraggableRankingItemProps {
  option: RankingOption
  index: number
  isDragging: boolean
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDragEnd: () => void
}

const DraggableRankingItem: FC<DraggableRankingItemProps> = ({
  option,
  index,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd
}) => {
  return (
    <div
      className={`heyform-radio ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDragEnd={onDragEnd}
    >
      <div className="heyform-radio-container">
        <div className="heyform-radio-content">
          <div className="heyform-radio-grip">≡</div>
          <div className="heyform-radio-hotkey">{index + 1}</div>
          <div className="heyform-radio-label">{option.label}</div>
        </div>
      </div>
    </div>
  )
}

interface RankingInputProps {
  options: RankingOption[]
  value?: { value: string[] }
  onChange?: (value: { value: string[] }) => void
}

const RankingInput: FC<RankingInputProps> = ({ options, value, onChange }) => {
  const [rankedOptions, setRankedOptions] = useState<RankingOption[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize with shuffled options or existing order - only run once or when options change
  useEffect(() => {
    if (value?.value && value.value.length > 0 && !initialized) {
      // Restore previous order
      const ordered = value.value.map(id => options.find(opt => opt.id === id)).filter(Boolean) as RankingOption[]
      if (ordered.length === options.length) {
        setRankedOptions(ordered)
        setInitialized(true)
      }
    } else if (!initialized && options.length > 0) {
      // Shuffle options for initial display
      const shuffled = [...options].sort(() => Math.random() - 0.5)
      setRankedOptions(shuffled)
      setInitialized(true)
    }
  }, [options, value, initialized])

  // Reset initialization when options change
  useEffect(() => {
    setInitialized(false)
  }, [options])

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((index: number) => {
    if (draggedIndex === null || draggedIndex === index) return

    const newOptions = [...rankedOptions]
    const draggedItem = newOptions[draggedIndex]
    newOptions.splice(draggedIndex, 1)
    newOptions.splice(index, 0, draggedItem)

    setRankedOptions(newOptions)
    setDraggedIndex(index)
  }, [draggedIndex, rankedOptions])

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null)
    // Update form value
    const orderedIds = rankedOptions.map(option => option.id)
    onChange?.({ value: orderedIds })
  }, [rankedOptions, onChange])

  return (
    <div className="heyform-radio-group">
      {rankedOptions.map((option, index) => (
        <DraggableRankingItem
          key={option.id}
          option={option}
          index={index}
          isDragging={draggedIndex === index}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  )
}

export const Ranking: FC<BlockProps> = ({ field, ...restProps }) => {
  const { state } = useStore()
  const { t } = useTranslation()

  const options = useChoicesOption(
    field.properties?.choices,
    false, // Don't randomize here, we handle it in the component
    state.translations?.[state.locale]?.[field.id]?.choices,
    undefined // No badge for ranking
  )

  function getValues({ value }: any) {
    return helper.isValidArray(value?.value) ? value : undefined
  }

  return (
    <Block className="heyform-multiple-choice" field={field} {...restProps}>
      <Form
        initialValues={{
          value: state.values[field.id]
        }}
        autoSubmit={false}
        isSubmitShow={true}
        field={field}
        getValues={getValues}
      >
        <FormField
          name="value"
          rules={[
            {
              validator: (_, value) => {
                if (field.validations?.required) {
                  if (!value || !helper.isValidArray(value.value) || value.value.length !== options.length) {
                    return Promise.reject(t('Please rank all options'))
                  }
                }
                return Promise.resolve()
              }
            }
          ]}
        >
          <RankingInput options={options} />
        </FormField>
      </Form>
    </Block>
  )
}