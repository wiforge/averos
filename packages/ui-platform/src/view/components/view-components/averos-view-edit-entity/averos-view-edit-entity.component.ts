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
  Input,
  Output,
  OnDestroy,
  EventEmitter,
} from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import { Observable } from 'rxjs'

import { PageEvent } from '@angular/material/paginator'
import {
  AlertService,
  AvCrudService,
  EntityAlteredRelationEventData,
  EntityViewLayout,
  FormControlService,
  Indexable,
  IndexableType,
  PaginatedData,
  SearchInputCriteria,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseAction,
  UseCaseConfig,
  UseCaseViewLayout,
} from '@averos/core'

@Component({
  selector: 'averos-view-edit-entity',
  templateUrl: './averos-view-edit-entity.component.html',
  styleUrls: ['./averos-view-edit-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosViewEditEntityComponent<T extends Indexable> implements OnInit, OnDestroy {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() editModeActivated!: boolean
  @Input() displayActions = true
  @Output() submitForm: EventEmitter<T> = new EventEmitter<T>()
  @Output() cloneEvent: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() editEvent: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() updateEditMode: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() updateRelationCollectionEvent: EventEmitter<EntityAlteredRelationEventData> =
    new EventEmitter<EntityAlteredRelationEventData>()
  @Output() onCompositeRelationActionEvent: EventEmitter<any> = new EventEmitter<any>()

  @Input() set reactiveForm(reactiveForm: FormGroup) {
    this.componentReactiveForm = reactiveForm
    this.isFormModified = false
    this.submitted = false
  }

  get reactiveForm(): FormGroup {
    return this.componentReactiveForm
  }

  componentReactiveForm!: FormGroup
  isFormModified = false
  isCompositeRelationModified = false
  submitted = false

  searchCompositeEntity: boolean = false
  private currentCompositeChildEntity: any = null
  private currentCompositeRelationField!: string
  showCompositeEntitySearchResult: boolean = false

  // Composite Relation Entity parameters
  compositeRelationUseCaseConfig!: UseCaseConfig<IndexableType<unknown>>
  compositeRelationEntityUseCaseViewLayout$!: Observable<UseCaseViewLayout<IndexableType<unknown>>>
  compositeRelationSearchInputFormGoup!: FormGroup
  compositeRelationsearchCriteria!: SearchInputCriteria
  compositeRelationEntitiesSearchResultValues$!: Observable<
    IndexableType<unknown>[] | PaginatedData<IndexableType<unknown>> | null
  >
  compositeRelationEntityViewLayout!: Observable<EntityViewLayout<IndexableType<unknown>>>
  compositeRelationEntityService!: AvCrudService<IndexableType<unknown>>

  constructor(
    private alertService: AlertService,
    private formControlService: FormControlService,
  ) {}

  formModified(event: boolean) {
    this.isFormModified = event
  }

  compositeRelationModified(event: boolean) {
    this.isCompositeRelationModified = event
  }

  get useCase() {
    return UseCase
  }
  ngOnInit(): void {}

  ngOnDestroy() {}

  clone() {
    this.cloneEvent.emit(true)
  }

  edit() {
    this.editEvent.emit(true)
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
          console.log('error log')
          return false
        },
      })
      return false
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

  updateRelationCollection(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    switch (entityAlteredRelationEventData.action) {
      case UseCaseAction.DELETE:
        this.deleteRelationCollectionItem(entityAlteredRelationEventData)
        break
      case UseCaseAction.ADD:
        this.addRelationCollectionItem(entityAlteredRelationEventData)
        break
      default:
        break
    }
  }
  /**
   * a collection relation process triggered
   * when an item is deleted from a relation that is a collection
   *
   * The function updates the parent with the resulted collection
   */
  private deleteRelationCollectionItem(
    entityAlteredRelationEventData: EntityAlteredRelationEventData,
  ) {
    this.updateReactiveFormValueWithUpdatedRelationValues(entityAlteredRelationEventData)
  }

  /**
   * a collection relation process triggered
   * when an item is added to a relation that is a collection
   *
   * The function updates the parent with the resulted collection
   */
  private addRelationCollectionItem(
    entityAlteredRelationEventData: EntityAlteredRelationEventData,
  ) {
    this.updateReactiveFormValueWithUpdatedRelationValues(entityAlteredRelationEventData)
  }

  /**
   * Updates the componentReactiveForm value with the resulting modified relation value
   * according to relationName and resulting relation value
   */
  private updateReactiveFormValueWithUpdatedRelationValues(
    entityAlteredRelationEventData: EntityAlteredRelationEventData,
  ) {
    let currentValue = this.componentReactiveForm.value
    currentValue[entityAlteredRelationEventData.actionEventData.relationName] =
      entityAlteredRelationEventData.resultingItemIdsCollection
    this.updateRelationCollectionEvent.emit(entityAlteredRelationEventData)
    this.componentReactiveForm.patchValue(currentValue, { emitEvent: false })
  }

  onCompositeRelationAction(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    switch (entityAlteredRelationEventData.action) {
      case UseCaseAction.VIEW:
        this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
        break
      case UseCaseAction.EDIT:
        this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
        break
      case UseCaseAction.ADD:
        this.addCompositeRelationEntity(entityAlteredRelationEventData)
        break
      case UseCaseAction.DELETE:
        this.removeCompositeRelationEntity(entityAlteredRelationEventData)
        this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
        break
      default:
        break
    }
  }
  removeCompositeRelationEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    this.alertService.warn(
      $localize`:@@app.notification.warning.modification:Modifications will be lost ! \nDo you confirm your action`,
    )
    this.alertService.getAlertDialogResponse().subscribe({
      next: (confirmed) => {
        if (confirmed) {
          // proceed to deletion
          let currentValue = this.componentReactiveForm.getRawValue()
          currentValue[entityAlteredRelationEventData.actionEventData.relationName] = null
          this.componentReactiveForm.patchValue(currentValue)
          this.componentReactiveForm.markAsDirty()
          return
        }
        // cancel removal
        this.componentReactiveForm.reset(this.useCaseConfig.entity)
      },
      error: (error) => {
        console.log(error)
      },
    })
  }

  addCompositeRelationEntity(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    // initialize the compoite relation view parameter each time a composite relation is called for addition
    this.initializeCompositeRelationView()
    this.currentCompositeRelationField = entityAlteredRelationEventData.actionEventData.relationName
    this.currentCompositeChildEntity = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.useCaseConfig.entityType,
      this.currentCompositeRelationField,
    )
    this.searchCompositeEntity = true
    // notify the parent use case after updating the composite entity
    this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
  }

  initializeCompositeRelationView() {
    this.showCompositeEntitySearchResult = false
  }

  searchCompositeRelationEntities(searchInputCriteria: SearchInputCriteria) {
    this.compositeRelationsearchCriteria = searchInputCriteria
    this.showCompositeEntitySearchResult = true
  }

  getCompositeRelationEntityUseCaseConfig(): UseCaseConfig<any> {
    if (!this.currentCompositeChildEntity) {
      throw Error(
        'getChildEntityUseCaseConfig() ==> Cannot retroeve Composite Relation Field Class Type',
      )
    }
    if (
      this.compositeRelationUseCaseConfig === null ||
      this.compositeRelationUseCaseConfig === undefined
    ) {
      this.compositeRelationUseCaseConfig = {
        componentAppearance: 'outline',
        iconLayout: 'component',
        entityType: this.currentCompositeChildEntity,
        entity: undefined,
      }
    }
    return this.compositeRelationUseCaseConfig
  }

  getSearchCompositeRelationEntityUseCaseViewLayout(): Observable<UseCaseViewLayout<any>> {
    if (!this.currentCompositeChildEntity) {
      throw Error(
        'getSearchChildEntityUseCaseViewLayout() ==> Cannot retroeve Composite Relation Field Class Type',
      )
    }
    if (
      this.compositeRelationEntityUseCaseViewLayout$ === null ||
      this.compositeRelationEntityUseCaseViewLayout$ === undefined
    ) {
      this.compositeRelationEntityUseCaseViewLayout$ =
        this.currentCompositeChildEntity.constructor.getUseCaseViewLayout(UseCase.SEARCH_INPUT)
    }
    return this.compositeRelationEntityUseCaseViewLayout$
  }

  searchInputCompositeRelationEntityFormGoup(): FormGroup {
    if (!this.currentCompositeChildEntity) {
      throw Error(
        'searchInputChildEntityFormGoup() ==> Cannot retroeve Composite Relation Field Class Type',
      )
    }
    if (
      this.compositeRelationSearchInputFormGoup === null ||
      this.compositeRelationSearchInputFormGoup === undefined
    ) {
      this.compositeRelationSearchInputFormGoup =
        this.formControlService.buildUseCaseFormFromEntityType(
          this.currentCompositeChildEntity,
          UseCase.SEARCH_INPUT,
        )
    }
    return this.compositeRelationSearchInputFormGoup
  }

  getCompositeRelationEntityViewLayout(): Observable<EntityViewLayout<IndexableType<unknown>>> {
    if (!this.currentCompositeChildEntity) {
      throw Error(
        'getCompositeEntityViewLayout() ==> Cannot retroeve Composite Relation Field Class Type',
      )
    }
    if (this.compositeRelationEntityViewLayout === null) {
      this.compositeRelationEntityViewLayout =
        this.currentCompositeChildEntity.constructor['getEntityViewLayout']()
    }
    return this.compositeRelationEntityViewLayout
  }

  getCompositeRelationEntityService() {
    if (!this.currentCompositeChildEntity) {
      throw Error(
        'getCompositeRelationEntityService() ==> Cannot retrieve Composite Relation Field Class Type',
      )
    }
    if (this.compositeRelationEntityService === null) {
      this.compositeRelationEntityService =
        this.currentCompositeChildEntity.constructor.getAverosService()
    }
    return this.compositeRelationEntityService
  }

  onSelectOne(selectedElement: T) {
    // hide the selection use case
    this.searchCompositeEntity = false

    //set the selected element into the composite entity relation
    let currentValue = this.componentReactiveForm.getRawValue()

    // Assign the new composite element to its parent entity
    currentValue[this.currentCompositeRelationField] = selectedElement
    if (this.componentReactiveForm.get(this.currentCompositeRelationField) instanceof FormControl) {
      // simple field => then set the value of the entity id
      let compositeEntityIDName = TypeScriptTypeMetaDatatHandler.instance.getIdName(
        this.currentCompositeChildEntity,
      )
      currentValue[this.currentCompositeRelationField] = selectedElement[compositeEntityIDName]
    } else {
      // instanceof FormGroup => then it's a composite entity then set the whole entity
      currentValue[this.currentCompositeRelationField] = selectedElement
    }
    this.componentReactiveForm.patchValue(currentValue)
    this.componentReactiveForm.markAsDirty()
  }

  onPageChange(pageEvent: PageEvent) {
    this.compositeRelationEntitiesSearchResultValues$ =
      this.getCompositeRelationEntityService().getEntitiesByCriteria(
        this.compositeRelationsearchCriteria,
        true,
      )
  }

  search(event: SearchInputCriteria) {
    this.compositeRelationEntitiesSearchResultValues$ =
      this.getCompositeRelationEntityService().getEntitiesByCriteria(event)
  }
}
