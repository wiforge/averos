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

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '@averos/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'averos-request-password-reset',
    templateUrl: './request-password-reset.component.html',
    styleUrls: ['./request-password-reset.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class RequestPasswordResetComponent implements OnInit, OnDestroy {

  requestResetPasswordSubscription!: Subscription;
  requestResetPasswordResponse!: {code: number, message: string};
  rpToken!: string;
  requestSubmitted = false;
  reactiveForm!: FormGroup;

  constructor(private authenticationService: AuthenticationService,
              private cd: ChangeDetectorRef) { }
  ngOnDestroy(): void {
    this.requestResetPasswordSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    this.reactiveForm = new FormGroup(
      {
        email:    new FormControl('',
                                  {
                                    validators:  [Validators.required, Validators.email],
                                    updateOn: 'blur'
                                  })
      });
  }

  getErrorMessage(form: FormGroup, fieldKey?: string) {
    switch (fieldKey) {
      case 'email':
            return form.get('email')?.hasError('required')
                  ? $localize`:@@user.email.validation.required:Please enter an email address`
                  : form.get('email')?.hasError('email')
                  ? $localize`:@@user.email.validation.email:Not a valid email`
                  : '';
      default:
        return '';
    }
  }

  requestResetPassword(){
    this.requestResetPasswordSubscription = this.authenticationService.requestPasswordReset(this.reactiveForm.value.email)
    .subscribe(response => {
      this.requestResetPasswordResponse = response;
      this.requestSubmitted = true;
      this.cd.markForCheck();
    });
  }

}
