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

import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core'
import { FormGroup } from '@angular/forms'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog'
import { ActivatedRoute, NavigationExtras, Params, Router } from '@angular/router'

import { Observable, of, Subscription } from 'rxjs'
import { map } from 'rxjs/operators'
import { ToDoArea } from '../../../model/to-do-area'
import { ToDoAreaService } from '../../../service/to-do-area-service.service'
import { AverosSearchEntityComponent } from '@averos/ui-platform/view/components/view-components/averos-search-entity/averos-search-entity.component'
import { AverosDynamicDialogComponent } from '@averos/ui-platform/view/components/view-components/averos-dynamic-dialog/averos-dynamic-dialog.component'
import { PageEvent } from '@angular/material/paginator'
import {
  AlertService,
  AverosDialogViewConfig,
  AverosViewConfig,
  EntityMetaData,
  FormControlService,
  Indexable,
  IndexableType,
  PaginatedData,
  SearchInputCriteria,
  SearchUseCase,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseConfig,
  ViewLayoutService,
} from '@averos/core'

@Component({
  selector: 'app-search-to-do-area-component',
  templateUrl: './search-to-do-area.component.html',
  styleUrls: ['./search-to-do-area.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SearchToDoAreaComponent extends SearchUseCase<ToDoArea> implements OnInit, OnDestroy {
  @ViewChild(AverosSearchEntityComponent, { static: true })
  averosSearchEntity!: AverosSearchEntityComponent<ToDoArea>

  entityViewLayout = ToDoArea.getEntityViewLayout()
  searchInputFormGoup: FormGroup

  searchUseCaseViewLayout = ToDoArea.getUseCaseViewLayout(UseCase.SEARCH_INPUT)
  useCaseConfig: UseCaseConfig<ToDoArea> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entityType: ToDoArea,
    entity: undefined,
  }
  showSearchResult = false
  searchCriteria!: SearchInputCriteria
  tableValues$!: Observable<ToDoArea[] | PaginatedData<ToDoArea> | null>
  private genericDialog = new MatDialogConfig()
  private deleteSubscription!: Subscription

  /**
   *
   * @param objectSubjectToAction
   * @param avConfig
   * @returns the new object
   * This function defines the business logic to perform when when updating an existing object or submitting
   *  a new object
   */
  onAddOrUpateCallback = (
    objectSubjectToAction: ToDoArea,
    avConfig: AverosViewConfig,
  ): Observable<ToDoArea | null> => {
    if (avConfig.useCaseConfig?.useCase === UseCase.CREATE) {
      return this.entityService.createEntity(objectSubjectToAction)
    } else if (
      avConfig.useCaseConfig?.useCase === UseCase.EDIT ||
      avConfig.useCaseConfig?.useCase === UseCase.UPDATE
    ) {
      return this.entityService.updateEntity(avConfig.value)
    }
    return of()
  }
  constructor(
    private entityService: ToDoAreaService,
    private formControlService: FormControlService,
    private alertService: AlertService,
    public dialog: MatDialog,
    private router: Router,
    private viewLayoutService: ViewLayoutService,
    private route: ActivatedRoute,
  ) {
    super()
    this.searchInputFormGoup = this.formControlService.buildUseCaseFormFromEntityType(
      ToDoArea,
      UseCase.SEARCH_INPUT,
    )
  }

  ngOnDestroy(): void {
    this.deleteSubscription?.unsubscribe()
  }

  trackBy(entity: any) {
    return entity[TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)]
  }

  edit(entity: any) {
    let navigationExtras: NavigationExtras = {
      state: {
        usecase: UseCase.EDIT,
      },
    }
    const { idKey, idValue } = this.getEntityIdentifier(entity, this.useCaseConfig.entityType)
    let uri = `/todoareas/edit`
    this.router.navigate([uri, idValue], navigationExtras)
  }

  delete(valueToBeDeleted: IndexableType<ToDoArea>) {
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService.deleteEntity(valueToBeDeleted).subscribe({
      next: (deletedEntity: ToDoArea) => {
        this.alertService
          .success($localize`:@@uc.delete.entity:Entity ${valueToBeDeleted[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                has been deleted successfully`)
        this.tableValues$ = this.tableValues$.pipe(
          map((e) => {
            if (e instanceof Array) {
              return e.filter((el) => (el as any)[idName] !== valueToBeDeleted[idName])
            } else {
              let paginatedData = e as PaginatedData<ToDoArea>
              paginatedData.data = paginatedData.data.filter(
                (el: Indexable) => el[idName] !== (valueToBeDeleted as any)[idName],
              )
              return paginatedData
            }
          }),
        )
        this.deleteSubscription?.unsubscribe()
      },
      error: (err: Error) => {
        console.log(err)
        this.deleteSubscription?.unsubscribe()
      },
    })
  }

  deleteMany(valuesToBeDeleted: ToDoArea[]) {
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService.deleteMany(valuesToBeDeleted).subscribe({
      next: (deletedEntities: ToDoArea[]) => {
        this.alertService.success(
          $localize`:@@uc.delete.entities:All records has been deleted successfully`,
        )
        this.tableValues$ = this.tableValues$.pipe(
          map((e) => {
            if (e instanceof Array) {
              return e.filter(
                (el) =>
                  deletedEntities.findIndex(
                    (e) => e[idName as keyof ToDoArea] === el[idName as keyof ToDoArea],
                  ) < 0,
              )
            } else {
              let paginatedData = e as PaginatedData<ToDoArea>
              paginatedData.data = paginatedData.data.filter(
                (el) =>
                  deletedEntities.findIndex(
                    (e) => e[idName as keyof ToDoArea] === el[idName as keyof ToDoArea],
                  ) < 0,
              )
              return paginatedData
            }
          }),
        )
        this.deleteSubscription?.unsubscribe()
      },
      error: (err: Error) => {
        console.log(err)
        this.deleteSubscription?.unsubscribe()
      },
    })
  }

  reloadData(t: any) {
    this.tableValues$ = this.entityService.getAllEntities()
  }

  search(event: SearchInputCriteria) {
    this.tableValues$ = this.entityService.getEntitiesByCriteria(event)
  }

  add(entity: any) {
    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: ToDoArea.instanceMetadata(),
      compositeObject: { value: ToDoArea.instanceMetadata(), type: 'ToDoArea' },
      onSubmitCallback: this.onAddOrUpateCallback,
      onLoadCallback: undefined,
      viewLayout: {
        useCase: UseCase.CREATE,
        editMode: true,
        canActivateEditMode: true,
      },
    }

    const viewConfig = this.viewLayoutService.buildAverosDialogViewConfig(averosDialogViewConfig)
    this.genericDialog.data = viewConfig
    this.dialog.open(AverosDynamicDialogComponent, this.genericDialog)
  }

  view(entity: any) {
    let navigationExtras: NavigationExtras = {
      state: {
        usecase: UseCase.VIEW,
      },
    }
    const { idKey, idValue } = this.getEntityIdentifier(entity, this.useCaseConfig.entityType)
    let uri = `/todoareas/view/`
    this.router.navigate([uri, idValue], navigationExtras)
  }

  /**
   * This function handles a one-to-one and one-to-many relationships in a view composite relation use case
   * Please do not modify or update the function structure since it is auto-updated when including additional entity members
   */
  viewCompositeObject(compositeObjectMetaData: EntityMetaData) {
    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: null, ////example User (type not string)
      compositeObject: compositeObjectMetaData,
      onSubmitCallback: (a: any, b: any) => {},
      onLoadCallback: undefined,
      viewLayout: { useCase: null, editMode: false, canActivateEditMode: false },
    }
    // retrieve and set the Child class
    averosDialogViewConfig.objectClass =
      this.entityService.MANAGED_ENTITY[
        `get${compositeObjectMetaData.compositeEntityNavigationKey}Type`
      ]()
    // initialize the target use case to view for simple one object
    averosDialogViewConfig.viewLayout.useCase = UseCase.VIEW

    // handles composite collection objects
    if (compositeObjectMetaData?.compositeType === 'collection') {
      // Update the target use case view to a table for multiple composite objects
      averosDialogViewConfig.viewLayout.useCase = UseCase.SEARCH_RESULT_TABLE
      averosDialogViewConfig.onLoadCallback = this.collectionRelationEntitiesCallBack(
        averosDialogViewConfig.objectClass,
      )
    }
    const viewConfig = this.viewLayoutService.buildAverosDialogViewConfig(averosDialogViewConfig)
    this.genericDialog.data = viewConfig
    this.dialog.open(AverosDynamicDialogComponent, this.genericDialog)
  }

  ngOnInit(): void {
    this.initializeEntityDialogs()
    /**
     * get back to the previous search criterias history
     */
    if (window.history.state.searchInputCriteria) {
      this.averosSearchEntity.matExpansionPanel.close()
      this.searchCriteria = new SearchInputCriteria(
        new Map(JSON.parse(window.history.state?.searchInputCriteria?.searchCriteria)),
      )
      this.showSearchResult = true
    }
  }

  searchEntities(searchInputCriteria: SearchInputCriteria) {
    this.showSearchResult = true
    this.searchCriteria = searchInputCriteria

    const queryParams: Params = {
      searchCriteria: JSON.stringify([...this.searchCriteria.getCriteriaMap()]),
    }
    this.router.navigate([], {
      relativeTo: this.route,
      state: {
        searchInputCriteria: queryParams,
      },
    })
  }

  initializeEntityDialogs() {
    this.genericDialog.disableClose = true
    this.genericDialog.autoFocus = false
    this.genericDialog.width = '90%'
    this.genericDialog.height = 'auto'
    this.genericDialog.maxWidth = '100vw'
    this.genericDialog.maxHeight = '100vh'
  }

  onPageChange(pageEvent: PageEvent) {
    // let currentPage = pageEvent.pageIndex;
    // let pagesize = pageEvent.pageSize;

    // // add page and pagesize parameters to the http query
    // this.searchCriteria.addHttpQueryParameters([{key: "page", value: "0"},{key: "pagesize", value: "20"}]);
    this.tableValues$ = this.entityService.getEntitiesByCriteria(this.searchCriteria, true)
  }
}
