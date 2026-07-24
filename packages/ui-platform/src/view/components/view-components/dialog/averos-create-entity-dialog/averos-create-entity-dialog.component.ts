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
  Input,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { Observable } from 'rxjs'
import { AverosCreateEntityComponent } from '../../averos-create-entity'
import { Indexable, UseCaseConfig, UseCaseViewLayout } from '@averos/core'

@Component({
  selector: 'averos-create-entity-dialog',
  templateUrl: './averos-create-entity-dialog.component.html',
  styleUrls: ['./averos-create-entity-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosCreateEntityDialogComponent<T extends Indexable> implements OnInit {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() reactiveForm!: FormGroup
  @Input() editModeActivated!: boolean
  @Output() submitForm: EventEmitter<any> = new EventEmitter<any>()
  @Output() cloneEvent: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() updateEditMode: EventEmitter<boolean> = new EventEmitter<boolean>()

  @ViewChild('averosCreateEntityComponent', { static: true })
  averosCreateEntityComponent!: AverosCreateEntityComponent<T>

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
    if (this.averosCreateEntityComponent.cancelUpdate()) {
      this.updateEditMode.emit(!this.editModeActivated)
      this.dialogRef.close(data)
    }
  }

  clone() {
    this.cloneEvent.emit(true)
  }

  resetForm() {
    this.averosCreateEntityComponent.componentReactiveForm.reset()
  }

  onSubmit() {
    this.averosCreateEntityComponent.onSubmit()
  }

  submitToParentForm(entity: any) {
    this.submitForm.emit(entity)
  }

  disableSave(): boolean {
    return this.averosCreateEntityComponent.disableSave()
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
