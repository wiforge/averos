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
import { EntityViewLayout, ViewLayoutMappingRecord } from '@averos/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Pipe({
  name: 'transformViewLayout',
  standalone: false,
})
export class TransformViewLayoutPipe implements PipeTransform {
  transform(
    entityViewLayout: Observable<EntityViewLayout<any>>,
    mappingRecords: ViewLayoutMappingRecord[] = [],
  ): Observable<EntityViewLayout<any>> {
    if (
      !mappingRecords ||
      mappingRecords === undefined ||
      mappingRecords === null ||
      mappingRecords.length === 0
    ) {
      return entityViewLayout
    }
    return entityViewLayout?.pipe(map((vl) => this.transformEntityViewLayout(vl, mappingRecords)))
  }

  transformEntityViewLayout(
    entityViewLayout: EntityViewLayout<any>,
    mappingRecords: ViewLayoutMappingRecord[],
  ): EntityViewLayout<any> {
    return this.getTransformedEntityViewLayout(entityViewLayout, mappingRecords)
  }
  getTransformedEntityViewLayout(
    entityViewLayout: EntityViewLayout<any>,
    mappingRecords: ViewLayoutMappingRecord[],
  ): EntityViewLayout<any> {
    mappingRecords.forEach((vLayoutMappingRecord: ViewLayoutMappingRecord) => {
      entityViewLayout = this.transformWithSingleMappingEntry(
        entityViewLayout,
        vLayoutMappingRecord,
        vLayoutMappingRecord.mappingKey,
      )
    })
    return entityViewLayout
  }
  transformWithSingleMappingEntry(
    currentObject: any,
    vLayoutMappingRecord: ViewLayoutMappingRecord,
    secondDepthKey: string,
  ) {
    let paths = secondDepthKey.split('.')
    if (!paths || paths.length === 0) {
      return currentObject
    }
    let firstKey = paths[0]
    secondDepthKey = secondDepthKey.substring(firstKey.length + 1, secondDepthKey.length)
    if (secondDepthKey === '') {
      ////last element => set the value
      if (!!vLayoutMappingRecord.mappingValue) {
        currentObject[firstKey] = vLayoutMappingRecord.mappingValue
        return currentObject
      } else {
        return currentObject
      }
    } else if (firstKey.includes('[')) {
      // ex: "field2[key='criteria'].field4"
      //// fetch current element
      //key='criteria'
      let searChCriteria = firstKey.slice(firstKey.indexOf('[') + 1, firstKey.indexOf(']')) //ex: entityFieldName="exportedApplicationFileName"
      // key
      let sCriteriaKey = searChCriteria.slice(0, searChCriteria.indexOf('='))
      //criteria
      let sCriteriaValue = searChCriteria.slice(
        searChCriteria.indexOf('=') + 1,
        searChCriteria.length,
      )
      //field2
      let collectionFieldKey = firstKey.slice(0, firstKey.indexOf('[')) //ucViewLayout
      let targetCollection = currentObject[collectionFieldKey] as Array<any>
      let targetCollectionEntry = targetCollection?.find((e) => e[sCriteriaKey] === sCriteriaValue)

      if (!!targetCollectionEntry) {
        let oldCollectionEntry = targetCollectionEntry
        let newCollectionEntry = this.transformWithSingleMappingEntry(
          targetCollectionEntry,
          vLayoutMappingRecord,
          secondDepthKey,
        )
        ///update the collection with the new entry
        let oldEntryIndex = targetCollection.indexOf(oldCollectionEntry)
        if (oldEntryIndex > -1) {
          ;(currentObject[collectionFieldKey] as Array<any>).splice(oldEntryIndex, 1)
          ;(currentObject[collectionFieldKey] as Array<any>).push(newCollectionEntry)
        }

        return currentObject
      }
    } else {
      currentObject[firstKey] = this.transformWithSingleMappingEntry(
        currentObject[firstKey],
        vLayoutMappingRecord,
        secondDepthKey,
      )
      return currentObject
    }
  }
}
