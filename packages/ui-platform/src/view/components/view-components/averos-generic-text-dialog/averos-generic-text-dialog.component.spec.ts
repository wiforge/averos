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

import { AverosGenericTextDialogComponent } from './averos-generic-text-dialog.component'

describe('AverosGenericTextDialogComponent', () => {
  let component: AverosGenericTextDialogComponent<any>
  let fixture: ComponentFixture<AverosGenericTextDialogComponent<any>>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosGenericTextDialogComponent],
    }).compileComponents()

    fixture = TestBed.createComponent(AverosGenericTextDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
