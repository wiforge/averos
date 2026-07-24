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


import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardCardComponent } from './dashboard-card.component';

describe('DashboardCardComponent', () => {
  let component: DashboardCardComponent;
  let fixture: ComponentFixture<DashboardCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
