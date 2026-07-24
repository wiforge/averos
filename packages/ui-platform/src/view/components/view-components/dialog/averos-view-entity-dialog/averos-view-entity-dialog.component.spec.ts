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

import { AverosViewEntityDialogComponent } from './averos-view-entity-dialog.component';

describe('AverosViewEntityDialogComponent', () => {
  let component: AverosViewEntityDialogComponent<any>;
  let fixture: ComponentFixture<AverosViewEntityDialogComponent<any>>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ AverosViewEntityDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AverosViewEntityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
