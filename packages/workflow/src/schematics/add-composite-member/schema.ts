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

export interface AverosAddCompositeMemberOption {
  // The name of the source entity.
  ename: string

  // The name of the target entity related to the member to add
  fename: string

  // The name of the relation between source and target entities
  memberName: string

  //The type of the parent/child relationship: OneToOne, OneToMany or ManyToOne
  fieldRelationType: string

  // // The update strategy related to the composite One-To-Many member : Single Update Transaction | Multiple Update Transactions
  // // ==> "single"
  // // ==> "multiple"
  // memberUpdateStrategy?: string;

  // The entity relation delete strategy
  // => KEEP_CHILDREN (=keep-children)
  // => DELETE_CHILDREN (=delete-children)
  deleteStrategy: AverosEntityRelationDeleteStrategy

  // The path to create the entity.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}

export enum AverosEntityRelationDeleteStrategy {
  KEEP_CHILDREN = 'KEEP_CHILDREN', // default
  DELETE_CHILDREN = 'DELETE_CASCADE',
}
