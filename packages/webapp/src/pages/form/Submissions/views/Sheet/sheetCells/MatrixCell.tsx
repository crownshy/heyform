import { Choice } from '@heyform-inc/shared-types-enums'
import { helper } from '@heyform-inc/utils'
import { FC, useMemo } from 'react'

import { SheetCellProps } from '../types'

export const MatrixCell: FC<SheetCellProps> = ({ column, row }) => {
  const value = useMemo(() => {
    const v = row[column.key]

    if (helper.isValid(v) && helper.isObject(v)) {
      const choices = column.properties?.choices
      const maxStars = column.properties?.total || 5

      if (helper.isValidArray(choices)) {
        return choices
          .map((choice: Choice) => {
            const rating = v[choice.id] || v[choice.value]
            if (rating && rating > 0) {
              return `${choice.label}: ${rating}/${maxStars}`
            }
            return `${choice.label}: -`
          })
          .join(', ')
      }
    }

    return ''
  }, [column.key, column.properties?.choices, column.properties?.total, row])

  return (
    <div className="heygrid-cell-text overflow-hidden text-ellipsis whitespace-nowrap">
      {value}
    </div>
  )
}