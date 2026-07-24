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

import { Observable } from 'rxjs'
import { ToDoAreaService } from '../service/to-do-area-service.service'
import { ToDoTask } from './to-do-task'
import { CompositeTestEntity } from './composite-test-entity'
import {
  AverosEntity,
  BusinessID,
  EntityRelationDeleteStrategy,
  EntityViewLayout,
  getUseCaseViewLayout,
  ID,
  Indexable,
  OneToMany,
  OneToOne,
  UseCase,
  UseCaseViewLayout,
} from '@averos/core'

@AverosEntity(ToDoAreaService)
export class ToDoArea implements Indexable {
  public static _entityViewLayout$: Observable<EntityViewLayout<ToDoArea>>
  public static _entityViewLayout: EntityViewLayout<ToDoArea>
  public static _entityName = 'ToDoArea'
  private static readonly _instance: ToDoArea = new ToDoArea()

  _entityCreatedAt!: Date
  _entityUpdatedAt!: Date

  @ID()
  area_id!: string //area_id overrides the default _entityId field

  @BusinessID()
  areaname!: string // areaname overrides the default _entityLogicalName field

  @OneToMany('ToDoTask', import('./to-do-task'), EntityRelationDeleteStrategy.DELETE_CASCADE)
  toDoTasks!: ToDoTask[]
  @OneToOne(
    'CompositeTestEntity',
    import('./composite-test-entity'),
    EntityRelationDeleteStrategy.DELETE_CASCADE,
  )
  compositeTestEntity!: CompositeTestEntity

  // @OneToOne('CompositeTestEntity', import('./composite-test-entity'), EntityRelationDeleteStrategy.KEEP_CHILDREN) newCompositeTestEntity!: CompositeTestEntity;

  /**
   * TODO: Add your custom entity members
   *
   */

  static getEntityViewLayout(): Observable<EntityViewLayout<ToDoArea>> {
    return ToDoArea._entityViewLayout$
  }

  static getUseCaseViewLayout(useCase: UseCase): Observable<UseCaseViewLayout<ToDoArea> | null> {
    return getUseCaseViewLayout(ToDoArea, useCase)
  }

  static instanceMetadata() {
    return ToDoArea._instance
  }
}
