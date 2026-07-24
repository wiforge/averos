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

import * as sharedComponents from '../averos-shared/index'
import { AverosTranslationModule } from '@averos/core'

@NgModule({
  declarations: [
    ...sharedComponents.averosSharedDirectives,
    ...sharedComponents.averosSharedPipes,
    ...sharedComponents.averosSharedComponents,
  ],
  imports: [CommonModule, AverosTranslationModule, ...sharedComponents.averosSharedModules],
  exports: [
    ...sharedComponents.averosSharedDirectives,
    ...sharedComponents.averosSharedPipes,
    ...sharedComponents.averosSharedComponents,
    ...sharedComponents.averosSharedModules,
    AverosTranslationModule,
  ],
})
export class AverosSharedModule {}
