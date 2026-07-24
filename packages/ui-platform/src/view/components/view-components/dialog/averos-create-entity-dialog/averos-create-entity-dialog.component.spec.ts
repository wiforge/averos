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

import { AverosCreateEntityDialogComponent } from './averos-create-entity-dialog.component'

describe('AverosCreateEntityDialogComponent', () => {
  let component: AverosCreateEntityDialogComponent<any>
  let fixture: ComponentFixture<AverosCreateEntityDialogComponent<any>>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AverosCreateEntityDialogComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosCreateEntityDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
