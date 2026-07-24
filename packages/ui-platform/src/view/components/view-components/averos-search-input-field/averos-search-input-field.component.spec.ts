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

import { AverosSearchInputFieldComponent } from './averos-search-input-field.component'

describe('AverosSearchInputFieldComponent', () => {
  let component: AverosSearchInputFieldComponent<any>
  let fixture: ComponentFixture<AverosSearchInputFieldComponent<any>>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosSearchInputFieldComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosSearchInputFieldComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
