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

import { Component, ChangeDetectionStrategy } from '@angular/core'
import { MatBottomSheetRef } from '@angular/material/bottom-sheet'

@Component({
  selector: 'averos-bottom-sheet-data-export-format',
  templateUrl: './bottom-sheet-data-export-format.component.html',
  styleUrls: ['./bottom-sheet-data-export-format.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class BottomSheetDataExportFormatComponent {
  constructor(private bottomSheetRef: MatBottomSheetRef<BottomSheetDataExportFormatComponent>) {}

  onSelectExportFormat(format: string): void {
    this.bottomSheetRef.dismiss(format)
  }
}
