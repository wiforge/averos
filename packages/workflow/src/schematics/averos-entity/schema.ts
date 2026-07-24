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

export interface AverosEntityOption {
  // The name of the target entity.
  name: string

  // The name of the related entity service : Default = {$name}Service (ex. UserService).
  sname: string

  // forces the creation of the related entity service
  createService: boolean

  // The path to create the entity.
  path?: string

  // The name of the project.
  project?: string

  // the project type : application or library
  // projectType?: string;

  // the project root path
  projectRootPath?: string
}
