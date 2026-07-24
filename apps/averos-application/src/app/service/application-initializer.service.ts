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

import { Injectable } from '@angular/core'
import { ToDoArea } from '../model/to-do-area'
import { ToDoTask } from '../model/to-do-task'
import { CompositeTestEntity } from '../model/composite-test-entity'
import { ViewLayoutService } from '@averos/core'

@Injectable({
  providedIn: 'root',
})
export class ApplicationInitializerService {
  private registeredEntities: Array<any> = [
    ToDoTask.instanceMetadata(),
    ToDoArea.instanceMetadata(),
    CompositeTestEntity.instanceMetadata(),
  ]

  constructor(private viewLayoutService: ViewLayoutService) {}

  initialize(): Promise<any> {
    const registerEntitiesPromise = this.viewLayoutService.registerEntitiesViewLayouts(
      this.registeredEntities,
    )
    const asyncInitPromises: Promise<any>[] = [registerEntitiesPromise]
    return Promise.all(asyncInitPromises)
  }
}
