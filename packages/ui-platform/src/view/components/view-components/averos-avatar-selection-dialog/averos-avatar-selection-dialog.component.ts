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

import { Component, OnInit, ChangeDetectionStrategy, Inject } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

@Component({
  selector: 'averos-averos-avatar-selection-dialog',
  templateUrl: './averos-avatar-selection-dialog.component.html',
  styleUrls: ['./averos-avatar-selection-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosAvatarSelectionDialogComponent implements OnInit {
  defaultAvatarList = []
  private avatarURI!: string

  goFullScreen = false
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<any>,
  ) {
    this.defaultAvatarList = this.data.defaultAvatarList
  }
  ngOnInit(): void {
    this.defaultAvatarList = this.data.defaultAvatarList
  }

  onCancel(data?: any) {
    this.dialogRef.close(data)
  }

  onCardClicked(avatarURI) {
    this.avatarURI = avatarURI
  }
  onSubmit() {
    this.dialogRef.close(this.avatarURI)
  }

  disableSave(): boolean {
    return !this.avatarURI || this.avatarURI === undefined
  }
}
