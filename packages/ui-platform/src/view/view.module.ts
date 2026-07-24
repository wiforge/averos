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

import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'
import { MaterialModule } from '../averos-core/material-module'
import { AverosSharedModule } from '../averos-shared/averos-shared.module'

import * as view from '../view/components/index'
import { AverosGenericTextDialogComponent } from './components/view-components/averos-generic-text-dialog/averos-generic-text-dialog.component'
import { MatPaginatorIntl } from '@angular/material/paginator'
import { AverosCustomMatPaginatorIntl } from './components/view-components/averos-dynamic-table/averos-custom-mat-paginator-intl'

@NgModule({
  declarations: [...view.viewComponents, AverosGenericTextDialogComponent],
  imports: [
    CommonModule,
    AverosSharedModule,
    MaterialModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [{ provide: MatPaginatorIntl, useClass: AverosCustomMatPaginatorIntl }],
  exports: [...view.viewComponents],
})
export class ViewModule {}
