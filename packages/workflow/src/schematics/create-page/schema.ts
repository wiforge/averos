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

export interface CreatePageOptions {
  // The name of the page.
  name: string

  // Update the route and menu with default route
  updateRouteMenu?: boolean

  // the target place into which the menu entries will be placed:  "side", "top", "both"
  targetMenu?: string

  // the target space into which the menu entries will be available:  "public", "logged"
  space?: string

  // The path to create the service.
  path?: string

  // The name of the project.
  project?: string

  // The Project's root path.
  projectRootPath?: string
}
