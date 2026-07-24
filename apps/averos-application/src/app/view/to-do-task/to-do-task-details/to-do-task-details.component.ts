/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */
 
import { ChangeDetectorRef, OnDestroy } from '@angular/core'
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Location } from '@angular/common'
import { FormGroup } from '@angular/forms'
import { Observable, Subscription } from 'rxjs'
import { ToDoTask } from '../../../model/to-do-task'
import { ToDoTaskService } from '../../../service/to-do-task-service.service'
import {
  AlertService,
  CreateViewEditUseCase,
  EntityAlteredRelationEventData,
  FormControlService,
  Indexable,
  IndexableType,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseAction,
  UseCaseConfig,
  UseCaseViewLayout,
} from '@averos/core'

@Component({
  selector: 'app-to-do-task-details-component',
  templateUrl: './to-do-task-details.component.html',
  styleUrls: ['./to-do-task-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ToDoTaskDetailsComponent
  implements CreateViewEditUseCase<ToDoTask>, OnInit, OnDestroy
{
  useCaseViewLayout!: Observable<UseCaseViewLayout<ToDoTask> | null>
  reactiveForm!: FormGroup
  useCaseConfig: UseCaseConfig<ToDoTask> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entity: undefined,
    entityType: ToDoTask,
    useCase: undefined,
  }
  editModeActivated = false
  currentUseCase: UseCase

  useCaseEntity!: IndexableType<ToDoTask>
  private userSubscription!: Subscription
  private addRelationSubscription!: Subscription
  private deleteRelationSubscription!: Subscription
  private updateEntitySubscription!: Subscription
  private createEntitySubscription!: Subscription

  constructor(
    private entityService: ToDoTaskService,
    private alertService: AlertService,
    private formControlService: FormControlService,
    private location: Location,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef,
  ) {
    const navigation = this.router.currentNavigation()
    this.currentUseCase = navigation?.extras.state?.['usecase']
      ? navigation.extras.state?.['usecase']
      : UseCase.VIEW

    if (
      this.currentUseCase === UseCase.EDIT ||
      this.currentUseCase === UseCase.CREATE ||
      this.currentUseCase === UseCase.UPDATE
    ) {
      this.editModeActivated = true
    } else if (this.currentUseCase === UseCase.VIEW) {
      this.editModeActivated = false
    }

    this.updateUseCaseViewData(this.currentUseCase)
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe()
    this.addRelationSubscription?.unsubscribe()
    this.deleteRelationSubscription?.unsubscribe()
    this.updateEntitySubscription?.unsubscribe()
    this.createEntitySubscription?.unsubscribe()
  }

  get useCase() {
    return UseCase
  }

  onSubmit(submittedValue: IndexableType<ToDoTask>) {
    // handles updates in case of EDIT use case
    if (this.currentUseCase === UseCase.EDIT || this.currentUseCase === UseCase.UPDATE) {
      let idName: string = TypeScriptTypeMetaDatatHandler.instance.getIdName(
        this.useCaseConfig.entityType,
      )
      submittedValue[idName] = (this.useCaseConfig.entity as IndexableType<ToDoTask>)[idName]
      this.updateEntitySubscription = this.entityService.updateEntity(submittedValue).subscribe({
        next: (updatedEntity: ToDoTask | null) => {
          this.alertService
            .success($localize`:@@uc.update.entity:Entity ${(updatedEntity as Indexable)[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
           has been updated successfully`)

          this.editModeActivated = false
          this.updateView(UseCase.VIEW, updatedEntity)
          this.updateEntitySubscription?.unsubscribe()
        },
        error: (err: Error) => {
          console.log(err)
          this.updateEntitySubscription?.unsubscribe()
        },
      })
    } else if (this.currentUseCase === UseCase.CREATE) {
      this.createEntitySubscription = this.entityService.createEntity(submittedValue).subscribe({
        next: (createdEntity: ToDoTask | null) => {
          this.alertService
            .success($localize`:@@uc.create.entity:Entity ${(createdEntity as Indexable)[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
           has been created successfully`)
          this.editModeActivated = false
          this.updateView(UseCase.VIEW, createdEntity)
          this.createEntitySubscription?.unsubscribe()
        },
        error: (err: Error) => {
          console.log(err)
          this.createEntitySubscription?.unsubscribe()
        },
      })
    }
  }

  /**
   * updateRelationCollection updates the related entity with the resulted collection
   * either by adding a new value (in case of addition) or by deleting an existing value from the related collection
   */
  updateRelationCollection(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    let idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    if (entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction.length > 0) {
      // handle the relation collection data by action
      switch (entityAlteredRelationEventData.action) {
        case UseCaseAction.DELETE:
          this.deleteRelationSubscription = this.entityService
            .deleteRelationCollection(
              (this.useCaseEntity as any)[idName],
              this.useCaseEntity,
              entityAlteredRelationEventData.actionEventData.relationName,
              entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction,
            )
            .subscribe({
              next: (updates: any) => {
                this.alertService
                  .success($localize`:@@uc.update.entity:Entity ${this.useCaseEntity[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                      has been updated successfully`)
                this.deleteRelationSubscription?.unsubscribe()
              },
              error: (err: Error) => {
                console.log(err)
                this.alertService
                  .error($localize`:@@uc.update.entity.error:Entity ${this.useCaseEntity[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                      cannot be updated`)
                this.deleteRelationSubscription?.unsubscribe()
              },
            })
          break
        case UseCaseAction.ADD:
          this.addRelationSubscription = this.entityService
            .addRelationCollection(
              (this.useCaseEntity as any)[idName],
              this.useCaseEntity,
              entityAlteredRelationEventData.actionEventData.relationName,
              entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction,
            )
            .subscribe({
              next: (updates: any) => {
                this.alertService
                  .success($localize`:@@uc.update.entity:Entity ${this.useCaseEntity[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                      has been updated successfully`)
                this.addRelationSubscription?.unsubscribe()
              },
              error: (err: Error) => {
                console.log(err)
                this.alertService
                  .error($localize`:@@uc.update.entity.error:Entity ${this.useCaseEntity[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                      cannot be updated`)
                this.addRelationSubscription?.unsubscribe()
              },
            })

          break
        default:
          break
      }
    }
  }

  ngOnInit(): void {}

  clone() {
    this.editModeActivated = !this.editModeActivated
    this.updateUseCaseViewData(UseCase.CREATE)
  }

  edit() {
    this.editModeActivated = !this.editModeActivated
    this.updateUseCaseViewData(UseCase.EDIT)
  }

  updateEditMode(event: boolean) {
    this.editModeActivated = event
    this.updateUseCaseViewData(this.editModeActivated ? UseCase.EDIT : UseCase.VIEW)
  }

  /**
   * Updates the view depending on the current use case (VIEW or EDIT|CREATE)
   *  described by editModeActivated = (true|false)
   */
  updateUseCaseViewData(useCase: UseCase) {
    const id = this.route.snapshot.paramMap.get('id')

    if (id) {
      this.userSubscription = this.entityService.getEntityById(id).subscribe((entity) => {
        this.updateView(useCase, entity)
      })
    }
  }

  /**
   * Get back to the latest previous location
   */
  getBack() {
    this.location.back()
  }

  updateView(useCase: UseCase, entity: any) {
    this.currentUseCase = useCase
    this.useCaseViewLayout = ToDoTask.getUseCaseViewLayout(this.currentUseCase)
    this.reactiveForm = this.formControlService.buildUseCaseFormFromEntityType(ToDoTask, useCase)
    this.useCaseEntity = entity
    this.reactiveForm.reset(this.useCaseEntity)
    this.useCaseConfig = {
      componentAppearance: 'outline',
      iconLayout: 'component',
      entity: this.useCaseEntity,
      entityType: this.useCaseConfig.entityType,
      useCase: this.currentUseCase,
    }
    this.cd.markForCheck()
  }
}
