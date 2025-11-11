import type { FC } from 'react'

import { FormField, Rate } from '../components'
import { RATING_SHAPE_ICONS } from '../consts'
import { useStore } from '../store'
import { useTranslation } from '../utils'
import type { BlockProps } from './Block'
import { Block } from './Block'
import { Form } from './Form'
import { useChoicesOption } from './hook'

function getShape(shape?: string) {
	let name = 'star'

	if (shape && Object.keys(RATING_SHAPE_ICONS).includes(shape)) {
		name = shape
	}

	return name
}

interface MatrixInputProps {
	options: Array<{ id: string; label: string }>
	value?: { [key: string]: number }
	onChange?: (value: { [key: string]: number }) => void
	characterRender: (index: number) => React.ReactNode
	maxStars: number
}

const MatrixInput: FC<MatrixInputProps> = ({ options, value = {}, onChange, characterRender, maxStars }) => {
	const handleRatingChange = (optionId: string, rating: number) => {
		const newValue = { ...value, [optionId]: rating }
		onChange?.(newValue)
	}

	return (
		<div className="heyform-radio-group">
			{options.map((option, index) => (
				<div key={option.id} className="heyform-radio">
					<div className="heyform-radio-container">
						<div className="heyform-radio-content">
							<div className="heyform-radio-hotkey">{index + 1}</div>
							<div className="heyform-radio-label">{option.label}</div>
							<div className="heyform-matrix-rating">
								<Rate
									count={maxStars}
									value={value[option.id] || 0}
									onChange={(rating) => handleRatingChange(option.id, rating)}
									itemRender={characterRender}
								/>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	)
}

export const Matrix: FC<BlockProps> = ({ field, ...restProps }) => {
	const { state } = useStore()
	const { t } = useTranslation()
	const shape = getShape(field.properties?.shape)
	const maxStars = field.properties?.total || 5

	const options = useChoicesOption(
		field.properties?.choices,
		false,
		state.translations?.[state.locale]?.[field.id]?.choices,
		undefined
	)

	function getValues(values: any) {
		return values.input
	}

	function characterRender(index: number) {
		return (
			<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
				{RATING_SHAPE_ICONS[shape] || RATING_SHAPE_ICONS['star']}
				<span className="heyform-rate-index">{index}</span>
			</div>
		)
	}

	return (
		<Block className="heyform-multiple-choice" field={field} {...restProps}>
			<Form
				initialValues={{
					input: state.values[field.id] || {}
				}}
				autoSubmit={true}
				isSubmitShow={false}
				field={field}
				getValues={getValues}
			>
				<FormField
					name="input"
					rules={[
						{
							validator: (_, value) => {
								if (field.validations?.required) {
									const answeredCount = value ? Object.keys(value).filter(key => value[key] > 0).length : 0
									if (answeredCount === 0) {
										return Promise.reject(t('This field is required'))
									}
								}
								return Promise.resolve()
							}
						}
					]}
				>
					<MatrixInput
						options={options}
						characterRender={characterRender}
						maxStars={maxStars}
					/>
				</FormField>
			</Form>
		</Block>
	)
}
