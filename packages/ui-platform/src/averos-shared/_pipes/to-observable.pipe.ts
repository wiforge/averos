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

import { Pipe, PipeTransform } from '@angular/core'
import { isObservable, Observable, of } from 'rxjs'

@Pipe({
  name: 'toObservable',
  standalone: false,
})
export class ToObservablePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): Observable<any> {
    return isObservable(value) ? value : of(value)
  }
}
