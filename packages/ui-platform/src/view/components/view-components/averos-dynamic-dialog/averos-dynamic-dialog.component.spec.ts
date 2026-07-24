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

import { AverosDynamicDialogComponent } from './averos-dynamic-dialog.component'

describe('AverosDynamicDialogComponent', () => {
  let component: AverosDynamicDialogComponent<any>
  let fixture: ComponentFixture<AverosDynamicDialogComponent<any>>
  ;<any>beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosDynamicDialogComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosDynamicDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
