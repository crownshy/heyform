import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { FC } from 'react'

import { Button, Tooltip } from '@/components/ui'

import { useStore } from '../store'
import { useTranslation } from '../utils'

export const Footer: FC = () => {
  const { state, dispatch } = useStore()
  const { t } = useTranslation()

  function handlePrevious() {
    dispatch({ type: 'scrollPrevious' })
  }

  function handleNext() {
    dispatch({ type: 'scrollNext' })
  }

  return (
    <div className="heyform-footer">
      <div className="heyform-footer-wrapper">
        <div className="heyform-footer-left"></div>

        <div className="heyform-footer-right">
          <div className="heyform-pagination">
            <Tooltip ariaLabel={t('Previous question')} placement="top">
              <div>
                <Button.Link
                  className="heyform-pagination-previous"
                  trailing={<IconChevronUp />}
                  disabled={state.scrollIndex! < 1}
                  onClick={handlePrevious}
                />
              </div>
            </Tooltip>

            <Tooltip ariaLabel={t('Next question')} placement="top">
              <div>
                <Button.Link
                  className="heyform-pagination-next"
                  trailing={<IconChevronDown />}
                  disabled={
                    state.isScrollNextDisabled || state.scrollIndex! >= state.fields.length - 1
                  }
                  onClick={handleNext}
                />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
