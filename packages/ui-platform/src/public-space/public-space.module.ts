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

import { PublicSpaceRoutingModule } from './public-space-routing.module'

import * as fromPublicSpaceComponents from '../public-space/index'

@NgModule({
  declarations: [...fromPublicSpaceComponents.publicSpaceComponents],
  imports: [CommonModule, PublicSpaceRoutingModule],
  exports: [...fromPublicSpaceComponents.publicSpaceComponents],
})
export class PublicSpaceModule {}
