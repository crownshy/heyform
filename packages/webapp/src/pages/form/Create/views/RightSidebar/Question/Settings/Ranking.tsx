import type { FC } from 'react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { SwitchField } from '@/components'
import { useStoreContext } from '@/pages/form/Create/store'

import type { IBasicProps } from './Basic'

export const Ranking: FC<IBasicProps> = ({ field }) => {
  const { t } = useTranslation()
  const { dispatch } = useStoreContext()

  function handleRandomize(randomize: boolean) {
    dispatch({
      type: 'updateField',
      payload: {
        id: field.id,
        updates: {
          properties: {
            ...field.properties,
            randomize
          }
        }
      }
    })
  }

  const handleRandomizeCallback = useCallback(handleRandomize, [field.properties])

  return (
    <>
      <div className="right-sidebar-settings-item">
        <SwitchField
          label={t('formBuilder.randomize')}
          value={field.properties?.randomize}
          onChange={handleRandomizeCallback}
        />
      </div>
    </>
  )
}