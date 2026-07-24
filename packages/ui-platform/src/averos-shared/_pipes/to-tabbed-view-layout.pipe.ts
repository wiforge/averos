/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 *
 */

import { Pipe, PipeTransform } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { SimpleGroupedViewLayout, TransformedSimpleViewLayoutGroup } from './to-view-layout.pipe'
import { FieldViewLayout } from '@averos/core'

export type TabbedViewLayout = {
  transformedViewLayout: TransformedSimpleViewLayoutGroup
  tabIndex: number
}

export type TransformedTabbedViewLayout = TabbedViewLayout[]

@Pipe({
  name: 'toTabbedViewLayout',
  standalone: false,
})
export class ToTabbedViewLayoutPipe implements PipeTransform {
  transform(
    viewLayout: Observable<FieldViewLayout[]>,
    ...args: unknown[]
  ): Observable<TransformedSimpleViewLayoutGroup> {
    const isCompositeField = (fieldViewLayoutItem: FieldViewLayout) => {
      if (
        fieldViewLayoutItem?.entityFieldName === null ||
        fieldViewLayoutItem?.entityFieldName === undefined
      ) {
        return false
      }
      return fieldViewLayoutItem?.entityFieldName.split('.').length > 1
    }
    const groupByGroupID = (
      transformedViewLayout: TransformedSimpleViewLayoutGroup,
      fieldViewLayoutItem: FieldViewLayout,
    ) => {
      // get any existing groups having the same groupID as the current element
      const simpleGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
        (groupedViewLayout) =>
          groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
          !!groupedViewLayout.groupedFieldsLayout.find(
            (fViewLayout) => !isCompositeField(fViewLayout),
          ),
      )

      const compositeGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
        (groupedViewLayout) =>
          groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
          !!groupedViewLayout.groupedFieldsLayout.find((fViewLayout) =>
            isCompositeField(fViewLayout),
          ),
      )

      // add simpleGroupedFields
      if (simpleGroupedFields.length === 1) {
        if (fieldViewLayoutItem.visible) {
          simpleGroupedFields[0].groupedFieldsLayout.push(fieldViewLayoutItem)
        }
      } else {
        if (fieldViewLayoutItem.visible && !isCompositeField(fieldViewLayoutItem)) {
          transformedViewLayout.push({
            group: fieldViewLayoutItem.fieldGroup,
            groupedFieldsLayout: [fieldViewLayoutItem],
            isCompositeField: false,
          } as SimpleGroupedViewLayout)
        }
      }

      // add compositeGroupedFields
      if (compositeGroupedFields.length === 1) {
        if (fieldViewLayoutItem.visible) {
          compositeGroupedFields[0].groupedFieldsLayout.push(fieldViewLayoutItem)
        }
      } else {
        if (fieldViewLayoutItem.visible && isCompositeField(fieldViewLayoutItem)) {
          transformedViewLayout.push({
            group: fieldViewLayoutItem.fieldGroup,
            groupedFieldsLayout: [fieldViewLayoutItem],
            isCompositeField: true,
          } as SimpleGroupedViewLayout)
        }
      }
      return transformedViewLayout
    }

    const result = viewLayout.pipe(map((vl) => vl.reduce(groupByGroupID, [])))

    return viewLayout.pipe(map((vl) => vl.reduce(groupByGroupID, [])))
  }
}
