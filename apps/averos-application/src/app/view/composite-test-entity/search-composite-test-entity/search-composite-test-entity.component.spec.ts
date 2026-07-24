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

import { SearchCompositeTestEntityComponent } from './search-composite-test-entity.component';

describe('SearchCompositeTestEntityComponent', () => {
  let component: SearchCompositeTestEntityComponent;
  let fixture: ComponentFixture<SearchCompositeTestEntityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SearchCompositeTestEntityComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchCompositeTestEntityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});