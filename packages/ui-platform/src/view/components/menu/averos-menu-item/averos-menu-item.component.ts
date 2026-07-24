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

import { Component, OnInit, Input, ViewChild, ChangeDetectionStrategy } from '@angular/core'
import { Router } from '@angular/router'
import { ApplicationNavigationItem } from '@averos/core'

@Component({
  selector: 'averos-menu-item',
  templateUrl: './averos-menu-item.component.html',
  styleUrls: ['./averos-menu-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosMenuItemComponent implements OnInit {
  @Input() items!: ApplicationNavigationItem[]
  @Input() logged
  @ViewChild('childMenu', { static: true }) public childMenu: any

  constructor(public router: Router) {}

  ngOnInit() {}
}
