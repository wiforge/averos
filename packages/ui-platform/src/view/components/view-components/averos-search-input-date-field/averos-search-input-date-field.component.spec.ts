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

import { AverosSearchInputDateFieldComponent } from './averos-search-input-date-field.component';

describe('AverosSearchInputDateFieldComponent', () => {
  let component: AverosSearchInputDateFieldComponent;
  let fixture: ComponentFixture<AverosSearchInputDateFieldComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AverosSearchInputDateFieldComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosSearchInputDateFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
