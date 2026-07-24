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

export class EntityFieldMappingOption {
  // The name of the entity.
  entityName: string

  // The entity field key name
  fieldKey: string

  // The target field key name
  externalKey: string

  // The target external managing service
  targetServices: string

  // The path to the sources.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
