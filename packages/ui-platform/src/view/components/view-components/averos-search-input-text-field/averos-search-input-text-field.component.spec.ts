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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing'
import { AverosSearchInputTextFieldComponent } from '.'

describe('AverosSearchInputTextFieldComponent', () => {
  let component: AverosSearchInputTextFieldComponent
  let fixture: ComponentFixture<AverosSearchInputTextFieldComponent>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AverosSearchInputTextFieldComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosSearchInputTextFieldComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
