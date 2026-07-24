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

import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core'
import { AuthenticationService, AuthUser, AverosAuthService } from '@averos/core'

@Component({
  selector: 'averos-sidemenu-userpanel',
  templateUrl: './averos-sidemenu-userpanel.component.html',
  styleUrls: ['./averos-sidemenu-userpanel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSidemenuUserpanelComponent implements OnInit {
  readonly userPicture = this.averosAuth.userPicture

  @Input() currentLoggedUserProfile!: AuthUser
  constructor(
    private authenticationService: AuthenticationService,
    private averosAuth: AverosAuthService,
  ) {}

  get authService() {
    return this.authenticationService
  }

  ngOnInit(): void {}
}
