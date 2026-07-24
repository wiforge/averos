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

export interface AverosAddSimpleMemberOption {
  // The name of the target entity.
  ename: string

  // The name of the new entity member
  mname: string

  //The type of the new entity member : string, enumeration, number, boolean
  memberType: string

  // The entity's technical unique id (such as primary key)
  technicalId: boolean

  // The entity's business identifier such as a short name.
  // Displayed in messages and notifications related to the entity
  businessId: boolean

  // The list of the enumeration's values.
  listOfEnumValues?: string

  // The path to create the entity.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}

export interface AverosAddEnumValuesOption {
  // The name of the target entity.
  ename: string

  // The name of the new entity member
  mname: string

  // The list of the enumeration's values.
  listOfEnumValues: string

  // The path to the sources.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
