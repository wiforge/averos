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

import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

import { ToDoTask } from '../model/to-do-task'
import {
  ApplicationSharedService,
  AvCrudService,
  EntityConfigurationManagerService,
  EnvironmentConfiguratorService,
  PaginatedData,
  SearchInputCriteria,
} from '@averos/core'

@Injectable({
  providedIn: 'root',
})
export class ToDoTaskService extends AvCrudService<ToDoTask> {
  override get SERVICE_NAME(): string {
    return 'ToDoTaskService'
  }

  get MANAGED_ENTITY(): ToDoTask {
    return ToDoTask.instanceMetadata()
  }

  constructor(
    protected override httpClient: HttpClient,
    protected override applicationSharedService: ApplicationSharedService,
    protected override environmentConfiguratorService: EnvironmentConfiguratorService,
    protected override entityConfigurationManagerService: EntityConfigurationManagerService,
  ) {
    super(
      httpClient,
      applicationSharedService,
      environmentConfiguratorService,
      entityConfigurationManagerService,
    )
  }

  override createEntity(value: ToDoTask): Observable<ToDoTask | null> {
    return this.defaultCreateEntity(value)
  }

  override updateEntity(entityTopdate: ToDoTask | Partial<ToDoTask>): Observable<ToDoTask | null> {
    return this.defaultUpdateEntity(entityTopdate)
  }

  override deleteEntity(
    parent: ToDoTask | Partial<ToDoTask> | string,
  ): Observable<ToDoTask | null> {
    return this.defaultDeleteEntity(parent)
  }

  override deleteMany(
    entityCollection: ToDoTask[] | Partial<ToDoTask>[],
  ): Observable<ToDoTask[] | null> {
    /**
     * You may override the default deleteMany() logic
     *  by returning your own implementation logic
     */
    return this.defaultDeleteMany(entityCollection)
  }

  override getAllEntities(): Observable<ToDoTask[] | PaginatedData<ToDoTask> | null> {
    return this.defaultGetAllEntities()
  }

  override getEntityById(id: string, criteria?: SearchInputCriteria): Observable<ToDoTask | null> {
    return this.defaultGetEntityById(id, criteria)
  }

  override getEntitiesByIds(
    ids: string[],
    criteria?: SearchInputCriteria,
  ): Observable<ToDoTask[] | PaginatedData<ToDoTask> | null> {
    return this.defaultGetEntitiesByIds(ids, criteria)
  }

  override getEntitiesByCriteria(
    criteria: SearchInputCriteria,
    inline: boolean = false,
  ): Observable<ToDoTask[] | PaginatedData<ToDoTask> | null> {
    return this.defaultGetEntitiesByCriteria(criteria, inline)
  }

  override deleteRelationCollection(
    parentId: any,
    parent: ToDoTask | Partial<ToDoTask>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<ToDoTask | null> {
    return this.defaultDeleteRelationCollection(parentId, parent, relationName, cids)
  }

  override addRelationCollection(
    parentId: string,
    parent: ToDoTask | Partial<ToDoTask>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<ToDoTask | null> {
    return this.defaultAddRelationCollection(parentId, parent, relationName, cids)
  }
}
