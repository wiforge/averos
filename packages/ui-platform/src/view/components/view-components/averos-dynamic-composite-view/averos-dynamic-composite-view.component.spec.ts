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

import { AverosDynamicCompositeViewComponent } from './averos-dynamic-composite-view.component'

describe('AverosDynamicCompositeViewLayoutComponent', () => {
  let component: AverosDynamicCompositeViewComponent<any>
  let fixture: ComponentFixture<AverosDynamicCompositeViewComponent<any>>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosDynamicCompositeViewComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosDynamicCompositeViewComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
