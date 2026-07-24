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

import {
  Component,
  OnInit,
  Inject,
  ChangeDetectionStrategy,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { Observable } from 'rxjs'
import { AverosViewEntityComponent } from '../../averos-view-entity'
import { Indexable, UseCaseConfig, UseCaseViewLayout } from '@averos/core'

@Component({
  selector: 'averos-view-entity-dialog',
  templateUrl: './averos-view-entity-dialog.component.html',
  styleUrls: ['./averos-view-entity-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosViewEntityDialogComponent<T extends Indexable> implements OnInit {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() reactiveForm!: FormGroup
  @Input() editModeActivated!: boolean
  @Output() submitForm: EventEmitter<any> = new EventEmitter<any>()
  @Output() editEvent: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() updateEditMode: EventEmitter<boolean> = new EventEmitter<boolean>()

  @ViewChild('averosViewEntityComponent', { static: true })
  averosViewEntityComponent!: AverosViewEntityComponent<T>

  goFullScreen = false

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<T>,
  ) {}

  ngOnInit(): void {}

  updateEditModeInParent(event: boolean) {
    this.updateEditMode.emit(event)
  }

  onCancel(data?: any) {
    if (this.averosViewEntityComponent.cancelUpdate()) {
      this.updateEditMode.emit(!this.editModeActivated)
      this.dialogRef.close(data)
    }
  }
  edit() {
    this.editEvent.emit(true)
  }

  onSubmit() {
    this.averosViewEntityComponent.onSubmit()
  }
  submitToParentForm(entity: any) {
    this.submitForm.emit(entity)
  }
  disableSave(): boolean {
    return this.averosViewEntityComponent.disableSave()
  }

  expandDialog() {
    if (!this.goFullScreen) {
      this.dialogRef.updateSize('100%', '100%')
    } else {
      this.dialogRef.updateSize('80%', '90%')
    }
    this.goFullScreen = !this.goFullScreen
  }
}
