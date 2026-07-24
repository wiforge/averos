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

import { AverosEditEntityComponent } from './averos-edit-entity.component'

describe('AverosEditEntityComponent', () => {
  let component: AverosEditEntityComponent<any>
  let fixture: ComponentFixture<AverosEditEntityComponent<any>>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AverosEditEntityComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosEditEntityComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
