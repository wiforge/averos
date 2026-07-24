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
import { FieldViewLayout, GroupedFieldViewLayout } from '@averos/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

export type SimpleGroupedViewLayout = {
  group: GroupedFieldViewLayout
  groupedFieldsLayout: FieldViewLayout[]
  isCompositeField?: boolean
  /**
   * the layout to be applied to the composite field:
   *  * inline : the field and sub fields are displayed in a dedicated group within the same parent view
   *  * tabbed: fits mainly to relations. The target relation entity is displayed in a tab
   *  * newpage: fits mainly to 'composite' and 'iterable'field type.
   *              The field/relation/entities are displayed in a seperate page / component.
   *              (ex. a new component with a grid container for iterable field)
   *
   */
  compositeFieldLayout?: string // inline, tabbed, newpage
  compositeFieldType?: string // the field type is either 'simple', 'composite' or 'iterable'
}

export type TransformedSimpleViewLayoutGroup = SimpleGroupedViewLayout[] // a simple view layout group that is displayed in one component

@Pipe({
  name: 'toViewLayout',
  standalone: false,
})
export class ToViewLayoutPipe implements PipeTransform {
  transform(
    viewLayout: Observable<FieldViewLayout[]>,
    ...args: unknown[]
  ): Observable<TransformedSimpleViewLayoutGroup> {
    // const result = viewLayout.pipe(map(vl => vl.reduce(groupByGroupID, [])));
    // result.subscribe(console.log);

    return viewLayout.pipe(map((vl) => vl.reduce(this.groupByGroupID, [])))
  }

  /**
   *
   * @param fieldViewLayoutItem
   * @returns either an aggregation/composition relation (0|1)->(0|1) OneToOne or not
   */
  isCompositeField = (fieldViewLayoutItem: FieldViewLayout) => {
    if (
      fieldViewLayoutItem?.entityFieldName === null ||
      fieldViewLayoutItem?.entityFieldName === undefined
    ) {
      return false
    }
    return (
      fieldViewLayoutItem?.typeName !== null &&
      fieldViewLayoutItem?.typeName !== undefined &&
      fieldViewLayoutItem?.type === 'composite'
    )
  }

  /**
   * Either a collection relation (0|1)->n or an aggregation/composition (0|1)->(0|1)
   */
  isCompositeRelationField = (fieldViewLayoutItem: FieldViewLayout) => {
    if (
      fieldViewLayoutItem?.entityFieldName === null ||
      fieldViewLayoutItem?.entityFieldName === undefined
    ) {
      return false
    }
    return (
      fieldViewLayoutItem?.typeName != null &&
      (fieldViewLayoutItem?.type === 'composite' || fieldViewLayoutItem?.type === 'collection')
    )
  }

  inlineViewCompositeField = (fieldViewLayoutItem: FieldViewLayout) => {
    return (
      (this.isCompositeField(fieldViewLayoutItem) ||
        this.isCompositeNavigationKey(fieldViewLayoutItem.entityFieldName)) &&
      (!fieldViewLayoutItem.fieldGroup ||
        (fieldViewLayoutItem.fieldGroup && fieldViewLayoutItem.fieldGroup.layout === 'inline'))
    )
  }

  /**
   * Either a collection relation (0|1) -> n or not
   */
  isIterableField = (fieldViewLayoutItem: FieldViewLayout) => {
    if (
      fieldViewLayoutItem?.entityFieldName === null ||
      fieldViewLayoutItem?.entityFieldName === undefined
    ) {
      return false
    }
    return fieldViewLayoutItem?.typeName != null && fieldViewLayoutItem?.type === 'collection'
  }

  /**
   * Either a relationship navigation key is composite or not :
   * - composite navigationKey = compositeEntity.field1 / f1.f2.f3
   * - simple navigationKey = "field1"
   */
  isCompositeNavigationKey = (entityFieldName: string) => {
    if (entityFieldName === null || entityFieldName === undefined) {
      return false
    }
    return entityFieldName.split('.').length > 1
  }

  groupByGroupID = (
    transformedViewLayout: TransformedSimpleViewLayoutGroup,
    fieldViewLayoutItem: FieldViewLayout,
  ): TransformedSimpleViewLayoutGroup => {
    // get any existing groups having the same groupID as the current element
    const simpleGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
      (groupedViewLayout) =>
        groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
        !!groupedViewLayout.groupedFieldsLayout.find(
          (fViewLayout) =>
            !this.isCompositeField(fViewLayout) &&
            !this.isCompositeRelationField(fViewLayout) &&
            !this.isCompositeNavigationKey(fViewLayout.entityFieldName),
        ),
    )

    const compositeGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
      (groupedViewLayout) =>
        groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
        !!groupedViewLayout.groupedFieldsLayout.find(
          (fViewLayout) =>
            this.isCompositeField(fViewLayout) ||
            fViewLayout.entityFieldName.split('.')[0] ===
              fieldViewLayoutItem.entityFieldName.split('.')[0],
        ),
    )

    // add simpleGroupedFields
    if (simpleGroupedFields.length === 1) {
      if (fieldViewLayoutItem.visible) {
        simpleGroupedFields[0].groupedFieldsLayout.push(fieldViewLayoutItem)
      }
    } else {
      if (
        fieldViewLayoutItem.visible &&
        !this.isCompositeField(fieldViewLayoutItem) &&
        !this.isCompositeRelationField(fieldViewLayoutItem) &&
        !this.isCompositeNavigationKey(fieldViewLayoutItem.entityFieldName)
      ) {
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
      if (
        fieldViewLayoutItem.visible &&
        (this.isCompositeField(fieldViewLayoutItem) ||
          this.isCompositeRelationField(fieldViewLayoutItem) ||
          this.isCompositeNavigationKey(fieldViewLayoutItem.entityFieldName))
      ) {
        transformedViewLayout.push({
          group: fieldViewLayoutItem.fieldGroup,
          groupedFieldsLayout: [fieldViewLayoutItem],
          isCompositeField: true,
          compositeFieldLayout: this.inlineViewCompositeField(fieldViewLayoutItem)
            ? 'inline'
            : null,
        } as SimpleGroupedViewLayout)
      }
    }
    return transformedViewLayout
  }
}
