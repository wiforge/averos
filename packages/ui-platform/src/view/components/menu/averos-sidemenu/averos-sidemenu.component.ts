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
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core'
import { MatSidenav } from '@angular/material/sidenav'
import { ApplicationNavigationItem, AuthUser } from '@averos/core'
import { Observable } from 'rxjs'

@Component({
  selector: 'averos-sidemenu',
  templateUrl: './averos-sidemenu.component.html',
  styleUrls: ['./averos-sidemenu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSidemenuComponent implements OnInit {
  @Input() isHandset!: boolean
  @Input() logged!: boolean
  @Input() currentLoggedUserProfile!: AuthUser
  @Input() sideNavItems$!: Observable<ApplicationNavigationItem[]>
  @Input() enableAuthentication!: boolean

  @Input() toggleChecked = false

  @Output() toggleCollapsed = new EventEmitter<void>()

  @Input() drawer!: MatSidenav

  constructor() {}

  ngOnInit(): void {}

  menuItemClicked() {
    if (this.isHandset) {
      this.drawer.close()
    }
  }
}
