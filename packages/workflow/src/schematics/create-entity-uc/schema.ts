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

export interface CreateEntityUCOption {
  // The name of the component.
  name: string

  // The name of the target entity.
  ename: string

  // The name of the target entity service.
  sname: string

  // The path to create the service.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
