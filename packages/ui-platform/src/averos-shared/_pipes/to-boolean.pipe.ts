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
import { toBoolean } from '@averos/core'

@Pipe({
  name: 'toBoolean',
  standalone: false,
})
export class ToBooleanPipe implements PipeTransform {
  transform(value: unknown): boolean {
    return toBoolean(value)
  }
}
