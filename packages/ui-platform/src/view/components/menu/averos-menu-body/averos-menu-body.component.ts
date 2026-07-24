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
  ChangeDetectionStrategy,
  HostBinding,
  ViewChild,
} from '@angular/core'

import { Observable } from 'rxjs'
import { MatSidenav } from '@angular/material/sidenav'
import {
  AverosTicker,
  ApplicationNavigationItem,
  ApplicationSharedService,
  AuthUser,
} from '@averos/core'

@Component({
  selector: 'averos-menu-body',
  templateUrl: './averos-menu-body.component.html',
  styleUrls: ['./averos-menu-body.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosMenuBodyComponent implements OnInit {
  @Input() isHandset
  @Input() logged
  @Input() currentLoggedUserProfile!: AuthUser
  @Input() sideNavItems$!: Observable<ApplicationNavigationItem[]>
  @Input() enableAuthentication!: boolean
  // @Input() showTicker; // scrolling information on the body header
  // @Input() userTicklers: Observable<AverosTickler[]>;

  @ViewChild('rightSideNav', { static: false }) rightSideNav!: MatSidenav

  @Input() set rightSideNavOpened(state: boolean) {
    this.rightSideNav?.toggle()
  }

  sidenavOpened = true
  sidenavCollapsed = false
  setNavState = 'opened'
  navPos = 'side'

  private contentWidthFix = true
  @HostBinding('class.averos-content-width-fix') get isContentWidthFix() {
    return this.contentWidthFix && this.navPos === 'side' && this.sidenavOpened && !this.isHandset
  }

  private collapsedWidthFix = true
  @HostBinding('class.averos-sidenav-collapsed-fix') get isCollapsedWidthFix() {
    return (
      this.collapsedWidthFix && (this.navPos === 'top' || (this.sidenavOpened && this.isHandset))
    )
  }

  constructor(private aplicationSharedService: ApplicationSharedService) {}

  ngOnInit(): void {
    this.contentWidthFix = this.collapsedWidthFix = false
  }

  get systemTickers() {
    return this.aplicationSharedService.systemTickers
  }

  get userTickers() {
    return this.aplicationSharedService.userTickers
  }

  onRemoveUserTicker(tickerID: string) {
    this.aplicationSharedService.removeUserTicker(tickerID)
  }

  onRemoveSystemTicker(tickerID: string) {
    this.aplicationSharedService.removeAverosCoreTicker(tickerID)
  }

  sidenavOpenedChange(isOpened: boolean) {
    this.sidenavOpened = isOpened
    this.setNavState = 'opened'

    this.collapsedWidthFix = !this.isHandset
    this.resetCollapsedState()
  }

  sidenavCloseStart() {
    this.contentWidthFix = false
  }

  toggleCollapsed() {
    this.sidenavCollapsed = !this.sidenavCollapsed
    this.resetCollapsedState()
  }

  resetCollapsedState() {
    this.setNavState = 'collapsed'
  }

  OpenLeftSideNav(event: boolean) {
    this.rightSideNavOpened = !event
  }
}
