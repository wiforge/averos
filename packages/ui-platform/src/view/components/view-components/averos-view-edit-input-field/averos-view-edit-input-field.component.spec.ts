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


import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AverosViewEditInputFieldComponent } from './averos-view-edit-input-field.component';

describe('AverosViewEditInputFieldComponent', () => {
  let component: AverosViewEditInputFieldComponent;
  let fixture: ComponentFixture<AverosViewEditInputFieldComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AverosViewEditInputFieldComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosViewEditInputFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
