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

import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

@Component({
  selector: 'averos-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class HomeComponent implements OnInit {
  videoUrl = ''
  safeURL: SafeResourceUrl

  constructor(private sanitizer: DomSanitizer) {
    this.safeURL = this.sanitizer.bypassSecurityTrustResourceUrl(this.videoUrl)
  }

  ngOnInit(): void {}
}
