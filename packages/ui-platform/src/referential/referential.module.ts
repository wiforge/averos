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
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { AverosSharedModule } from '../averos-shared/averos-shared.module'
import { MaterialModule } from '../averos-core/material-module'
import { ViewModule } from '../view/view.module'
import { ReferentialRoutingModule } from './referential-routing.module'

import * as referential from '../referential/index'

@NgModule({
  declarations: [...referential.referentialComponents],
  imports: [
    CommonModule,
    FormsModule,
    ReferentialRoutingModule,
    AverosSharedModule,
    ReactiveFormsModule,
    MaterialModule,
    ViewModule,
  ],
  exports: [...referential.referentialComponents],
})
export class ReferentialModule {}
