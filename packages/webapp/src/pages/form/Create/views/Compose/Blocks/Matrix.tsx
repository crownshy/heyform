import { Choice } from '@heyform-inc/shared-types-enums'
import { nanoid } from '@heyform-inc/utils'
import { IconX } from '@tabler/icons-react'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button, Input, Rate } from '@/components/ui'
import { RATING_SHAPE_CONFIG } from '@/pages/form/Create/consts'
import { useStoreContext } from '@/pages/form/Create/store'

import type { BlockProps } from './Block'
import { Block } from './Block'

interface MatrixItemProps {
	index: number
	choice: Choice
	enableRemove?: boolean
	onRemove: (id: string) => void
	onChange?: (id: string, label: string) => void
	characterRender: (index: number) => React.ReactNode
	maxStars: number
}

const MatrixItem: FC<MatrixItemProps> = ({
	index,
	choice,
	enableRemove,
	onRemove,
	onChange,
	characterRender,
	maxStars
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
					<div className="heyform-matrix-rating">
						<Rate count={maxStars} itemRender={characterRender} />
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

export const Matrix: FC<BlockProps> = ({ field, locale, ...restProps }) => {
	const { t } = useTranslation()
	const { dispatch } = useStoreContext()
	const shape = field.properties?.shape || 'star'
	const maxStars = field.properties?.total || 5
	const choices = field.properties?.choices || []

	function characterRender(index: number) {
		return (
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
				{RATING_SHAPE_CONFIG[shape] || RATING_SHAPE_CONFIG['star']}
				<span className="heyform-rate-index">{index}</span>
			</div>
		)
	}

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

	const handleAddChoiceCallback = useCallback(handleAddChoice, [field.properties])
	const handleChoiceRemoveCallback = useCallback(handleChoiceRemove, [field.properties])
	const handleLabelChangeCallback = useCallback(handleLabelChange, [field.properties])

	return (
		<Block className="heyform-matrix" field={field} locale={locale} {...restProps}>
			<div className="heyform-multiple-choice-list">
				{choices.length > 0 ? (
					choices.map((choice: any, index: number) => (
						<MatrixItem
							key={choice.id || index}
							index={index}
							choice={choice}
							enableRemove={choices.length > 1}
							onRemove={handleChoiceRemoveCallback}
							onChange={handleLabelChangeCallback}
							characterRender={characterRender}
							maxStars={maxStars}
						/>
					))
				) : (
					<div className="heyform-radio">
						<div className="heyform-radio-container">
							<div className="heyform-radio-content">
								<div className="heyform-radio-hotkey">1</div>
								<div className="heyform-radio-label">Option 1</div>
								<div className="heyform-matrix-rating">
									<Rate count={maxStars} itemRender={characterRender} />
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
			<div className="heyform-add-choice">
				<Button.Link className="heyform-add-column" onClick={handleAddChoiceCallback}>
					{t('formBuilder.addChoice')}
				</Button.Link>
			</div>
		</Block>
	)
}
