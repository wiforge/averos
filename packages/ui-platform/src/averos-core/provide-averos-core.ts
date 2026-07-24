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

import {
  EnvironmentProviders,
  Provider,
  inject,
  makeEnvironmentProviders,
  Injector,
  provideAppInitializer,
  provideEnvironmentInitializer,
} from '@angular/core'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { OverlayContainer } from '@angular/cdk/overlay'
import {
  AVEROS_CONFIG,
  AVEROS_INTERCEPTORS,
  AverosConfig,
  FrameworkConfiguration,
  GlobalAppStartupInitializerService,
  provideAverosAuth,
  ServiceLocator,
} from '@averos/core'

/**
 * USAGE GUIDE
 *
 * For NgModule-based applications:
 * ================================
 *
 * @NgModule({
 *   imports: [
 *     AverosCoreModule.forRoot(config)  // ← Recommended: includes components + providers
 *   ]
 * })
 *
 * OR (if you don't need module exports):
 *
 * @NgModule({
 *   providers: [
 *     provideAverosCore(config)  // ← Only provides services, no components
 *   ]
 * })
 *
 * For Standalone applications:
 * ============================
 *
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideAverosCore(config)
 *   ]
 * };
 */

export function provideAverosCore(config?: FrameworkConfiguration): EnvironmentProviders {
  const avConfig = config ? new AverosConfig(config) : new AverosConfig()

  const providers: (Provider | EnvironmentProviders)[] = [
    // Config Tokens
    { provide: AVEROS_CONFIG, useValue: avConfig },
    { provide: AverosConfig, useValue: avConfig },

    /** HTTP_INTERCEPTORS was replaced by the modern provideHttpClient(withInterceptors(AVEROS_INTERCEPTORS)) */
    provideHttpClient(withInterceptors(AVEROS_INTERCEPTORS)),

    // Side Effects (Replaces ENVIRONMENT_INITIALIZER)
    provideEnvironmentInitializer(() => {
      const injector = inject(Injector)
      const overlay = inject(OverlayContainer)

      // Set the locator and theme immediately upon environment setup
      ServiceLocator.injector = injector
      overlay.getContainerElement().classList.add('app-dark-theme')
    }),

    // 4. Async Startup Logic (Replaces APP_INITIALIZER)
    provideAppInitializer(() => {
      const globalInit = inject(GlobalAppStartupInitializerService)
      return globalInit.initialize().then(() => {
        globalInit.markAppReady()
      })
    }),

    // Conditional Auth
    ...(avConfig.enableAuthentication && avConfig.authProvidersConfig
      ? [provideAverosAuth(avConfig.authProvidersConfig)]
      : []),
  ]

  return makeEnvironmentProviders(providers as any)
}
