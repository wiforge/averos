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

import { AverosViewEntityComponent } from './averos-view-entity.component'

describe('AverosViewEntityComponent', () => {
  let component: AverosViewEntityComponent<any>
  let fixture: ComponentFixture<AverosViewEntityComponent<any>>

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AverosViewEntityComponent],
    }).compileComponents()
  }))

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosViewEntityComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
