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

import { ChangeDetectionStrategy, Component, OnInit, OnDestroy } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { Observable, Subscription } from 'rxjs'

import { CompositeTestEntity } from '../../../model/composite-test-entity'

import { CompositeTestEntityService } from '../../../service/composite-test-entity-service.service'
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
  selector: 'app-create-composite-test-entity-component',
  templateUrl: './create-composite-test-entity.component.html',
  styleUrls: ['./create-composite-test-entity.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCompositeTestEntityComponent
  implements CreateViewEditUseCase<CompositeTestEntity>, OnInit, OnDestroy
{
  useCaseViewLayout!: Observable<UseCaseViewLayout<CompositeTestEntity> | null>
  componentNewValue: IndexableType<CompositeTestEntity> = new CompositeTestEntity()
  reactiveForm!: FormGroup
  useCaseConfig: UseCaseConfig<CompositeTestEntity> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entity: this.componentNewValue,
    entityType: CompositeTestEntity,
    useCase: UseCase.CREATE,
  }
  editModeActivated = true // true for Create UseCases

  createEntitySubscription!: Subscription
  updateEntitySubscription!: Subscription
  addRelationSubscription!: Subscription
  deleteRelationSubscription!: Subscription

  constructor(
    private entityService: CompositeTestEntityService,
    private alertService: AlertService,
    private formControlService: FormControlService,
  ) {}

  ngOnDestroy(): void {
    this.addRelationSubscription?.unsubscribe()
    this.deleteRelationSubscription?.unsubscribe()
    this.createEntitySubscription?.unsubscribe()
    this.updateEntitySubscription?.unsubscribe()
  }

  /**
   * This method will be called in a create entity use case if you happen to have a One To Many relationship
   * with another composite entity and you wish to include child enties addition/removal when you create a parent entity instance
   * The method wont be called if no composite OneToMany relationship is configured in the parent's CreateUCViewLayout
   * @param entityAlteredRelationEventData
   */
  updateRelationCollection(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    let idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    if (entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction.length > 0) {
      // handle the relation collection data by action
      switch (entityAlteredRelationEventData.action) {
        case UseCaseAction.DELETE:
          this.deleteRelationSubscription = this.entityService
            .deleteRelationCollection(
              (this.useCaseConfig.entity as Indexable)[idName],
              this.useCaseConfig.entity as CompositeTestEntity | Partial<CompositeTestEntity>,
              entityAlteredRelationEventData.actionEventData.relationName,
              entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction,
            )
            .subscribe({
              next: (updates: any) => {
                this.alertService.success($localize`:@@uc.update.entity:Entity 
                    ${
                      this.useCaseConfig.entity !== null && this.useCaseConfig.entity !== undefined
                        ? (this.useCaseConfig.entity as Indexable)[
                            TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(
                              this.useCaseConfig.entityType,
                            )
                          ]
                        : ''
                    }:entity:
                      has been updated successfully`)
                this.deleteRelationSubscription?.unsubscribe()
              },
              error: (err) => {
                console.log(err)
                this.alertService.error($localize`:@@uc.update.entity.error:Entity 
                    ${
                      this.useCaseConfig.entity !== null && this.useCaseConfig.entity !== undefined
                        ? (this.useCaseConfig.entity as Indexable)[
                            TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(
                              this.useCaseConfig.entityType,
                            )
                          ]
                        : ''
                    }:entity:
                      cannot be updated`)
                this.deleteRelationSubscription?.unsubscribe()
              },
            })
          break
        case UseCaseAction.ADD:
          this.addRelationSubscription = this.entityService
            .addRelationCollection(
              (this.useCaseConfig.entity as Indexable)[idName],
              this.useCaseConfig.entity as CompositeTestEntity | Partial<CompositeTestEntity>,
              entityAlteredRelationEventData.actionEventData.relationName,
              entityAlteredRelationEventData.actionEventData.formattedIdsSubjectToAction,
            )
            .subscribe({
              next: (updates: any) => {
                this.alertService.success($localize`:@@uc.update.entity:Entity 
                    ${
                      this.useCaseConfig.entity !== null && this.useCaseConfig.entity !== undefined
                        ? (this.useCaseConfig.entity as Indexable)[
                            TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(
                              this.useCaseConfig.entityType,
                            )
                          ]
                        : ''
                    }:entity:
                      has been updated successfully`)
                this.addRelationSubscription?.unsubscribe()
              },
              error: (err) => {
                console.log(err)
                this.alertService.error($localize`:@@uc.update.entity.error:Entity 
                    ${
                      this.useCaseConfig.entity !== null && this.useCaseConfig.entity !== undefined
                        ? (this.useCaseConfig.entity as Indexable)[
                            TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(
                              this.useCaseConfig.entityType,
                            )
                          ]
                        : ''
                    }:entity:
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

  clone() {
    this.editModeActivated = !this.editModeActivated
    this.useCaseConfig.useCase = UseCase.CREATE
  }

  updateEditMode(event: boolean) {
    this.editModeActivated = event
    if (!this.editModeActivated) {
      this.useCaseConfig.useCase = UseCase.VIEW
    }
  }

  edit() {
    this.editModeActivated = !this.editModeActivated
    this.useCaseConfig.useCase = UseCase.EDIT
  }

  ngOnInit(): void {
    this.useCaseViewLayout = CompositeTestEntity.getUseCaseViewLayout(UseCase.CREATE)
    this.reactiveForm = this.formControlService.buildUseCaseFormFromEntityType(
      CompositeTestEntity,
      UseCase.CREATE,
    )
  }

  onSubmit(submittedValue: IndexableType<CompositeTestEntity>) {
    this.componentNewValue = submittedValue
    if (this.useCaseConfig.useCase === UseCase.CREATE) {
      this.createEntitySubscription = this.entityService
        .createEntity(this.componentNewValue)
        .subscribe({
          next: (submittedEntity: CompositeTestEntity | null) => {
            this.alertService
              .success($localize`:@@uc.create.entity:Entity ${(submittedEntity as Indexable)[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
           has been created successfully`)
            this.reactiveForm.reset(submittedEntity)
            this.editModeActivated = false
            this.useCaseConfig.entity = submittedEntity
            this.useCaseConfig.useCase = UseCase.VIEW

            this.createEntitySubscription?.unsubscribe()
          },
          error: (err) => {
            console.log(err)
            this.createEntitySubscription?.unsubscribe()
          },
        })
    } else if (this.useCaseConfig.useCase === UseCase.EDIT) {
      let entityId = TypeScriptTypeMetaDatatHandler.instance.getIdName(
        this.useCaseConfig.entityType,
      )
      this.componentNewValue[entityId] = (this.useCaseConfig.entity as Indexable)[entityId]
      this.updateEntitySubscription = this.entityService
        .updateEntity(this.componentNewValue)
        .subscribe({
          next: (submittedEntity: CompositeTestEntity | null) => {
            this.alertService
              .success($localize`:@@uc.update.entity:Entity ${(submittedEntity as Indexable)[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
            has been updated successfully`)
            this.editModeActivated = false
            this.reactiveForm.reset(this.componentNewValue)
            this.useCaseConfig.entity = submittedEntity
            this.useCaseConfig.useCase = UseCase.VIEW

            this.updateEntitySubscription?.unsubscribe()
          },
          error: (err) => {
            console.log(err)
            this.updateEntitySubscription?.unsubscribe()
          },
        })
    }
  }
}
