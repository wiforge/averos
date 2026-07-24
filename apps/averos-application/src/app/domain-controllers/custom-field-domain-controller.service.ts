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

import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ToDoTaskService } from '../service/to-do-task-service.service'
import { ToDoTask } from '../model/to-do-task'
import {
  DomainController,
  DomainEntry,
  SearchInputCriteria,
  TypeScriptTypeMetaDatatHandler,
} from '@averos/core'

@Injectable({
  providedIn: 'root',
})
@DomainController('CustomFieldDomainControllerService')
export class CustomFieldDomainControllerService {
  constructor(private taskService: ToDoTaskService) {}

  getTaskStatusValueDomain(criteria: SearchInputCriteria): Observable<DomainEntry[]> {
    return this.taskService.getEntitiesByCriteria(criteria).pipe(
      map((results) => {
        // inferred as ToDoTask[] | PaginatedData<ToDoTask>
        const items = Array.isArray(results) ? results : (results?.data ?? []) // <-- use PaginatedData array property
        return items.reduce((p: DomainEntry[], c: ToDoTask) => {
          const business_id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(c)
          if (business_id_name) {
            p.push(new DomainEntry(business_id_name, business_id_name))
          }
          return p
        }, [] as DomainEntry[])
      }),
    )
  }
}
