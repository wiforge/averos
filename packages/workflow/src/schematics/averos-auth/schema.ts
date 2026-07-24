/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */

export interface AverosAuthOption {
  /**
   * The type of authentication provider (AverosAuthProviderType)
   * Options: 'dummy', 'firebase', 'google', 'github', 'keycloak', 'custom'
   */
  provider: string

  /**
   * Whether this is an update operation (true) or add operation (false)
   * @default false
   */
  forUpdate?: boolean

  /**
   * Set this provider as the default provider in multi-provider configuration
   * Only applicable when multiple providers are configured
   * The value will be set to authProvidersConfig.defaultProvider
   * @default false (keeps first provider as default)
   */
  setAsDefault?: boolean

  /**
   * Custom provider class name (required when provider = 'custom')
   * Example: 'MyCustomAuthProvider'
   */
  customProviderClassName?: string

  /**
   * Custom provider package name (required when provider = 'custom')
   * Example: '@mycompany/custom-auth'
   */
  customProviderPackage?: string

  /**
   * The path to the module file
   * auto-detected from project structure
   */
  path?: string

  /**
   * The name of the Angular project
   * Auto-detected if not provided
   */
  project?: string
}
