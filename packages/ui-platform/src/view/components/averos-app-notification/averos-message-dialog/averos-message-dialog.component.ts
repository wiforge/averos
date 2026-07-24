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

import { Component, OnInit, Inject, ChangeDetectionStrategy, inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { AlertService } from '@averos/core'

@Component({
  selector: 'averos-message-dialog',
  templateUrl: './averos-message-dialog.component.html',
  styleUrls: ['./averos-message-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosMessageDialogComponent implements OnInit {
  private readonly alertService = inject(AlertService)
  // Make AlertService constants available to template
  protected readonly AlertService = AlertService

  // public dialogReplyData = {
  //                     message: null,
  //                     action: null
  //                 };

  constructor(
    public dialogRef: MatDialogRef<AverosMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    dialogRef.disableClose = true
  }

  onCancelClick(): void {
    // On cancel action
    this.dialogRef.close()
    this.alertService.setDialogResponse(false)
  }

  onContinueClick(): void {
    // On continue action
    this.dialogRef.close()
    this.alertService.setDialogResponse(true)
  }

  ngOnInit(): void {}
}
