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

import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core'
import { CommonModule } from '@angular/common'

import { AverosCoreRoutingModule } from './averos-core-routing.module'
import { ReactiveFormsModule, FormsModule } from '@angular/forms'
import { LayoutModule } from '@angular/cdk/layout'
import { ViewModule } from '../view/view.module'
import { AverosSharedModule } from '../averos-shared/averos-shared.module'
import { ReferentialModule } from '../referential/referential.module'
import { PublicSpaceModule } from '../public-space/public-space.module'
import { MaterialModule } from './material-module'
import * as averosCore from './index'
import { provideAverosCore } from './provide-averos-core'
import { AVEROS_AUTH_DIRECTIVES, FrameworkConfiguration } from '@averos/core'

@NgModule({
  declarations: [...averosCore.averosCoreComponents],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    LayoutModule,
    AverosSharedModule,
    AverosCoreRoutingModule,
    PublicSpaceModule,
    ViewModule,
    ReferentialModule,
    ...AVEROS_AUTH_DIRECTIVES,
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MaterialModule,
    ...averosCore.averosCoreComponents,
    AverosSharedModule,
    ViewModule,
    ...AVEROS_AUTH_DIRECTIVES,
  ],
})
export class AverosCoreModule {
  constructor(@Optional() @SkipSelf() parentModule?: AverosCoreModule) {
    if (parentModule) {
      // throw new Error(
      // 'AverosCoreModule is already loaded. Import it only in the AppModule or via provideAverosCore().'
      // );
      return
    }
  }

  /**
   * @deprecated Use `provideAverosCore(config)` in your application providers instead.
   * This method will be removed in a future major version.
   */
  static forRoot(averosConfig?: FrameworkConfiguration): ModuleWithProviders<AverosCoreModule> {
    return {
      ngModule: AverosCoreModule,
      providers: [
        provideAverosCore(averosConfig), // Reuse the functional provider logic here!
      ],
    }
  }
}
