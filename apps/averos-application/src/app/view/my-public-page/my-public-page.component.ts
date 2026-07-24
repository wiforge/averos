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
 
import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  selector: 'app-my-public-page-component',
  templateUrl: './my-public-page.component.html',
  styleUrls: ['./my-public-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MyPublicPageComponent {
  constructor() {}
}
