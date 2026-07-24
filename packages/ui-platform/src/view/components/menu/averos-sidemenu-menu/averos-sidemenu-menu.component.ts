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

import {
  Component,
  OnInit,
  Input,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
} from '@angular/core'
import { ApplicationNavigationItem, getBooleanValue } from '@averos/core'
import { Observable } from 'rxjs'

@Component({
  selector: 'averos-sidemenu-menu',
  templateUrl: './averos-sidemenu-menu.component.html',
  styleUrls: ['./averos-sidemenu-menu.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSidemenuMenuComponent implements OnInit {
  @Input() logged!: boolean
  @Input() sideNavItems$!: Observable<ApplicationNavigationItem[]>

  @Output() menuItemClicked = new EventEmitter<void>()

  constructor() {}

  ngOnInit(): void {}

  // Delete empty values and rebuild route
  buildRoute(routes: string[]) {
    let route = ''
    routes.forEach((item) => {
      if (item && item.trim()) {
        route += '/' + item.replace(/^\/+|\/+$/g, '')
      }
    })
    return route
  }

  isDisabled(disabled: any): boolean {
    return getBooleanValue(disabled)
  }
}
