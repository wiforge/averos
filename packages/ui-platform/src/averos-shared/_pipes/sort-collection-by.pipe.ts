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
import { TypeScriptTypeMetaDatatHandler } from '@averos/core'

@Pipe({
  name: 'sortCollectionBy',
  standalone: false,
})
export class SortCollectionByPipe implements PipeTransform {
  /**
   * Sorts an array based on the value orders of a field:
   *  # order : 'asc', 'desc'
   *  # field : a collection entity member
   */
  transform(collection: any[], order = '', field: string = ''): any[] | any {
    if (!collection || order === '' || !order) {
      return collection
    } // no array
    if (collection.length <= 1) {
      return collection
    } // array with only one item
    if (!field || field === '') {
      if (order === 'asc') {
        return collection.sort()
      } else {
        return collection.sort().reverse()
      }
    } // sort 1d array
    return collection.sort((a, b) => {
      const evalA = TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(a, field)
      const evalB = TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(b, field)
      if (
        !evalA ||
        !evalB ||
        evalA === null ||
        evalB === null ||
        evalA === undefined ||
        evalB === undefined ||
        evalA === '' ||
        evalB === ''
      )
      //  {return 0; }
      {
        return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
      }
      if (evalA > evalB) {
        return 1
      }
      if (evalA < evalB) {
        return -1
      }
      // return 0;
      {
        return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
      }
    })
  }
}
