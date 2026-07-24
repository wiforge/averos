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
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthenticationService, GlobalCustomValidationService } from '@averos/core'
import { Subscription } from 'rxjs'
import { filter, tap } from 'rxjs/operators'

@Component({
  selector: 'averos-password-reset',
  templateUrl: './password-reset.component.html',
  styleUrls: ['./password-reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PasswordResetComponent implements OnInit, OnDestroy {
  routerSubscription!: Subscription
  resetPasswordSubscription!: Subscription
  resetPasswordResponse!: { code: number; message: string }
  rpToken!: string
  reactiveForm!: FormGroup
  hidePassword = true

  constructor(
    private authenticationService: AuthenticationService,
    private globalCustomValidationService: GlobalCustomValidationService,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {}
  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe()
  }

  ngOnInit(): void {
    this.reactiveForm = new FormGroup(
      {
        password: new FormControl(
          { value: '', disabled: false },
          Validators.compose([
            Validators.required,
            Validators.minLength(8),
            this.globalCustomValidationService.patternValidator(),
          ]),
        ),
        confirmPassword: new FormControl({ value: '', disabled: false }, [Validators.required]),
      },
      {
        validators: [
          this.globalCustomValidationService.matchPassword('password', 'confirmPassword'),
        ],
      },
    )

    this.routerSubscription = this.route.queryParams
      .pipe(
        tap((params) => {
          if (
            !params ||
            Object.keys(params).length === 0 ||
            Object.keys(params).filter((key) => key === 'rpt').length === 0
          ) {
            this.router.navigate(['/'])
          }
        }),
        filter((params) => params['rpt']),
      )
      .subscribe((params) => {
        this.rpToken = params['rpt']
        //// TODO: (Nice to have) verify token validity before proceeding
        ////this.authenticationService.verifyAccount
      })
  }

  resetPassword() {
    this.resetPasswordSubscription = this.authenticationService
      .resetPasswordUsingToken(this.reactiveForm.value.password, this.rpToken)
      .subscribe({
        next: (response) => {
          this.resetPasswordResponse = response
          this.cd.markForCheck()
        },
        error: (err) => {
          this.resetPasswordResponse = err
          this.router.navigate(['/login'])
        },
      })
  }
}
