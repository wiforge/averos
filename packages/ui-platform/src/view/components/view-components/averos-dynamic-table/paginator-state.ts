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

export class PaginatorState {
  currentPageIndex: number = 0 // Default value
  pageSize: number // default pageSize = 5
  totalItemsCount: number = 0

  constructor(pageSize: number) {
    this.pageSize = pageSize
  }

  resetState(pageSize: number) {
    this.currentPageIndex = 0
    this.pageSize = pageSize // default pageSize = 5
    this.totalItemsCount = 0
  }
}
