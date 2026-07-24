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
import { ToDoTaskService } from '../service/to-do-task-service.service'
import { ToDoTaskStatus } from './to-do-task-status'
import {
  AverosEntity,
  BusinessID,
  EntityViewLayout,
  getUseCaseViewLayout,
  ID,
  Indexable,
  OneToOne,
  UseCase,
  UseCaseViewLayout,
} from '@averos/core'

@AverosEntity(ToDoTaskService)
export class ToDoTask implements Indexable {
  public static _entityViewLayout$: Observable<EntityViewLayout<ToDoTask>>
  public static _entityViewLayout: EntityViewLayout<ToDoTask>
  public static _entityName = 'ToDoTask'
  private static _instance: ToDoTask = null!

  // Averos entity identifier is equal to '_entityId' by default
  // please change the identifier at your convenience
  @ID()
  task_id!: string
  _entityCreatedAt!: Date
  _entityUpdatedAt!: Date

  @BusinessID()
  taskname!: string
  description!: string
  status!: ToDoTaskStatus

  /**
   * TODO: Add your custom entity members
   *
   */

  static getEntityViewLayout(): Observable<EntityViewLayout<ToDoTask>> {
    return ToDoTask._entityViewLayout$
  }

  static getUseCaseViewLayout(useCase: UseCase): Observable<UseCaseViewLayout<ToDoTask> | null> {
    return getUseCaseViewLayout(ToDoTask, useCase)
  }

  static instanceMetadata() {
    if (!ToDoTask._instance) {
      ToDoTask._instance = new ToDoTask()
    }
    return ToDoTask._instance
  }
}
