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

import { Component, OnInit, OnDestroy } from '@angular/core'
import { Router } from '@angular/router'
import { Subscription, Observable } from 'rxjs'
import { Validators, FormGroup, FormControl } from '@angular/forms'
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout'
import { map, shareReplay } from 'rxjs/operators'
import { AlertService, AuthUser, AverosAuthService, GlobalCustomValidationService, UserCustomValidationService } from '@averos/core'

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: false,
})
export class RegisterComponent implements OnInit, OnDestroy {
  hidePassword = true
  registerUserData!: AuthUser
  hasSecondAdress = false
  registerForm!: FormGroup
  startDate = new Date()

  isHandset$: Observable<boolean> = this.breakpointObserver
    // .observe(['(max-width: 350px)', '(max-width: 450px)'])
    // .observe('(max-width: 350px)')
    .observe(Breakpoints.Handset)
    .pipe(
      map((result) => result.matches),
      shareReplay(),
    )
  subscription!: Subscription

  uniqueIDType = [
    { name: 'CIN', translationID: 'identifier.uniqueIdType.CIN' },
    { name: 'Passeport', translationID: 'identifier.uniqueIdType.Passeport' },
    { name: 'RC', translationID: 'identifier.uniqueIdType.RC' },
  ]

  genders = [
    { name: 'Male', translationID: 'user.gender.male' },
    { name: 'Female', translationID: 'user.gender.female' },
  ]

  cities = [
    { name: 'Tunisia' },
    { name: 'France' },
    { name: 'Germany' },
    { name: 'Sweden' },
    { name: 'Norway' },
    { name: 'Belgium' },
    { name: 'Algeria' },
    { name: 'Egypt' },
    { name: 'Denmark' },
    { name: 'Finland' },
    { name: 'United Kingdom' },
    { name: 'China' },
    { name: 'South Korea' },
    { name: 'Saudi Arabia' },
    { name: 'UAE' },
    { name: 'USA' },
    { name: 'Netherlands' },
    { name: 'Russia' },
    { name: 'South Africa' },
    { name: 'Qatar' },
    { name: 'Turkey' },
    { name: 'Morocco' },
    { name: 'Lebanon' },
    { name: 'Spain' },
    { name: 'Kuwait' },
    { name: 'Libya' },
    { name: 'Luxembourg' },
    { name: 'Japan' },
    { name: 'Italy' },
    { name: 'Ireland' },
    { name: 'India' },
    { name: 'Iran' },
    { name: 'Iraq' },
    { name: 'Indonesia' },
    { name: 'Hungary' },
    { name: 'Iceland' },
    { name: 'Ukraine' },
    { name: 'Thailand' },
    { name: 'Switzerland' },
    { name: 'Syria' },
    { name: 'Sudan' },
    { name: 'Singapore' },
    { name: 'Senegal' },
    { name: 'Rwanda' },
    { name: 'Portugal' },
    { name: 'Romania' },
    { name: 'Poland' },
    { name: 'Philippines' },
    { name: 'Palestine' },
    { name: 'Oman' },
    { name: 'Pakistan' },
    { name: 'Nigeria' },
    { name: 'Niger' },
    { name: 'New Zealand' },
    { name: 'Monaco' },
    { name: 'Mexico' },
    { name: 'Malta' },
    { name: 'Mali' },
    { name: 'Madagascar' },
    { name: 'Liechtenstein' },
    { name: 'Malawi' },
    { name: 'Maldives' },
    { name: 'Jordan' },
    { name: 'Lithuania' },
    { name: 'Greece' },
    { name: 'Ghana' },
    { name: 'Estonia' },
    { name: 'Czech Republic' },
    { name: 'Cyprus' },
    { name: 'Canada' },
    { name: 'Bahrein' },
    { name: 'Austria' },
    { name: 'Australia' },
    { name: 'Argentina' },
    { name: 'Angola' },
    { name: 'Brazil' },
  ]
  constructor(
    private breakpointObserver: BreakpointObserver,
    private globalCustomValidationService: GlobalCustomValidationService,
    private userCustomValidationService: UserCustomValidationService,
    private averosAuthService: AverosAuthService,
    private alertService: AlertService,
    private router: Router,
  ) {
    // redirect to home if already logged in
    if (this.averosAuthService.isAuthenticated()) {
      this.router.navigate(['/'])
    }
  }

  get alertservice() {
    return AlertService
  }

  get notificationService() {
    return this.alertService
  }

  // get translate(){
  //   return getTranslation;
  // }
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  ngOnInit(): void {
    this.buildForm()
  }
  buildForm() {
    this.registerForm = new FormGroup(
      {
        userName: new FormControl(
          { value: '', disabled: false },
          {
            validators: [Validators.required],
            asyncValidators: [this.userCustomValidationService.userNameValidator()],
            updateOn: 'blur',
          },
        ),
        email: new FormControl(
          { value: '', disabled: false },
          {
            validators: [Validators.required, Validators.email],
            asyncValidators: [this.userCustomValidationService.emailAlreadyexistsValidator()],
            updateOn: 'blur',
          },
        ),
        password: new FormControl(
          { value: '', disabled: false },
          Validators.compose([
            Validators.required,
            Validators.minLength(8),
            this.globalCustomValidationService.patternValidator(),
          ]),
        ),
        birthdate: new FormControl(
          { value: '', disabled: false },
          Validators.compose([
            ,
            /*Validators.required*/ this.globalCustomValidationService.birthDateValidator(),
          ]),
        ),
        confirmPassword: new FormControl({ value: '', disabled: false }, [/*Validators.required*/]),
        firstName: new FormControl({ value: null, disabled: false }, Validators.required),
        lastName: new FormControl({ value: null, disabled: false }, Validators.required),
        gender: new FormControl({ value: null, disabled: false } /*Validators.required*/),
        // address: [null, Validators.compose([Validators.maxLength(100)])],
        // address2: [null, Validators.maxLength(100)],
        // about: [null, Validators.maxLength(400)],
        city: new FormControl({ value: null, disabled: false } /*Validators.required*/),
        // telephone: [null, Validators.compose([
        //             Validators.required, Validators.minLength(+$localize`:@@app.phone.maxlenght:8`),
        //                                  Validators.maxLength(+$localize`:@@app.phone.maxlenght:8`)])
        // ],
        // identifier: this.formBuilder.group({
        //               uniqueID: [null, Validators.required] ,
        //               uniqueIdType: [null, Validators.required]
        //             })
      },
      // {
      //   validators: [this.globalCustomValidationService.matchPassword('password', 'confirmPassword')]
      // }
    )
  }

  public findInvalidControls() {
    const invalid: string[] = []
    const controls = this.registerForm.controls
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name)
      }
    }
    return invalid
  }

  registerUser() {
    // this.findInvalidControls();
    // stop here if form is invalid
    if (this.registerForm.invalid) {
      return
    }

    this.registerUserData = this.registerForm.value
  }
}
