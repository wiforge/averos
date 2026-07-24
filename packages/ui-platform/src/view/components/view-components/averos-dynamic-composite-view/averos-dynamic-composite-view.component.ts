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
  EventEmitter,
  OnDestroy,
} from '@angular/core'
import { FormGroup } from '@angular/forms'
import { Observable, Subscription } from 'rxjs'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog'
import { filter } from 'rxjs/operators'
import { AverosDynamicDialogComponent } from '../averos-dynamic-dialog/averos-dynamic-dialog.component'
import {
  AverosDialogViewConfig,
  AverosSearchOperator,
  EntityAlteredRelationEventData,
  EntityViewLayout,
  FormControlService,
  Indexable,
  SearchInputCriteria,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseAction,
  UseCaseConfig,
  UseCaseViewLayout,
  ViewLayoutService,
} from '@averos/core'

@Component({
  selector: 'averos-dynamic-composite-view',
  templateUrl: './averos-dynamic-composite-view.component.html',
  styleUrls: ['./averos-dynamic-composite-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosDynamicCompositeViewComponent<T extends Indexable> implements OnInit, OnDestroy {
  private useCaseConfigP!: UseCaseConfig<T>
  @Input() set useCaseConfig(useCaseConfig: UseCaseConfig<T>) {
    this.useCaseConfigP = useCaseConfig
    // to reload the table data use case if any
    this.reloadData = true
    if (useCaseConfig.entityType) {
      this.idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(useCaseConfig.entityType)
    }
  }
  get useCaseConfig(): UseCaseConfig<T> {
    return this.useCaseConfigP
  }

  @Input() editModeActivated
  @Input() reactiveForm!: FormGroup
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Output() isFormModified: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() isCompositeRelationModified: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() onCompositeRelationActionEvent: EventEmitter<any> = new EventEmitter<any>()

  idName
  /**
   * The events will update the relation collection while in an EDIT/UPDATE/CREATE view
   * the related event could be either DELETE or ADD
   */
  @Output() updateRelationCollection: EventEmitter<EntityAlteredRelationEventData> =
    new EventEmitter<EntityAlteredRelationEventData>()

  reloadData: boolean = false
  privateParentEntityType!: T
  dialogSubscription!: Subscription
  private genericDialog = new MatDialogConfig()

  constructor(
    private formControlService: FormControlService,
    public dialog: MatDialog,
    private viewLayoutService: ViewLayoutService,
  ) {}
  ngOnDestroy(): void {
    this.dialogSubscription?.unsubscribe()
  }

  ngOnInit(): void {}

  formModified(event: any) {
    this.isFormModified.emit(event)
  }

  get useCase() {
    return UseCase
  }

  // childFormModified(event: any){

  // }

  // Evaluate the related element parameter against the key
  evaluateExpression(parentInstance: T | undefined | null, key: string): any {
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
  getEntityViewLayout(
    parentType: T,
    relationFieldName: string,
  ): Observable<EntityViewLayout<unknown>> {
    this.privateParentEntityType = parentType
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      parentType,
      relationFieldName,
    )
    return memberType?.constructor?.getEntityViewLayout()
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
  ): Observable<UseCaseViewLayout<Indexable> | null> {
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
    const relationValue = this.evaluateExpression(this.useCaseConfig.entity, relationFieldName)
    const targetCompositeRelationId = this.getCompositeRelationId(relationValue, memberType)
    // if (!memberType) throw new Error('memberType counld not be retrieved');
    // if (!targetCompositeRelationId) throw new Error('targetCompositeRelationId counld not be retrieved');
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
    const ids = this.evaluateExpression(this.useCaseConfig.entity, relationFieldName)
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

  onDeleteRelationCollectionItem(
    deleteRelationCollectionEventData: {
      itemSubjectToAction: any
      relationName: string
    },
    emit: boolean = true,
  ) {
    const memberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.privateParentEntityType,
      deleteRelationCollectionEventData.relationName,
    )
    let id_name = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)
    const resultingItemIds = (
      this.evaluateExpression(
        this.useCaseConfig.entity,
        deleteRelationCollectionEventData.relationName,
      ) as Array<any>
    ).filter((item) => {
      if (TypeScriptTypeMetaDatatHandler.instance.isSimpleType(item)) {
        return item !== deleteRelationCollectionEventData.itemSubjectToAction[id_name]
      } else {
        if (item[id_name] !== null && item[id_name] !== undefined) {
          return item[id_name] !== deleteRelationCollectionEventData.itemSubjectToAction[id_name]
        } else {
          return (
            Object.values(item)[0] !==
            deleteRelationCollectionEventData.itemSubjectToAction[id_name]
          )
        }
      }
    })

    //// resulting Items are of described as string[] ("id1", "id2", "id3"...)
    //// the target composite relation collection items
    //// should follow this pattern [{_entityId: string}] (ex. [{"_entityId": "id1"},{"_entityId": "id2"},{"_entityId": "id3"}...])
    //// therefore an additional transformation is required here:

    let resultingItemIdsForUpdate = this.transformToTargetIds(resultingItemIds, id_name)

    const relationName = deleteRelationCollectionEventData.relationName

    let useCaseEntity = (this.useCaseConfig.entity as Indexable)!
    useCaseEntity[relationName] = resultingItemIds ?? null

    /// Update the useCaseConfig Entity by removing the deleted collectio ids:
    /// this update will be the starting point from which the table data
    /// will be refreshed according to the resulted collection values after the deletion
    this.useCaseConfig = {
      componentAppearance: this.useCaseConfig.componentAppearance,
      iconLayout: this.useCaseConfig.iconLayout,
      entity: useCaseEntity as T,
      entityType: this.useCaseConfig.entityType,
      useCase: this.useCaseConfig.useCase,
    }

    this.reloadData = true
    if (emit) {
      this.isFormModified.emit(true)
      this.isCompositeRelationModified.emit(true)
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
          formattedIdsSubjectToAction: this.transformToTargetIds(
            [deleteRelationCollectionEventData.itemSubjectToAction[id_name]],
            id_name,
          ),
        },
        resultingItemIdsCollection: resultingItemIdsForUpdate, //as {_entityId: string}[],
      } as EntityAlteredRelationEventData

      this.updateRelationCollection.emit(entityAlteredRelationEventData)
    }
  }

  onDeleteManyRelationCollectionItem(deleteManyRelationCollectionEventData: {
    itemsSubjectToAction: any[]
    relationName: string
  }) {
    deleteManyRelationCollectionEventData.itemsSubjectToAction.forEach(
      (itemToBeDeleted, index, array) => {
        // Perform action for each item
        this.onDeleteRelationCollectionItem(
          {
            itemSubjectToAction: itemToBeDeleted,
            relationName: deleteManyRelationCollectionEventData.relationName,
          },
          false,
        )

        // Check if it's the last item in the array
        if (index === array.length - 1) {
          // Perform your additional action when it's the last item
          this.onDeleteRelationCollectionItem(
            {
              itemSubjectToAction: itemToBeDeleted,
              relationName: deleteManyRelationCollectionEventData.relationName,
            },
            true,
          )
        }
      },
    )
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
    let business_id_name = TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(memberType)

    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: memberType,
      compositeObject: {
        value: new memberType.constructor(),
        type: memberType.constructor[business_id_name],
      },
      onLoadWithCriteriaCallback: memberType.constructor.onLoadCollectionByCriteriaCallback,
      callBackCriteria: this.getCallBackIdsCriteria(
        memberType,
        this.getIdsCollection(memberType, currentIdsExtractedFromTheRelation),
      ),
      viewLayout: {
        useCase: UseCase.SELECTABLE_SEARCH_RESULT_TABLE,
      },
    }

    const viewConfig = this.viewLayoutService.buildAverosDialogViewConfig(averosDialogViewConfig)
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
        }
        // Set the new IDs
        useCaseEntity[relationFieldName] = resultingItemIds ?? null

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
            formattedIdsSubjectToAction: this.transformToTargetIds(idsSubjectToAction, id_name),
          },
          resultingItemIdsCollection: this.transformToTargetIds(
            resultingItemIds,
            id_name,
          ) as object[],
        } as EntityAlteredRelationEventData
        /// trigger table reload
        this.reloadData = true

        /// trigger form modified
        this.isFormModified.emit(true)
        this.isCompositeRelationModified.emit(true)

        this.updateRelationCollection.emit(entityAlteredRelationEventData)
        this.dialogSubscription.unsubscribe()
      })
  }

  transformToTargetIds(resultingIds: string[], idName: string): unknown[] {
    // return resultingItems.map(element => {
    //                                       let el = {};
    //                                       el[idName] = ((typeof element === 'string') || (typeof element === 'number') ? element : element[idName]);
    //                                       return el;
    //                                     }
    //   );
    if (resultingIds.length > 0) {
      return resultingIds.map((e) => {
        if (typeof e === 'string' || typeof e === 'number') {
          return e
        } else {
          /**
           * if the IdName diferent of the EXTERNAL_ENTITY_ID usually when updating an entity you got
           * relations with EXTERNAL_ENTITY_ID (the api identifier user to identify the child entity).
           * In this case the id would be the first
           */
          if (e[idName] === null || e[idName] === undefined) {
            return Object.values(e)[0]
          } else {
            return e[idName]
          }
        }
      })
    }
    return []
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
  private getIdsCollection(memberType: any, ids: any | { id: string }[]): any {
    let idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(memberType)
    if (ids instanceof Array && ids.length > 0) {
      return ids.map((e) => {
        if (typeof e === 'string' || typeof e === 'number') {
          return e
        } else {
          /**
           * if the IdName diferent of the EXTERNAL_ENTITY_ID usually when updating an entity you got
           * relations with EXTERNAL_ENTITY_ID (the api identifier user to identify the child entity).
           * In this case the id would be the first
           */
          if (e[idName] === null || e[idName] === undefined) {
            return Object.values(e)[0]
          } else {
            return e[idName]
          }
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

  onCompositeRelationAction(entityAlteredRelationEventData: EntityAlteredRelationEventData) {
    this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
    this.isFormModified.emit(true)
    this.isCompositeRelationModified.emit(true)
  }
}
