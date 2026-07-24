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
  Inject,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core'
import { MatDialog, MatDialogConfig, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { Observable, of, Subscription } from 'rxjs'
import { FormGroup } from '@angular/forms'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { filter, map, shareReplay } from 'rxjs/operators'
import {
  AlertService,
  AverosDialogViewConfig,
  AverosSearchOperator,
  AverosViewConfig,
  AvService,
  EntityAlteredRelationEventData,
  EntityViewLayout,
  FormControlService,
  Indexable,
  PaginatedData,
  SearchInputCriteria,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseAction,
  UseCaseConfig,
  UseCaseViewLayout,
  ViewLayoutService,
} from '@averos/core'

@Component({
  selector: 'averos-dynamic-dialog',
  templateUrl: './averos-dynamic-dialog.component.html',
  styleUrls: ['./averos-dynamic-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosDynamicDialogComponent<T extends Indexable> implements OnInit, OnDestroy {
  useCaseConfig: UseCaseConfig<any>
  entityUseCaseViewLayout$: Observable<UseCaseViewLayout<T>>
  reactiveForm!: FormGroup
  editModeActivated!: boolean
  propagatedValue: any
  canActivateEditMode!: boolean
  dataCollection$!: Observable<T[] | PaginatedData<T>>
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

  private structureSub!: Subscription
  private layoutSub!: Subscription

  private genericDialog = new MatDialogConfig()
  goFullScreen = false

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AverosViewConfig,
    private breakpointObserver: BreakpointObserver,
    public dialogRef: MatDialogRef<unknown>,
    public dialog: MatDialog,
    private alertService: AlertService,
    private formControlService: FormControlService,
    private viewLayoutService: ViewLayoutService,
    private changeDetector: ChangeDetectorRef,
  ) {
    this.useCaseConfig = this.data.useCaseConfig
    this.entityUseCaseViewLayout$ = this.data.useCaseViewLayout
    if (
      this.useCaseConfig.useCase !== UseCase.SEARCH_RESULT_TABLE &&
      this.useCaseConfig.useCase !== UseCase.SELECTABLE_SEARCH_RESULT_TABLE
    ) {
      this.reactiveForm = this.data.reactiveForm
      this.editModeActivated = this.data.editMode!
      this.canActivateEditMode = this.data.canActivateEditMode
    }
  }

  ngOnInit(): void {
    if (this.useCaseConfig.useCase === UseCase.CREATE) {
      // Do not load any entity in case of entity creation
      this.wireFormStructureSubscription()
      return
    }
    if (this.useCaseConfig.useCase === UseCase.SEARCH_RESULT_TABLE) {
      // load/refresh entities in case of collection / 1->n relationship

      if (!this.data.onLoadCallback) {
        this.data.onLoadCallback = (entities: any[]): Observable<any> => of(entities)
      }

      this.dataCollection$ = this.data.onLoadCallback(this.data.useCaseConfig.entity)
    }
    if (this.useCaseConfig.useCase === UseCase.SELECTABLE_SEARCH_RESULT_TABLE) {
      // load/refresh entities in case of selectable Search Result Table
      this.activateObjectsSelection = true
      this.dataCollection$ = this.data.onLoadWithCriteria?.callBack(
        this.data.onLoadWithCriteria.callBackCriteria,
      )
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
      if (!value) {
        if (this.useCaseConfig.entityType) {
          // get value from external_identity
          // get the external api Id
          // then get the related value
          let external_entity_id: string
          if (this.useCaseConfig.entityType['instanceMetadata']) {
            external_entity_id = (
              this.useCaseConfig.entityType
                .instanceMetadata()
                .constructor.getAverosService() as AvService<unknown>
            ).EXTERNAL_ENTITY_IDENTIFIER
          } else {
            external_entity_id = (
              this.useCaseConfig.entityType.constructor.getAverosService() as AvService<unknown>
            ).EXTERNAL_ENTITY_IDENTIFIER
          }
          if (!external_entity_id) {
            throw Error(
              'Cannot find an external ID mapping configuration for the requested entity!',
            )
          }
          value = this.data.useCaseConfig.entity[external_entity_id]
        }
      }
      this.onLoadDataSubscription = this.data.onLoadCallback?.(value).subscribe(
        (loadedEntity: any) => {
          // the reactive form instance should be recreated so that a new object reference will be available and given
          // to the averos-view-edit-entity component in a manner that will trigger the angular change detector
          //  and updates all the component fileds values. (otherwise no updates will be carried on the target component's values)
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
            asyncRetrieval: this.useCaseConfig.asyncRetrieval,
            onSubmitCallback: this.useCaseConfig.onSubmitCallback,
            customUseCaseMetaData: this.useCaseConfig.customUseCaseMetaData,
          }
          this.changeDetector.markForCheck()
        },
        (err) => {
          console.log(err)
        },
      )
    }
    this.wireFormStructureSubscription()
  }

  /**
   * Subscribes to parent-driven form structure changes.
   * Safe to call unconditionally — guards against missing observable.
   */
  private wireFormStructureSubscription(): void {
    if (!this.data?.formStructureChanged$ && !this.data?.viewLayoutChanged$) return

    if (this.data?.formStructureChanged$) {
      this.structureSub = this.data.formStructureChanged$.subscribe((updatedForm: FormGroup) => {
        this.reactiveForm = updatedForm
        this.changeDetector.detectChanges()
      })
    }

    if (this.data?.viewLayoutChanged$) {
      this.layoutSub = this.data.viewLayoutChanged$.subscribe(
        (updatedLayout: UseCaseViewLayout<any>) => {
          // Replace the layout observable with a fresh one wrapping the new layout
          this.entityUseCaseViewLayout$ = of(updatedLayout)
          this.changeDetector.detectChanges()
        },
      )
    }
  }

  getEntityViewLayout(): Observable<EntityViewLayout<Indexable>> {
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

  onSelectMany(selectedData: T[]) {
    this.dialogRef.close(selectedData)
  }

  onSelect(selectedData: T) {
    this.dialogRef.close(selectedData)
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
        },
        error: (err: Error) => {
          console.log(err)
        },
      })
  }

  // executeSubmit(event: any) {
  //   this.data.onSubmitCallback(event, this.data);
  // }

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

  viewRelation(event: any) {}

  editRelation(event: any) {}

  addRelation(event: any) {}

  deleteRelation(event: any) {}

  formModified(event: boolean) {
    this.isFormModified = event
  }

  compositeRelationModified(event: boolean) {
    this.isCompositeRelationModified = event
  }

  ngOnDestroy() {
    this.onLoadDataSubscription?.unsubscribe()
    this.onSubmitDataCallBackSubscription?.unsubscribe()
    this.structureSub?.unsubscribe()
    this.layoutSub?.unsubscribe()
  }

  clone() {
    // this.cloneEvent.emit(true);
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
    // update the view
    let currentValue = this.reactiveForm.value
    currentValue[entityAlteredRelationEventData.actionEventData.relationName] =
      entityAlteredRelationEventData.resultingItemIdsCollection
    this.reactiveForm.patchValue(currentValue, { emitEvent: false })

    let viewConfig: AverosViewConfig = Object.assign({}, this.data)
    viewConfig.useCaseConfig.useCase =
      entityAlteredRelationEventData.action === UseCaseAction.DELETE
        ? UseCase.DELETERELATION
        : entityAlteredRelationEventData.action === UseCaseAction.ADD
          ? UseCase.CREATERELATION
          : UseCase.DEFAULT
    viewConfig.entityAlteredRelationEventData = entityAlteredRelationEventData
    // Update he entity
    this.onSubmitDataCallBackSubscription = this.data
      .onSubmitCallback?.(this.useCaseConfig.entity, viewConfig)
      .subscribe({
        next: (entity: any) => {
          this.alertService.success($localize`:@@uc.modification.entity:Done Successfully!`)
          this.editModeActivated = false
          this.reactiveForm.reset(entity)
          this.data.value = entity
        },
        error: (err: Error) => {
          console.log(err)
          this.alertService.error($localize`:@@uc.update.entity.error:Entity cannot be updated`)
        },
      })
  }

  // Evaluate the related element parameter against the key
  evaluateExpression(parentInstance: T, key: string): any {
    return TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(parentInstance, key)
  }

  getCollectionCount(parentInstance: T, key: string) {
    const collection = this.evaluateExpression(parentInstance, key)
    return collection ? collection?.length : 0
  }

  /**
   *
   * @param parentType
   * @param relationFieldName
   * @returns Returns the target composite member "FormGroup" according to
   *              the type of the target member that is subject to
   *              a one to one composite relationship with the parent entity.
   */
  getCompositeRelationEntityReactiveForm(parentType: T, relationFieldName: string): FormGroup {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    return this.formControlService.buildUseCaseFormFromEntityType(
      memberType.constructor,
      this.useCaseConfig.useCase!,
    )
  }

  /**
   *
   * @param parentType
   * @param relationFieldName
   * @returns Returns the target composite member "EntityViewLayout" according to
   *              the type of the target member that is subject to
   *              a one to one composite relationship with the parent entity.
   */
  getEntityViewLayout_(
    parentType: T,
    relationFieldName: string,
  ): Observable<EntityViewLayout<unknown>> {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    return memberType.constructor.getEntityViewLayout()
  }

  /**
   *
   * @param parentType
   * @param relationFieldName
   * @returns Returns the target composite member "EntityUseCaseViewLayout" according to
   *              the type of the target member that is subject to
   *              a one to one composite relationship with the parent entity.
   */
  getCompositeRelationUseCaseViewLayout(
    parentType: T,
    relationFieldName: string,
  ): Observable<EntityViewLayout<unknown>> {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    return memberType.constructor.getUseCaseViewLayout(this.useCaseConfig.useCase)
  }

  getCompositeRelationEntityUseCaseConfig(
    parentType: T,
    relationFieldName: string,
  ): UseCaseConfig<T> {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    const relationValue = this.evaluateExpression(
      this.useCaseConfig.entity as any,
      relationFieldName,
    )
    const targetCompositeRelationId = this.getCompositeRelationId(relationValue, memberType)
    return {
      componentAppearance: 'outline',
      iconLayout: 'component',
      entity: targetCompositeRelationId,
      entityType: memberType,
      isRelationView: true,
      useCase: this.useCaseConfig.useCase,
      onLoadCallback: memberType.constructor.onLoadCompositeCallback,
    }
  }

  getCollectionRelationEntityUseCaseConfig(
    parentType: T,
    relationFieldName: string,
  ): UseCaseConfig<any> {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    const ids = this.evaluateExpression(this.useCaseConfig.entity as any, relationFieldName)
    const targetIDs = this.getIdsCollection(memberType, ids)
    return {
      entity: targetIDs,
      entityType: memberType,
      isRelationView: true,
      useCase: this.useCaseConfig.useCase,
      onLoadCallback: memberType.constructor.onLoadCollectionCallback,
    }
  }

  resetTableReloadData(resetReloadData: boolean) {
    if (resetReloadData) {
      this.reloadData = false
    }
  }

  onDeleteRelationCollectionItem(deleteRelationCollectionEventData: {
    itemSubjectToAction: any
    relationName: string
  }) {
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.privateParentEntityType,
      deleteRelationCollectionEventData.relationName,
    )
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)
    const resultingItemIds = (
      this.evaluateExpression(
        this.useCaseConfig.entity as any,
        deleteRelationCollectionEventData.relationName,
      ) as Array<any>
    ).filter((item) => {
      if (TypeScriptTypeMetaDatatHandler.instance.isSimpleType(item)) {
        return item !== deleteRelationCollectionEventData.itemSubjectToAction[id_name]
      } else {
        return item[id_name] !== deleteRelationCollectionEventData.itemSubjectToAction[id_name]
      }
    })

    //// resulting Items are of described as string[] ("id1", "id2", "id3"...)
    //// the target composite relation collection items
    //// should follow this pattern [{_entityId: string}] (ex. [{"_entityId": "id1"},{"_entityId": "id2"},{"_entityId": "id3"}...])
    //// therefore an additional transformation is required here:

    let resultingItemIdsForUpdate = this.transforCompositeEntitiesIDS(resultingItemIds, id_name)

    const relationName = deleteRelationCollectionEventData.relationName

    let useCaseEntity = this.useCaseConfig.entity
    useCaseEntity[relationName] = resultingItemIds ?? null

    /// Update the useCaseConfig Entity by removing the deleted collectio ids:
    /// this update will be the starting point from which the table data
    /// will be refreshed according to the resulted collection values after the deletion
    this.useCaseConfig = {
      componentAppearance: this.useCaseConfig.componentAppearance,
      iconLayout: this.useCaseConfig.iconLayout,
      entity: useCaseEntity,
      entityType: this.useCaseConfig.entityType,
      useCase: this.useCaseConfig.useCase,
    }

    this.reloadData = true
    this.isFormModified = true
    this.isCompositeRelationModified = true
    /**
     * updateRelationCollection: emits the deletion event with the following parameters:
     *  - action: UseCaseAction =
     *      * 'DELETE' : in case of delete from relation collection use case
     *      * 'ADD'    : in case of add to relation collection use case
     *  - actionEventData: the data subject to the action event
     *      * itemSubjectToAction: the object to be deleted (itemSubjectToAction._entityId will be used to splice the collection)
     *      * relationName: parent => collection relation name (ex. "roles" as User=>Roles relation): will be used to update the parent entity with the resulting collection
     *      * formattedIdsSubjectToAction: formatted ids subject to the action:  from ("id1, "id2", "id3") to ===> [{"_entityId": "id1"}, {"_entityId": "id2"}, {"_entityId": "id3"}]
     *  - remainingIdsCollection: a collections of remaining entities Ids after entity Item deletion
     *
     *    {
     *        action: UseCAseAction,
     *        actionEventData: {itemSubjectToAction: any, relationName: string, formattedIdsSubjectToAction: [{_entityId: string}] },
     *        remainingIdsCollection: string[]
     *    }
     */

    let entityAlteredRelationEventData: EntityAlteredRelationEventData = {
      action: UseCaseAction.DELETE,
      actionEventData: {
        itemSubjectToAction: deleteRelationCollectionEventData.itemSubjectToAction,
        relationName: deleteRelationCollectionEventData.relationName,
        formattedIdsSubjectToAction: this.transforCompositeEntitiesIDS(
          [deleteRelationCollectionEventData.itemSubjectToAction[id_name]],
          id_name,
        ),
      },
      resultingItemIdsCollection: resultingItemIdsForUpdate, //as {_entityId: string}[]
    } as EntityAlteredRelationEventData

    this.updateRelationCollection(entityAlteredRelationEventData)
  }

  onAddRelationCollectionItem(
    /*AddRelationCollectionItemEventData: {itemSubjectToAction: any, relationName: string}*/
    relationFieldName: string,
  ) {
    let currentIdsExtractedFromTheRelation = this.evaluateExpression(
      this.useCaseConfig.entity,
      relationFieldName,
    ) as Array<any>
    if (
      currentIdsExtractedFromTheRelation === null ||
      currentIdsExtractedFromTheRelation === undefined
    ) {
      currentIdsExtractedFromTheRelation = []
    }
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.privateParentEntityType,
      relationFieldName,
    )
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)

    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: memberType,
      compositeObject: { value: new memberType.constructor(), type: memberType.constructor.name },
      onLoadWithCriteriaCallback: memberType.constructor.onLoadCollectionByCriteriaCallback,
      callBackCriteria: this.getCallBackIdsCriteria(
        memberType,
        this.getIdsCollection(memberType, currentIdsExtractedFromTheRelation),
      ),
      viewLayout: {
        useCase: UseCase.SELECTABLE_SEARCH_RESULT_TABLE,
      },
    }

    const viewConfig: AverosViewConfig =
      this.viewLayoutService.buildAverosDialogViewConfig(averosDialogViewConfig)
    this.genericDialog.data = viewConfig
    const dialogRef = this.dialog.open(AverosDynamicDialogComponent, this.genericDialog)

    this.dialogSubscription = dialogRef
      .afterClosed()
      .pipe(filter((entity) => entity)) // perform on none null values
      .subscribe((addedEntity: any) => {
        if (
          typeof addedEntity === 'boolean' ||
          (addedEntity instanceof Array && addedEntity.length === 0) ||
          addedEntity === undefined ||
          addedEntity === null
        ) {
          this.dialogSubscription.unsubscribe()
          return
        }
        let idsSubjectToAction: any[] = []
        if (addedEntity instanceof Array) {
          addedEntity.forEach((element) => idsSubjectToAction.push(element[id_name]))
        } else {
          idsSubjectToAction.push(addedEntity[id_name])
        }
        // add the new entities to the previous collection
        let resultingItemIds = currentIdsExtractedFromTheRelation.concat(idsSubjectToAction)

        /// Update the useCaseConfig Entities (add the requested collection entity ids)
        /// by adding the added collection ids:
        /// this update will be the starting point from which the table data
        /// will be refreshed according to the resulted collection values after the add

        let useCaseEntity = this.useCaseConfig.entity as any

        if (!useCaseEntity[relationFieldName]) {
          Object.defineProperty(useCaseEntity, relationFieldName, { writable: true })
          useCaseEntity[relationFieldName] = resultingItemIds ?? null
        } else {
          useCaseEntity[relationFieldName] = resultingItemIds ?? null
        }

        this.useCaseConfig = {
          componentAppearance: this.useCaseConfig.componentAppearance,
          iconLayout: this.useCaseConfig.iconLayout,
          entity: useCaseEntity,
          useCase: this.useCaseConfig.useCase,
        }

        let entityAlteredRelationEventData: EntityAlteredRelationEventData = {
          action: UseCaseAction.ADD,
          actionEventData: {
            itemSubjectToAction: null,
            relationName: relationFieldName,
            formattedIdsSubjectToAction: this.transforCompositeEntitiesIDS(
              idsSubjectToAction,
              id_name,
            ),
          },
          resultingItemIdsCollection: this.transforCompositeEntitiesIDS(
            resultingItemIds,
            id_name,
          ) as object[],
        } as EntityAlteredRelationEventData
        /// trigger table reload
        this.reloadData = true

        /// trigger form modified
        this.isFormModified = true
        this.isCompositeRelationModified = true

        this.updateRelationCollection(entityAlteredRelationEventData)
        this.dialogSubscription.unsubscribe()
      })
  }

  transforCompositeEntitiesIDS(resultingItems: string[], idName: string): object[] {
    //return {idName: string}[]
    return resultingItems.map((element) => {
      let el = {}
      el[idName] =
        typeof element === 'string' || typeof element === 'number' ? element : element[idName]
      return el
    })
  }

  private getCallBackIdsCriteria(memberType: any, ids: any[]): SearchInputCriteria {
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)

    let criteria = {}
    criteria[id_name] = {
      entityAccessor: id_name,
      entityValue: ids,
      operator: AverosSearchOperator.OPER_NOT_IN_ELEMENTS,
    }
    return new SearchInputCriteria(criteria)
  }

  /**
   * extracts the ids under the form of ['id1', 'id2', 'id3'...]
   *
   * @param memberType
   *
   * @param ids
   * @returns
   */
  private getIdsCollection(memberType: any, ids: any): any {
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)
    if (ids instanceof Array && ids.length > 0) {
      return ids.map((e) => {
        if (typeof e === 'string' || typeof e === 'number') {
          return e
        } else {
          return e[id_name]
        }
      })
    }
    return []
  }

  private getCompositeRelationId(relationValue: any, memberType: any): any {
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)
    if (typeof relationValue === 'string') {
      return relationValue
    } else {
      return relationValue[id_name]
    }
  }
}
