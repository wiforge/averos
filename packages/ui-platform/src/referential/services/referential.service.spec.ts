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

import { TestBed } from '@angular/core/testing'

import { ReferentialService } from './referential.service'

describe('ReferentialService', () => {
  let service: ReferentialService

  beforeEach(() => {
    TestBed.configureTestingModule({})
    service = TestBed.inject(ReferentialService)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })
})
