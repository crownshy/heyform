import { helper } from '@heyform-inc/utils'
import type { CSSProperties, FC } from 'react'
import { startTransition, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BoldIcon, InfoIcon, ItalicIcon, LinkIcon, UnderlineIcon, UnlinkIcon } from '@/components'
import { Button, Checkbox, Form, Input, Portal } from '@/components/ui'

import { getRangeSelection, getStyleFromRect } from './utils'

interface FloatingToolbarProps extends Omit<IComponentProps, 'onChange'>, IModalProps {
	range?: Range
	onChange: () => void
}

interface ActiveState {
	isBold: boolean
	isItalic: boolean
	isStrikethrough: boolean
	isUnderline: boolean
	link?: string
	linkTarget?: string
	tooltip?: string
}

function getActiveState() {
	const state: ActiveState = {
		isBold: document.queryCommandState('bold'),
		isItalic: document.queryCommandState('italic'),
		isStrikethrough: document.queryCommandState('strikethrough'),
		isUnderline: document.queryCommandState('underline'),
		link: undefined,
		linkTarget: undefined,
		tooltip: undefined
	}

	const sel = window.getSelection()

	if (sel) {
		const linkElement = sel.anchorNode?.parentElement?.closest('a')
		if (linkElement) {
			state.link = linkElement.href
			state.linkTarget = linkElement.target
		}

		const tooltipElement = sel.anchorNode?.parentElement?.closest('.heyform-tooltip')
		if (tooltipElement) {
			state.tooltip = tooltipElement.getAttribute('data-tooltip') || ''
		}
	}

	return state
}

export const FloatingToolbar: FC<FloatingToolbarProps> = ({
	visible,
	range,
	onChange,
	onClose,
	...restProps
}) => {
	const { t } = useTranslation()
	const [portalStyle, setPortalStyle] = useState<CSSProperties>()
	const [activeState, setActiveState] = useState({} as ActiveState)
	const [linkBubbleVisible, setLinkBubbleVisible] = useState(false)
	const [tooltipBubbleVisible, setTooltipBubbleVisible] = useState(false)

	function handleBold() {
		document.execCommand('bold')
		onChange()
	}

	function handleItalic() {
		document.execCommand('italic')
		onChange()
	}

	function handleUnderline() {
		document.execCommand('underline')
		onChange()
	}

	function handleLinkOpen() {
		setLinkBubbleVisible(true)
	}

	async function handleLink({ url, openInNewWindow }: any) {
		setLinkBubbleVisible(false)

		const sel = getRangeSelection(range!)
		const node = document.createElement('a')
		const selectedText = sel!.toString()

		node.setAttribute('href', url)
		if (openInNewWindow) {
			node.setAttribute('target', '_blank')
			node.setAttribute('rel', 'noopener noreferrer')
		}
		node.innerText = selectedText

		range!.deleteContents()
		range!.insertNode(node)

		// Position cursor after the inserted link
		const newRange = document.createRange()
		newRange.setStartAfter(node)
		newRange.setEndAfter(node)
		sel!.removeAllRanges()
		sel!.addRange(newRange)

		startTransition(() => {
			setActiveState(getActiveState())
			onChange()
		})
	}

	function handleUnlink() {
		document.execCommand('unlink')
		onChange()
	}

	// Walk up from the current selection to find the tooltip term it sits inside, if any
	function getTooltipElement(): HTMLElement | null {
		let node: Node | null | undefined = range?.startContainer

		while (node && node !== document.body) {
			if (node instanceof HTMLElement && node.classList.contains('heyform-tooltip')) {
				return node
			}
			node = node.parentNode
		}

		return null
	}

	function handleTooltipOpen() {
		setTooltipBubbleVisible(true)
	}

	function handleTooltip({ definition }: any) {
		setTooltipBubbleVisible(false)

		const existing = getTooltipElement()

		if (existing) {
			// Editing an existing tooltip: just update the definition in place
			existing.setAttribute('data-tooltip', definition)
		} else {
			// Wrap the current selection in a new tooltip term
			const sel = getRangeSelection(range!)
			const node = document.createElement('span')

			node.setAttribute('class', 'heyform-tooltip')
			node.setAttribute('data-tooltip', definition)
			node.setAttribute('tabindex', '0')
			node.innerText = sel!.toString()

			range!.deleteContents()
			range!.insertNode(node)

			// Position cursor after the inserted tooltip term
			const newRange = document.createRange()
			newRange.setStartAfter(node)
			newRange.setEndAfter(node)
			sel!.removeAllRanges()
			sel!.addRange(newRange)
		}

		startTransition(() => {
			setActiveState(getActiveState())
			onChange()
		})
	}

	function handleRemoveTooltip() {
		setTooltipBubbleVisible(false)

		const existing = getTooltipElement()

		if (existing?.parentNode) {
			// Unwrap: swap the tooltip term back to its plain text
			const text = document.createTextNode(existing.textContent || '')
			existing.parentNode.replaceChild(text, existing)
		}

		startTransition(() => {
			setActiveState(getActiveState())
			onChange()
		})
	}

	function handleSelectRange() {
		const sel = window.getSelection()
		sel!.removeAllRanges()
		sel!.addRange(range!)

		return sel
	}

	useEffect(() => {
		if (helper.isValid(range) && range instanceof Range) {
			setPortalStyle(getStyleFromRect(range!.getBoundingClientRect()))
		}
	}, [range])

	useEffect(() => {
		if (visible) {
			setActiveState(getActiveState())
		}

		return () => {
			setActiveState({} as ActiveState)
		}
	}, [visible])

	return (
		<Portal visible={visible}>
			<div className="floating-toolbar">
				<div className="floating-toolbar-mask" onClick={onClose} />
				<div
					className="floating-toolbar-container flex items-center rounded-md bg-white px-1 py-0.5 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
					style={portalStyle}
					{...restProps}
				>
					{linkBubbleVisible ? (
						<Form.Custom
							inline
							initialValues={{
								url: activeState.link,
								openInNewWindow: activeState.linkTarget === '_blank'
							}}
							submitText="Apply"
							submitOptions={{
								className: 'ml-1 my-1',
								type: 'primary'
							}}
							onlySubmitOnValueChange={true}
							request={handleLink}
						>
							<Form.Item name="url" rules={[{ required: true }]}>
								<Input className="mb-1" placeholder="Paste or enter link here" />
							</Form.Item>
							<Form.Item name="openInNewWindow" valuePropName="checked">
								<Checkbox style={{ width: "20px", height: "20px", marginLeft: "20px" }}>{t('formBuilder.openInNewWindow')}</Checkbox>
							</Form.Item>
						</Form.Custom>
					) : tooltipBubbleVisible ? (
						<Form.Custom
							initialValues={{
								definition: activeState.tooltip
							}}
							submitText="Apply"
							submitOptions={{
								className: 'mt-2',
								type: 'primary',
								block: true
							}}
							onlySubmitOnValueChange={true}
							request={handleTooltip}
						>
							<div className="w-80 p-1">
								<div className="mb-1 flex items-center justify-between">
									<span className="text-sm font-medium text-slate-700">Tooltip definition</span>
									{activeState.tooltip && (
										<Button.Link
											className="text-sm text-red-600 hover:text-red-700"
											onClick={handleRemoveTooltip}
										>
											Remove
										</Button.Link>
									)}
								</div>
								<Form.Item name="definition" rules={[{ required: true }]}>
									<Input.Textarea
										className="w-full"
										rows={3}
										placeholder="Enter the definition to show when someone hovers this term"
									/>
								</Form.Item>
							</div>
						</Form.Custom>
					) : (
						<>
							<Button.Link leading={<BoldIcon className="text-slate-700" />} onClick={handleBold} />
							<Button.Link
								leading={<ItalicIcon className="text-slate-700" />}
								onClick={handleItalic}
							/>
							<Button.Link
								leading={<UnderlineIcon className="text-slate-700" />}
								onClick={handleUnderline}
							/>
							<Button.Link
								leading={<LinkIcon className="text-slate-700" />}
								onClick={handleLinkOpen}
							/>
							<Button.Link
								leading={<InfoIcon className="text-slate-700" />}
								onClick={handleTooltipOpen}
							/>
							{activeState.link && (
								<Button.Link
									leading={<UnlinkIcon className="text-slate-700" />}
									onClick={handleUnlink}
								/>
							)}
						</>
					)}
				</div>
			</div>
		</Portal>
	)
}
