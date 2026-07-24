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

import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms'

import { Observable, of, Subject } from 'rxjs'
import { catchError, map, takeUntil } from 'rxjs/operators'
import { ToDoTaskService } from '../service/to-do-task-service.service'
import {
  AverosSearchOperator,
  AverosValidator,
  retrievePaginatedData,
  SearchInputCriteria,
} from '@averos/core'

@Injectable({
  providedIn: 'root',
})
@AverosValidator('CustomFieldValidatorService')
export class CustomFieldValidatorService {
  private unsubscribe$ = new Subject<void>()

  constructor(private taskService: ToDoTaskService) {}

  patternValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null
      }
      const regex = new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$')
      const valid = regex.test(control.value)
      return valid ? null : { invalidPattern: true }
    }
  }

  taskNameAlreadyExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      return this.taskService
        .getEntitiesByCriteria(
          new SearchInputCriteria({
            name: {
              entityAccessor: 'name',
              entityValue: control.value,
              operator: AverosSearchOperator.OPER_EQ,
            },
          }),
          true,
        )
        .pipe(
          takeUntil(this.unsubscribe$),
          map(
            (returnedObject) =>
              retrievePaginatedData(returnedObject).length > 0
                ? { taskNameAlreadyExists: true }
                : null,
            (error: Error) => {
              console.error(error)
              return { emailNotAvailable: true }
            },
          ),
          catchError((err) => of({ emailNotAvailable: true })),
        )
    }
  }
}
