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
import { RouterModule, Routes } from '@angular/router'

import * as publicSpaceCompoenents from '../public-space'
import { UnauthenticatedSpaceGuard } from '@averos/core'

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: publicSpaceCompoenents.HomeComponent,
    canActivate: [UnauthenticatedSpaceGuard],
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PublicSpaceRoutingModule {}
