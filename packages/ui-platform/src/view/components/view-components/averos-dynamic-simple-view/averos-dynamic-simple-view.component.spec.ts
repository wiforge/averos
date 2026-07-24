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

import { AverosDynamicSimpleViewComponent } from './averos-dynamic-simple-view.component';

describe('AverosDynamicSimpleViewLayoutComponent', () => {
  let component: AverosDynamicSimpleViewComponent<any>;
  let fixture: ComponentFixture<AverosDynamicSimpleViewComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AverosDynamicSimpleViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosDynamicSimpleViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
