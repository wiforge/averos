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

import { AverosViewEditEntityComponent } from './averos-view-edit-entity.component'

describe('AverosViewEditEntityComponent', () => {
  let component: AverosViewEditEntityComponent<any>
  let fixture: ComponentFixture<AverosViewEditEntityComponent<any>>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosViewEditEntityComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosViewEditEntityComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
