import { Choice } from '@heyform-inc/shared-types-enums'
import { helper } from '@heyform-inc/utils'
import { FC, useMemo } from 'react'

import { SheetCellProps } from '../types'

export const RankingCell: FC<SheetCellProps> = ({ column, row }) => {
  const value = useMemo(() => {
    const v = row[column.key]

    if (helper.isValid(v) && helper.isObject(v) && helper.isValidArray(v.value)) {
      const choices = column.properties?.choices

      if (helper.isValidArray(choices)) {
        return v.value
          .map((choiceId: string, index: number) => {
            const choice = choices!.find((c: Choice) => c.id === choiceId)
            return choice ? `${index + 1}. ${choice.label}` : null
          })
          .filter(Boolean)
          .join(', ')
      }
    }

    return ''
  }, [column.key, column.properties?.choices, row])

  return (
    <div className="heygrid-cell-text overflow-hidden text-ellipsis whitespace-nowrap">
      {value}
    </div>
  )
}