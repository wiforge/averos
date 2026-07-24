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

export interface AverosAuthConfigOption {
  /**
   * The name of the authentication provider to configure
   * Must match an existing provider name (e.g., 'dummy', 'keycloak', 'firebase')
   */
  provider?: string

  /**
   * true if the configuration is for httpAuthConfig
   * @default false
   */
  httpConfig?: boolean

  /**
   * The configuration key to update (supports dot notation for nested keys)
   * Examples: 'persistTokens', 'defaultScopes.google', 'url'
   */
  key: string

  /**
   * The new value for the configuration key
   * Can be a string, number, boolean, or JSON string for objects/arrays
   * Examples: 'false', '8080', '["profile", "email"]', '{ "key": "value" }'
   */
  value: string

  /**
   * The path to the module file
   * Usually auto-detected from project structure
   */
  path?: string

  /**
   * The name of the Angular project
   * Auto-detected if not provided
   */
  project?: string
}
