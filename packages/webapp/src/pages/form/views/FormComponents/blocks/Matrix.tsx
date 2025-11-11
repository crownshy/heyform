import { helper } from '@heyform-inc/utils'
import type { FC } from 'react'
import { useState } from 'react'

import { Rate } from '@/components/ui'
import { RATING_SHAPE_ICONS } from '@/pages/form/views/FormComponents/consts'

import type { BlockProps } from './Block'
import { Block } from './Block'
import { FormField } from '../components'
import { useStore } from '../store'
import { useTranslation } from '../utils'
import { Form } from './Form'

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
	const shape = field.properties?.shape || 'star'
	const maxStars = field.properties?.total || 5
	const choices = field.properties?.choices || []

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
			<style jsx>{`
				.heyform-matrix-rating .rate-item-active .heyform-icon-fill {
					fill: #fbbf24 !important;
				}
				.heyform-matrix-rating .rate-item-hover .heyform-icon-fill {
					fill: #fbbf24 !important;
					opacity: 0.7;
				}
			`}</style>
			<Form
				initialValues={{
					input: state.values[field.id] || {}
				}}
				autoSubmit={false}
				isSubmitShow={true}
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
						options={choices.map((choice: any) => ({ id: choice.id || choice.value, label: choice.label }))}
						characterRender={characterRender}
						maxStars={maxStars}
					/>
				</FormField>
			</Form>
		</Block>
	)
}
