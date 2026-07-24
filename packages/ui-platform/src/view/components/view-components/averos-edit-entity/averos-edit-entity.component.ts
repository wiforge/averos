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
  ChangeDetectionStrategy,
  OnDestroy,
  EventEmitter,
  Output,
  Input,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { AlertService, Indexable, UseCaseConfig, UseCaseViewLayout } from '@averos/core'

import { Observable } from 'rxjs'

@Component({
  selector: 'averos-edit-entity',
  templateUrl: './averos-edit-entity.component.html',
  styleUrls: ['./averos-edit-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosEditEntityComponent<T extends Indexable> implements OnInit, OnDestroy {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() reactiveForm!: FormGroup
  @Input() editModeActivated!: boolean
  @Input() displayActions = true
  @Output() submitForm: EventEmitter<T> = new EventEmitter<T>()
  @Output() cloneEvent: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() updateEditMode: EventEmitter<boolean> = new EventEmitter<boolean>()

  componentReactiveForm!: FormGroup
  isFormModified = false
  submitted = false

  constructor(private alertService: AlertService) {}

  formModified(event: boolean) {
    this.isFormModified = event
  }

  ngOnInit(): void {
    // this.useCaseConfig.editModeActivated = false;
    this.componentReactiveForm = this.reactiveForm
  }

  ngOnDestroy() {}

  clone() {
    this.cloneEvent.emit(true)
  }

  cancelUpdate(): boolean {
    if (this.componentReactiveForm.dirty && !this.submitted) {
      this.alertService.warn(
        $localize`:@@app.notification.warning.modification:Modifications will be lost ! \nDo you confirm your action`,
      )
      this.alertService.getAlertDialogResponse().subscribe({
        next: (confirmed) => {
          if (confirmed) {
            if (this.editModeActivated) {
              this.updateEditMode.emit(!this.editModeActivated)
              this.componentReactiveForm.reset(this.useCaseConfig.entity)
            }
            return true
          }
          return false
        },
        error: (error) => {
          console.log(error)
          return false
        },
      })
      return true
    } else {
      this.updateEditMode.emit(!this.editModeActivated)
      this.componentReactiveForm.reset(this.useCaseConfig.entity)
      return true
    }
  }

  disableSave(): boolean {
    return (
      this.componentReactiveForm.invalid ||
      this.componentReactiveForm.pristine ||
      this.componentReactiveForm.pending ||
      !this.isFormModified
    )
  }

  onSubmit() {
    if (this.componentReactiveForm.invalid) {
      return
    }
    this.submitForm.emit(this.componentReactiveForm.value)
  }
}
