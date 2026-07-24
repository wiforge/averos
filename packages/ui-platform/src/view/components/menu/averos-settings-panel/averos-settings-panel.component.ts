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

import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'

@Component({
  selector: 'averos-averos-settings-panel',
  templateUrl: './averos-settings-panel.component.html',
  styleUrls: ['./averos-settings-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSettingsPanelComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}
}
