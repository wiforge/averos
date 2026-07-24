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

@Component({
  selector: 'averos-dashboard-card',
  templateUrl: './dashboard-card.component.html',
  styleUrls: ['./dashboard-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DashboardCardComponent implements OnInit {
  @Input() id!: string
  @Input() title!: string
  @Input() titleTranslationID!: string
  @Input() showMenu!: string
  @Input() value!: string
  @Input() valueDescription!: string
  @Input() valueDescriptionTranslationID!: string
  @Input() headerIcon!: string
  @Input() headerIconColor!: string
  @Input() animateHeaderIcon!: string
  @Input() mainContentIcon!: string
  @Input() mainColor!: string

  constructor() {}

  ngOnInit(): void {}

  getColor(color: string) {
    return `color: ${color};`
  }

  getBackGroundColor(color: string) {
    return `background: ${color};`
  }
}
