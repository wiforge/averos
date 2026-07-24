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

import { Directive, HostListener, Input } from '@angular/core'
import { DataExporterService } from '@averos/core'

@Directive({
  selector: '[averosDataExport]',
  standalone: false,
})
export class DataExportDirective {
  @Input('averosDataExport') data!: any[]
  @Input() fileName!: string
  @Input() format!: string

  constructor(private dataExporterService: DataExporterService<any>) {}

  @HostListener('click', ['$event']) onClick($event) {
    console.log('clicked: ' + $event)
    this.dataExporterService.exportData(this.data, this.format, this.fileName)
  }
}
