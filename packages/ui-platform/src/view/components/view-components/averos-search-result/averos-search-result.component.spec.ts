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

import { AverosSearchResultComponent } from './averos-search-result.component'

describe('AverosSearchResultComponent', () => {
  let component: AverosSearchResultComponent<any>
  let fixture: ComponentFixture<AverosSearchResultComponent<any>>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosSearchResultComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosSearchResultComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
