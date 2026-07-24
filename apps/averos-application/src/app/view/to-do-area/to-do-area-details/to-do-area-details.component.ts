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
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router'
import { Location } from '@angular/common'
import { FormGroup } from '@angular/forms'
import { Observable, Subscription } from 'rxjs'
import { ToDoArea } from '../../../model/to-do-area'
import { ToDoAreaService } from '../../../service/to-do-area-service.service'
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
  selector: 'app-to-do-area-details-component',
  templateUrl: './to-do-area-details.component.html',
  styleUrls: ['./to-do-area-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ToDoAreaDetailsComponent
  implements CreateViewEditUseCase<ToDoArea>, OnInit, OnDestroy
{
  useCaseViewLayout!: Observable<UseCaseViewLayout<ToDoArea> | null>
  reactiveForm!: FormGroup
  useCaseConfig: UseCaseConfig<ToDoArea> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entity: undefined,
    entityType: ToDoArea,
    useCase: undefined,
  }
  editModeActivated = false
  currentUseCase: UseCase

  useCaseEntity!: IndexableType<ToDoArea>
  private userSubscription!: Subscription
  private addRelationSubscription!: Subscription
  private deleteRelationSubscription!: Subscription
  private updateEntitySubscription!: Subscription
  private createEntitySubscription!: Subscription

  constructor(
    private entityService: ToDoAreaService,
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

  onSubmit(submittedValue: IndexableType<ToDoArea>) {
    // handles updates in case of EDIT use case
    if (this.currentUseCase === UseCase.EDIT || this.currentUseCase === UseCase.UPDATE) {
      let idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
      submittedValue[idName] = (this.useCaseConfig.entity as Indexable)[idName]
      /**
       * //TODO: transform the submittedvalue to the external entity.before updating the entity, pay attention to composite value transformation since 
       * compositevalues could be depicted by an id as follow. Remove arrays as well since those are updated seperately:
       * submittedValue = {
                              area_id: '67ab98935f151be2d1dc1580'
                              compositeTestEntity: null,
                              {toDoTasks: Array(3)}

                          }
       */

      this.updateEntitySubscription = this.entityService.updateEntity(submittedValue).subscribe({
        next: (updatedEntity: ToDoArea | null) => {
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
        next: (createdEntity: ToDoArea | null) => {
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
              this.useCaseEntity[idName],
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
              this.useCaseEntity[idName],
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
    this.useCaseViewLayout = ToDoArea.getUseCaseViewLayout(this.currentUseCase)
    this.reactiveForm = this.formControlService.buildUseCaseFormFromEntityType(
      ToDoArea,
      useCase,
      entity,
    )
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

  onCompositeRelationAction(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    switch (entityAlteredRelationEventData.action) {
      case UseCaseAction.VIEW:
        this.viewCompositeEntity(entityAlteredRelationEventData)
        break
      case UseCaseAction.EDIT:
        this.editCompositeEntity(entityAlteredRelationEventData)
        break
      case UseCaseAction.ADD:
        this.addCompositeEntity(entityAlteredRelationEventData)
        break
      case UseCaseAction.DELETE:
        this.removeCompositeEntity(entityAlteredRelationEventData)
        break
      default:
        break
    }
  }

  viewCompositeEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    let navigationExtras: NavigationExtras = {
      state: {
        usecase: UseCase.VIEW,
      },
    }

    let itemSubjectToAction = entityAlteredRelationEventData.actionEventData.itemSubjectToAction
    let id = null
    let memberService = TypeScriptTypeMetaDatatHandler.instance.getCompositeMemberService(
      this.useCaseConfig.entityType,
      entityAlteredRelationEventData.actionEventData.relationName,
    )
    // Check wether itemSubjectToAction is actually an id
    if (!memberService) {
      return
    }
    if (TypeScriptTypeMetaDatatHandler.instance.isSimpleType(itemSubjectToAction)) {
      id = itemSubjectToAction
    } else {
      // itemSubjectToAction is an object (ex. {"_id": "cdcdcd", "name": "test name"})
      id =
        itemSubjectToAction[
          TypeScriptTypeMetaDatatHandler.instance.getIdName(memberService.MANAGED_ENTITY)
        ]
    }
    //
    let navigateTo = `/${memberService.MANAGED_ENTITY_NAME.toLowerCase()}s/view/`

    this.router.navigate([navigateTo, id], navigationExtras)
  }

  addCompositeEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {}
  editCompositeEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {}

  removeCompositeEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {}
}
