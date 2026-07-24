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

import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { Indexable, UseCaseConfig, FieldViewLayout } from '@averos/core'

@Component({
  selector: 'averos-search-input-field',
  templateUrl: './averos-search-input-field.component.html',
  styleUrls: ['./averos-search-input-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchInputFieldComponent<T extends Indexable> implements OnInit {
  @Input() fieldViewLayout!: FieldViewLayout
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() searchInputFormGoup!: FormGroup

  constructor() {}

  ngOnInit(): void {}
}
