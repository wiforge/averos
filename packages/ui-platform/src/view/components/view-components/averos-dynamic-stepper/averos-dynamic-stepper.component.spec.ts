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

import { ComponentFixture, TestBed } from '@angular/core/testing'

import { AverosDynamicStepperComponent } from './averos-dynamic-stepper.component'

describe('AverosDynamicStepperComponent', () => {
  let component: AverosDynamicStepperComponent
  let fixture: ComponentFixture<AverosDynamicStepperComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosDynamicStepperComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosDynamicStepperComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
