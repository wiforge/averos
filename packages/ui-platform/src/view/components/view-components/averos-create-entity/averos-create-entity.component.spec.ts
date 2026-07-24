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

import { AverosCreateEntityComponent } from './averos-create-entity.component'

describe('AverosCreateEntityComponent', () => {
  let component: AverosCreateEntityComponent<any>
  let fixture: ComponentFixture<AverosCreateEntityComponent<any>>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AverosCreateEntityComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosCreateEntityComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
