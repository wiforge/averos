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
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'
import { SimpleGroupedViewLayout, TransformedSimpleViewLayoutGroup } from './to-view-layout.pipe'
import { FieldViewLayout } from '@averos/core'

export type CompositeViewLayoutGroup = {
  transformedViewLayoutGroup: TransformedSimpleViewLayoutGroup
  order: number
  isParent?: boolean
  /**
   * componentPlaceholder is relevent for composite 1<-->1 relations:
   *  - 'inline' : the relation is displayed as a button in the parent view. An entity view use case is triggered on click
   *  - 'tab' : the relation is displayed as a seperate tab
   *  componentPlaceholder = ParentFieldViewLayout.fieldGroup.layout
   */
  // componentPlaceholder?: string; // 'inline' || 'tab'
  relationType?: string // = 'collection' (FieldViewLayout.type == 'collection) in case 1->n relation / 'composition' (FieldViewLayout.type == 'composite') in case 1->1 relation : FieldViewLayout.type
  // relationOwnerFieldViewLayout?: FieldViewLayout; // the fieldviewlayout related to the owner/parent relation (used for usecaseviewlayout retrieval)
}

export type TransformedCompositeViewLayout = {
  transformedCompositeViewLayoutGroups: CompositeViewLayoutGroup[]
  /**
   *   containerType?: string; // COMPOSITE, SIMPLE
   *
   * - COMPOSITE: if the entity {has at least one composite relation} (a relation with an other entity)
   *             if at least one field satisfying the following criteria exists:
   *                 {{viewLayout.type == "collection"}
   *               or
   *                 {viewLayout.type="composite"}
   *
   *
   * - SIMPLE: if the entity does not have any composite relations with other entities
   */
  containerType?: string // COMPOSITE, SIMPLE

  /**
   * viewLayout?: string;
   *
   *   - "tab": if at least: { {one field is composite} and {viewLayout.layout == "tab"} }
   *   - "inline": {if at least one field is composite} and {all viewLayout.layout != "tab"}
   *
   */
  viewLayout?: string // the whole composite entity view Layout: 'tab' or 'inline'
}

@Pipe({
  name: 'toCompositeViewLayout',
  standalone: false,
})
export class ToCompositeViewLayoutPipe implements PipeTransform {
  transform(
    viewLayout: Observable<FieldViewLayout[]>,
    ...args: unknown[]
  ): Observable<TransformedCompositeViewLayout> {
    // const result = viewLayout.pipe(map(vl => vl.reduce(this.generateTransformedCompositeViewLayout, {transformedCompositeViewLayoutGroups: []} as TransformedCompositeViewLayout)));

    // result.subscribe(console.log);

    return viewLayout.pipe(
      map((vl) =>
        vl.reduce(this.generateTransformedCompositeViewLayout, {
          transformedCompositeViewLayoutGroups: [],
        } as TransformedCompositeViewLayout),
      ),
    )
  }

  generateTransformedCompositeViewLayout = (
    transformedCompositeViewLayout: TransformedCompositeViewLayout,
    fieldViewLayoutItem: FieldViewLayout,
    index: number,
    viewLayout: FieldViewLayout[],
  ): TransformedCompositeViewLayout => {
    // transformedCompositeViewLayout = {
    //                                   transformedCompositeViewLayoutGroups: CompositeViewLayoutGroup[],
    //                                   containerType?: string; // COMPOSITE,SIMPLE
    //                                   viewLayout?: 'SIMPLE' // the whole composite entity view Layout: 'tab' or 'inline'
    //                                 };
    const fViewLayoutAlreadyAdded =
      transformedCompositeViewLayout.transformedCompositeViewLayoutGroups.filter(
        (v) =>
          v.transformedViewLayoutGroup.filter(
            (a) =>
              a.groupedFieldsLayout.filter(
                (b) => b.entityFieldName === fieldViewLayoutItem.entityFieldName,
              ).length > 0,
          ).length > 0,
      ).length > 0
    const fViewLayoutfieldIsVisible = fieldViewLayoutItem.visible

    if (!fViewLayoutAlreadyAdded && fViewLayoutfieldIsVisible) {
      if (this.isCompositeRelationField(fieldViewLayoutItem)) {
        if (this.isIterableField(fieldViewLayoutItem)) {
          transformedCompositeViewLayout.containerType = 'COMPOSITE'
        } else if (this.isCompositeField(fieldViewLayoutItem)) {
          if (
            !fieldViewLayoutItem.fieldGroup ||
            (fieldViewLayoutItem.fieldGroup.layout &&
              fieldViewLayoutItem.fieldGroup.layout !== 'tab')
          ) {
            transformedCompositeViewLayout.containerType = 'SIMPLE'
          } else {
            transformedCompositeViewLayout.containerType = 'COMPOSITE'
          }
        } else {
          transformedCompositeViewLayout.containerType = 'SIMPLE'
        }
      } else {
        // if the layout is already marked as 'COMPOSITE' for at least one field then keep it COMPOSITE
        if (transformedCompositeViewLayout.containerType !== 'COMPOSITE') {
          transformedCompositeViewLayout.containerType = 'SIMPLE'
        }
      }

      if (this.isCompositeRelationField(fieldViewLayoutItem)) {
        if (!transformedCompositeViewLayout.viewLayout) {
          transformedCompositeViewLayout.viewLayout = 'inline'
        }

        if (fieldViewLayoutItem?.fieldGroup?.layout === 'tab') {
          transformedCompositeViewLayout.viewLayout = 'tab'
        }
      }

      // add Parent group
      // add inlined composite one to one fields to a new composite view layout group in the Parent composite view layout group
      // add none composite fields to parent group
      if (
        (!this.isCompositeRelationField(fieldViewLayoutItem) ||
          this.inlineViewCompositeField(fieldViewLayoutItem)) &&
        transformedCompositeViewLayout.transformedCompositeViewLayoutGroups.filter(
          (v) => v.isParent,
        )?.length === 0
      ) {
        let transformedSimpleViewLayoutGroup: TransformedSimpleViewLayoutGroup = viewLayout
          .filter((v) => !this.isCompositeRelationField(v) || this.inlineViewCompositeField(v))
          .reduce(this.groupByGroupID, [])
        transformedCompositeViewLayout.transformedCompositeViewLayoutGroups.push({
          transformedViewLayoutGroup: transformedSimpleViewLayoutGroup,
          order: 0,
          isParent: true,
        } as CompositeViewLayoutGroup)
      }

      // add composite relation groups
      if (this.isCompositeRelationField(fieldViewLayoutItem)) {
        // add one to many (colletion) relationship to a new composite view layout group
        if (this.isIterableField(fieldViewLayoutItem)) {
          let transformedSimpleViewLayoutGroup: TransformedSimpleViewLayoutGroup = viewLayout
            .filter((v) => this.isCompositeRelationField(v) && !this.inlineViewCompositeField(v))
            .filter((a) => a.entityFieldName === fieldViewLayoutItem.entityFieldName)
            .reduce(this.groupByGroupID, [])
          transformedCompositeViewLayout.transformedCompositeViewLayoutGroups.push({
            transformedViewLayoutGroup: transformedSimpleViewLayoutGroup,
            order: fieldViewLayoutItem.order,
            isParent: false,
            relationType: fieldViewLayoutItem.type,
          } as CompositeViewLayoutGroup)
        }
      }
    }
    return transformedCompositeViewLayout
  }

  isCompositeField = (fieldViewLayoutItem: FieldViewLayout) => {
    if (
      fieldViewLayoutItem?.entityFieldName === null ||
      fieldViewLayoutItem?.entityFieldName === undefined
    ) {
      return false
    }
    let isNavigationKeyComposite = fieldViewLayoutItem?.entityFieldName.split('.').length > 1
    return (
      isNavigationKeyComposite ||
      (fieldViewLayoutItem?.typeName != null && fieldViewLayoutItem?.type === 'composite')
    )
  }

  inlineViewCompositeField = (fieldViewLayoutItem: FieldViewLayout) => {
    return (
      this.isCompositeField(fieldViewLayoutItem) &&
      (!fieldViewLayoutItem.fieldGroup ||
        (fieldViewLayoutItem.fieldGroup && fieldViewLayoutItem.fieldGroup.layout === 'inline'))
    )
  }

  isIterableField = (fieldViewLayoutItem: FieldViewLayout) => {
    if (
      fieldViewLayoutItem?.entityFieldName === null ||
      fieldViewLayoutItem?.entityFieldName === undefined
    ) {
      return false
    }
    return fieldViewLayoutItem?.typeName != null && fieldViewLayoutItem?.type === 'collection'
  }

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

  groupByGroupID = (
    transformedViewLayout: TransformedSimpleViewLayoutGroup,
    fieldViewLayoutItem: FieldViewLayout,
  ): TransformedSimpleViewLayoutGroup => {
    // "get any existing groups having the same groupID as the current element"
    const simpleGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
      (groupedViewLayout) =>
        groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
        !!groupedViewLayout.groupedFieldsLayout.find(
          (fViewLayout) => !this.isCompositeField(fViewLayout),
        ),
    )

    const compositeGroupedFields: SimpleGroupedViewLayout[] = transformedViewLayout.filter(
      (groupedViewLayout) =>
        groupedViewLayout.group?.groupId === fieldViewLayoutItem?.fieldGroup?.groupId &&
        !!groupedViewLayout.groupedFieldsLayout.find((fViewLayout) =>
          this.isCompositeField(fViewLayout),
        ),
    )

    // add simpleGroupedFields
    if (simpleGroupedFields.length === 1) {
      if (fieldViewLayoutItem.visible) {
        simpleGroupedFields[0].groupedFieldsLayout.push(fieldViewLayoutItem)
      }
    } else {
      if (fieldViewLayoutItem.visible && !this.isCompositeField(fieldViewLayoutItem)) {
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
      if (fieldViewLayoutItem.visible && this.isCompositeField(fieldViewLayoutItem)) {
        transformedViewLayout.push({
          group: fieldViewLayoutItem.fieldGroup,
          groupedFieldsLayout: [fieldViewLayoutItem],
          isCompositeField: true,
        } as SimpleGroupedViewLayout)
      }
    }
    return transformedViewLayout
  }

  // getCompositeViewLayout(): Observable<TransformedCompositeViewLayout>{

  //   return of(this.getUserTransformedVL());
  // }

  //   getUserTransformedVL(): TransformedCompositeViewLayout {
  //     return {
  //       containerType: 'COMPOSITE',
  //       viewLayout: 'tab',
  //       transformedCompositeViewLayoutGroups :
  //                     [
  //                       {
  //                         transformedViewLayoutGroup:
  //                             [
  //                               {
  //                               group: {groupId: 1, groupOrder: 1},
  //                               isCompositeField: false,
  //                               groupedFieldsLayout:
  //                                   [
  //                                   {
  //                                     defaultValue: '' ,
  //                                     disabled: true,
  //                                     entityFieldName: 'userName',
  //                                     fieldGroup: {groupId: 1, groupOrder: 1},
  //                                     icon: 'person',
  //                                     label: 'User Name',
  //                                     labelTranslationID: 'user.userName',
  //                                     order: 1,
  //                                     placeholder: '',
  //                                     placeholderTranslationID: '' ,
  //                                     required: true,
  //                                     type: 'string',
  //                                     visible: true
  //                                   }
  //                                   ]
  //                               }
  //                             ],
  //                         order: 1,
  //                         isParent: true
  //                       },
  //                       {
  //                         transformedViewLayoutGroup:
  //                             [
  //                               {
  //                               group: {groupId: 9, layout: 'tab', groupLabel: 'Roles', groupLabelTranslationID: 'user.group.userRole', groupOrder: 1},
  //                               isCompositeField: false,
  //                               groupedFieldsLayout:
  //                                   [
  //                                   {
  //                                     entityFieldName: 'roles',
  //                                     fieldGroup: {groupId: 9, layout: 'tab', groupLabel: 'Roles', groupLabelTranslationID: 'user.group.userRole', groupOrder: 1},
  //                                     icon: 'groups',
  //                                     label: 'Roles',
  //                                     labelTranslationID: 'user.roles',
  //                                     order: 1,
  //                                     placeholder: '',
  //                                     placeholderTranslationID: '',
  //                                     required: false,
  //                                     type: 'collection',
  //                                     typeName: 'Role',
  //                                     visible: true
  //                                   }
  //                                   ]
  //                               }
  //                             ],
  //                         order: 2,
  //                         isParent: false,
  //                         relationType: 'collection'
  //                       },
  //                       {
  //                         transformedViewLayoutGroup:
  //                             [
  //                               {
  //                               group: {groupId: 10, layout: 'tab', groupLabel: 'Creator', groupLabelTranslationID: 'user.createdBy', groupOrder: 1},
  //                               isCompositeField: false,
  //                               groupedFieldsLayout:
  //                                   [
  //                                     {
  //                                     entityFieldName: 'createdBy',
  //                                     fieldGroup: {groupId: 10, layout: 'tab', groupLabel: 'Creator', groupLabelTranslationID: 'user.createdBy', groupOrder: 1},
  //                                     label: 'createdBy',
  //                                     labelTranslationID: 'user.createdBy',
  //                                     order: 3,
  //                                     type: 'composite',
  //                                     typeName: 'User',
  //                                     visible: true,
  //                                     }
  //                                   ]
  //                               }
  //                             ],
  //                         order: 3,
  //                         isParent: false,
  //                         relationType: 'composition'
  //                       }
  //                     ]
  // } as TransformedCompositeViewLayout;

  //   }

  //   getRoleTransformedVL(): TransformedCompositeViewLayout{
  //     return {
  //       containerType: 'COMPOSITE',
  //       viewLayout: 'tab',
  //       transformedCompositeViewLayoutGroups :
  //                     [
  //                       {
  //                         transformedViewLayoutGroup:
  //                             [
  //                               {
  //                               group: {groupId: 1, groupOrder: 1},
  //                               isCompositeField: false,
  //                               groupedFieldsLayout:
  //                                   [
  //                                   {
  //                                     defaultValue: '' ,
  //                                     disabled: true,
  //                                     entityFieldName: 'name',
  //                                     fieldGroup: {groupId: 1, groupOrder: 1},
  //                                     icon: 'person',
  //                                     label: 'Role Name',
  //                                     labelTranslationID: '',
  //                                     order: 1,
  //                                     placeholder: '',
  //                                     placeholderTranslationID: '' ,
  //                                     required: true,
  //                                     type: 'string',
  //                                     visible: true
  //                                   }
  //                                   ]
  //                               }
  //                             ],
  //                         order: 1,
  //                         isParent: true
  //                       },
  //                       {
  //                         transformedViewLayoutGroup:
  //                             [
  //                               {
  //                               group: {groupId: 9, layout: 'tab', groupLabel: 'Roles', groupLabelTranslationID: 'user.group.userRole', groupOrder: 1},
  //                               isCompositeField: false,
  //                               groupedFieldsLayout:
  //                                   [
  //                                   {
  //                                     entityFieldName: 'users',
  //                                     fieldGroup: {groupId: 9, layout: 'tab', groupLabel: 'Roles', groupLabelTranslationID: 'user.group.userRole', groupOrder: 1},
  //                                     icon: 'groups',
  //                                     label: 'Users',
  //                                     labelTranslationID: '',
  //                                     order: 1,
  //                                     placeholder: '',
  //                                     placeholderTranslationID: '',
  //                                     required: false,
  //                                     type: 'collection',
  //                                     typeName: 'User',
  //                                     visible: true
  //                                   }
  //                                   ]
  //                               }
  //                             ],
  //                         order: 2,
  //                         isParent: false,
  //                         relationType: 'collection'

  //                       }
  //                     ]
  // } as TransformedCompositeViewLayout;

  //   }
}
