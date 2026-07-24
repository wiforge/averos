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

import { SearchToDoTaskComponent } from './search-to-do-task.component';

describe('SearchToDoTaskComponent', () => {
  let component: SearchToDoTaskComponent;
  let fixture: ComponentFixture<SearchToDoTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SearchToDoTaskComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SearchToDoTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});