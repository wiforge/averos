/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompositeTestEntityDetailsComponent } from './composite-test-entity-details.component';

describe('CompositeTestEntityDetailsComponent', () => {
  let component: CompositeTestEntityDetailsComponent;
  let fixture: ComponentFixture<CompositeTestEntityDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompositeTestEntityDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CompositeTestEntityDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});