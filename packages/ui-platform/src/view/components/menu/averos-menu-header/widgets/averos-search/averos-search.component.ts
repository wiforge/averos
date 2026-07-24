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

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core'

@Component({
  selector: 'averos-search',
  templateUrl: './averos-search.component.html',
  styleUrls: ['./averos-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchComponent implements OnInit {
  @ViewChild('searchInputBox', { static: true }) searchInputBox!: ElementRef<HTMLInputElement>

  constructor() {}

  ngOnInit(): void {}

  openSearch() {
    this.searchInputBox.nativeElement.focus()
  }
}
