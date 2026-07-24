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

import { CreateToDoTaskComponent } from './create-to-do-task.component';

describe('CreateToDoTaskComponent', () => {
  let component: CreateToDoTaskComponent;
  let fixture: ComponentFixture<CreateToDoTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateToDoTaskComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateToDoTaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});