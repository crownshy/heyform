import { helper } from '@heyform-inc/utils'
import { FC, useCallback, useEffect, useState } from 'react'
import { ReactSortable } from 'react-sortablejs'
import { IconGripVertical } from '@tabler/icons-react'

import { FormField } from '../components'
import { useStore } from '../store'
import { useTranslation } from '../utils'
import type { BlockProps } from './Block'
import { Block } from './Block'
import { Form } from './Form'
import { useChoicesOption } from './hook'

interface RankingOption {
	keyName: string
	label: string
	value: string
	image?: string
}

interface RankingItemProps {
	option: RankingOption
	index: number
}

const RankingItem: FC<RankingItemProps> = ({ option, index }) => {
	return (
		<div className="heyform-radio">
			<div className="heyform-radio-container">
				<div className="heyform-radio-content">
					<div className="heyform-radio-grip">
						<IconGripVertical size={16} />
					</div>
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

	// Initialize with shuffled options or existing order
	useEffect(() => {
		if (value?.value && value.value.length > 0) {
			// Restore previous order with clean data
			const ordered = value.value.map(id => {
				const option = options.find(opt => opt.value === id)
				return option ? {
					keyName: option.keyName,
					label: option.label,
					value: option.value,
					...(option.image && { image: option.image })
				} : null
			}).filter(Boolean) as RankingOption[]

			if (ordered.length === options.length) {
				setRankedOptions(ordered)
				return
			}
		}

		// Shuffle options for initial display or if restore failed with clean data
		const cleanOptions = options.map(opt => ({
			keyName: opt.keyName,
			label: opt.label,
			value: opt.value,
			...(opt.image && { image: opt.image })
		}))
		const shuffled = [...cleanOptions].sort(() => Math.random() - 0.5)
		setRankedOptions(shuffled)
	}, [options, value])

	const handleSortEnd = useCallback((newList: RankingOption[]) => {
		// Clean the list to remove any extra properties added by ReactSortable
		const cleanedList = newList.map(option => ({
			keyName: option.keyName,
			label: option.label,
			value: option.value,
			...(option.image && { image: option.image })
		}))

		setRankedOptions(cleanedList)
		// Update form value
		const orderedIds = cleanedList.map(option => option.value)
		const result = { value: orderedIds }
		onChange?.(result)
	}, [onChange])

	return (
		<ReactSortable
			list={rankedOptions}
			setList={handleSortEnd}
			className="heyform-radio-group"
			ghostClass="heyform-radio-ghost"
			chosenClass="heyform-radio-chosen"
			dragClass="heyform-radio-dragging"
			animation={150}
			handle=".heyform-radio-grip"
		>
			{rankedOptions.map((option, index) => (
				<RankingItem
					key={option.value}
					option={option}
					index={index}
				/>
			))}
		</ReactSortable>
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
		const result = helper.isValidArray(value?.value) ? value : undefined
		return result
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
