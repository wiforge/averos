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

import { Component, OnInit, Input, OnDestroy } from '@angular/core'
import { AuthenticationService, AuthUser, AverosAuthService } from '@averos/core'
import { Subscription } from 'rxjs'

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  standalone: false,
})
export class UserComponent implements OnInit, OnDestroy {
  @Input() currentLoggedUserProfile!: AuthUser

  private logOutSubscription!: Subscription

  readonly userPicture = this.averosAuth.userPicture

  constructor(
    private authenticationService: AuthenticationService,
    private averosAuth: AverosAuthService,
  ) {}
  ngOnDestroy(): void {
    this.logOutSubscription?.unsubscribe()
  }

  ngOnInit(): void {}

  logout() {
    // this.logOutSubscription = this.authenticationService.logout().subscribe(logoutData => {
    //   this.authenticationService.logoutUser();
    // });
    this.averosAuth.logout()
  }
}
