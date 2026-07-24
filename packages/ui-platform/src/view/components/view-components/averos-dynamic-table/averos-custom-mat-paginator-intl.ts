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

import { Injectable } from '@angular/core'
import { MatPaginatorIntl } from '@angular/material/paginator'
import { translate } from '@averos/core'

@Injectable()
export class AverosCustomMatPaginatorIntl extends MatPaginatorIntl {
  override itemsPerPageLabel = translate('Items per page:', 'app.paginator.itemsperpagelabel')
  override nextPageLabel = translate('Next page', 'app.paginator.nextpagelabel')
  override previousPageLabel = translate('Previous page', 'app.paginator.previouspagelabel')
  override firstPageLabel = translate('First page', 'app.paginator.firstpagelabel')
  override lastPageLabel = translate('Last page', 'app.paginator.lastpagelabel')

  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return `0 ${translate('of', 'app.paginator.rangelabel')} ${length}`
    }
    const startIndex = page * pageSize
    const endIndex = Math.min(startIndex + pageSize, length)
    return `${startIndex + 1} - ${endIndex} ${translate('of', 'app.paginator.rangelabel')} ${length}`
  }
}
