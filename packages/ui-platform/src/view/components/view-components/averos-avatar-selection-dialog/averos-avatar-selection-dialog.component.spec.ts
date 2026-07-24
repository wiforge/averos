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

import { AverosAvatarSelectionDialogComponent } from './averos-avatar-selection-dialog.component'

describe('AverosAvatarSelectionDialogComponent', () => {
  let component: AverosAvatarSelectionDialogComponent
  let fixture: ComponentFixture<AverosAvatarSelectionDialogComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AverosAvatarSelectionDialogComponent],
    }).compileComponents()
  })

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosAvatarSelectionDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
