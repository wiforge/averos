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

import { Component, OnInit, ChangeDetectionStrategy, Inject, OnDestroy } from '@angular/core'
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Observable, Subscription } from 'rxjs'
import { FormGroup } from '@angular/forms'

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { map, shareReplay } from 'rxjs/operators'
import {
  AlertService,
  AverosViewConfig,
  EntityViewLayout,
  FormControlService,
  Indexable,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseConfig,
  UseCaseViewLayout,
} from '@averos/core'

@Component({
  selector: 'averos-averos-generic-text-dialog',
  templateUrl: './averos-generic-text-dialog.component.html',
  styleUrls: ['./averos-generic-text-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosGenericTextDialogComponent<T extends Indexable> implements OnInit, OnDestroy {
  useCaseConfig: UseCaseConfig<any>
  entityUseCaseViewLayout$: Observable<UseCaseViewLayout<T>>
  reactiveForm!: FormGroup
  editModeActivated!: boolean
  propagatedValue: any
  canActivateEditMode!: boolean
  dataCollection$!: Observable<[]>
  onLoadDataSubscription!: Subscription
  onSubmitDataCallBackSubscription!: Subscription
  activateObjectsSelection: boolean = false
  displayActions = false
  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay(),
  )

  isFormModified = false
  isCompositeRelationModified = false
  submitted = false

  reloadData: boolean = false
  privateParentEntityType!: T
  dialogSubscription!: Subscription

  goFullScreen = false

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AverosViewConfig,
    private breakpointObserver: BreakpointObserver,
    public dialogRef: MatDialogRef<unknown>,
    public dialog: MatDialog,
    private alertService: AlertService,
    private formControlService: FormControlService,
  ) {
    this.useCaseConfig = this.data.useCaseConfig
    this.entityUseCaseViewLayout$ = this.data.useCaseViewLayout
  }

  ngOnInit(): void {
    if (this.useCaseConfig.useCase === UseCase.CREATE) {
      // Do not load any entity in case of entity creation
      return
    }
    if (
      this.useCaseConfig.useCase === UseCase.VIEW ||
      this.useCaseConfig.useCase === UseCase.UPDATE ||
      this.useCaseConfig.useCase === UseCase.EDIT
    ) {
      // load/refresh entity in case of entity view / update or edit
      if (!this.data.onLoadCallback) {
        if (this.useCaseConfig.entityType['instanceMetadata']) {
          this.data.onLoadCallback =
            this.useCaseConfig.entityType.instanceMetadata().constructor.onLoadCompositeCallback
        } else {
          this.data.onLoadCallback =
            this.useCaseConfig.entityType.constructor.onLoadCompositeCallback
        }
      }
      let idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
      let value =
        typeof this.data.useCaseConfig.entity === 'string'
          ? this.data.useCaseConfig.entity
          : this.data.useCaseConfig.entity[idName]
      this.onLoadDataSubscription = this.data.onLoadCallback?.(value).subscribe(
        (loadedEntity: any) => {
          // the reactive form instance should be recreated so that a new object reference will be available and given
          // to the averos-view-edit-entity component in a manner that will trigger the angular change detector
          //  and updates all the component fileds values. (other wise no updates will be carried on the target component's values)
          // do this only in case of averos entity
          if (TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)) {
            this.reactiveForm = this.formControlService.buildUseCaseFormFromEntityType(
              this.data.useCaseConfig.entityType,
              this.useCaseConfig.useCase!,
            )
          }

          this.reactiveForm.reset(loadedEntity)
          this.useCaseConfig = {
            componentAppearance: this.useCaseConfig.componentAppearance,
            entity: loadedEntity,
            entityType: this.useCaseConfig.entityType,
            iconLayout: this.useCaseConfig.iconLayout,
            useCase: this.useCaseConfig.useCase,
            onLoadCallback: this.useCaseConfig.onLoadCallback,
            isRelationView: this.useCaseConfig.isRelationView,
          }
        },
        (err) => {
          console.log(err)
        },
      )
    }
  }

  getEntityViewLayout(): Observable<EntityViewLayout<unknown>> {
    return this.data.eClass?.constructor['getEntityViewLayout']()
  }

  get useCase() {
    return UseCase
  }

  onCancel(data?: any) {
    if (this.cancelUpdate()) {
      this.dialogRef.close(data)
    }
  }

  resetForm() {
    this.reactiveForm.reset()
  }

  edit() {
    this.editModeActivated = !this.editModeActivated
    this.data.useCaseConfig.useCase = UseCase.EDIT
  }

  updateEditMode(event: boolean) {
    this.editModeActivated = event
  }

  onSubmit() {
    if (this.reactiveForm.invalid) {
      return
    }
    this.onSubmitDataCallBackSubscription = this.data
      .onSubmitCallback?.(this.reactiveForm.getRawValue(), this.data)
      .subscribe({
        next: (entity: any) => {
          this.alertService.success($localize`:@@uc.modification.entity:Done Successfully!`)
          this.editModeActivated = false
          this.reactiveForm.reset(entity)
          this.data.value = entity
          //  this.averosViewEditEntityComponent.onSubmit();
        },
        error: (err: Error) => {
          console.log(err)
        },
      })
  }

  get notificationService() {
    return this.alertService
  }

  get alertservice() {
    return AlertService
  }

  expandDialog() {
    if (!this.goFullScreen) {
      this.dialogRef.updateSize('100%', '100%')
    } else {
      this.dialogRef.updateSize('80%', '90%')
    }
    this.goFullScreen = !this.goFullScreen
  }

  formModified(event: boolean) {
    this.isFormModified = event
  }

  ngOnDestroy() {
    this.onLoadDataSubscription?.unsubscribe()
    this.onSubmitDataCallBackSubscription?.unsubscribe()
  }

  cancelUpdate(): boolean {
    if (this.reactiveForm.dirty && !this.submitted) {
      this.alertService.warn(
        $localize`:@@app.notification.warning.modification:Modifications will be lost ! \nDo you confirm your action`,
      )
      this.alertService.getAlertDialogResponse().subscribe({
        next: (confirmed) => {
          if (confirmed) {
            if (this.editModeActivated) {
              this.updateEditMode(!this.editModeActivated)
              this.reactiveForm.reset(this.useCaseConfig.entity)
            }
            return true
          }
          return false
        },
        error: (error) => {
          console.log(error)
          return true
        },
      })
      return true
    } else {
      this.updateEditMode(!this.editModeActivated)
      this.reactiveForm.reset(this.useCaseConfig.entity)
      return true
    }
  }

  disableSave(): boolean {
    return (
      this.reactiveForm.invalid ||
      this.reactiveForm.pristine ||
      this.reactiveForm.pending ||
      !this.isFormModified
    )
  }
}
