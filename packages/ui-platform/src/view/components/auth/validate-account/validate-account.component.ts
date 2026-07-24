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
  ChangeDetectionStrategy,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthenticationService } from '@averos/core'
import { Subscription } from 'rxjs'
import { filter, tap } from 'rxjs/operators'

@Component({
  selector: 'averos-validate-account',
  templateUrl: './validate-account.component.html',
  styleUrls: ['./validate-account.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ValidateAccountComponent implements OnInit, OnDestroy {
  routerSubscription!: Subscription
  validateAccountSubscription!: Subscription
  verifyAccountResponse!: { code: number; message: string }
  constructor(
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}
  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe()
  }

  ngOnInit(): void {
    this.routerSubscription = this.route.queryParams
      .pipe(
        tap((params) => {
          if (
            !params ||
            Object.keys(params).length === 0 ||
            Object.keys(params).filter((key) => key === 'vt').length === 0
          ) {
            this.router.navigate(['/'])
          }
        }),
        filter((params) => params['vt']),
      )
      .subscribe((params) => {
        this.validateAccountSubscription = this.authenticationService
          .verifyAccount(params['vt'])
          .subscribe((response) => {
            this.verifyAccountResponse = response
            this.cd.markForCheck()
          })
      })
  }
}
