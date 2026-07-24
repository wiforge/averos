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

import { AverosSearchEntityComponent } from '@averos/ui-platform/view/components/view-components/averos-search-entity/averos-search-entity.component'
import { AverosDynamicDialogComponent } from '@averos/ui-platform/view/components/view-components/averos-dynamic-dialog/averos-dynamic-dialog.component'

import { Observable, of, Subscription } from 'rxjs'
import { map } from 'rxjs/operators'
import { CompositeTestEntity } from '../../../model/composite-test-entity'
import { CompositeTestEntityService } from '../../../service/composite-test-entity-service.service'
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
  selector: 'app-search-composite-test-entity-component',
  templateUrl: './search-composite-test-entity.component.html',
  styleUrls: ['./search-composite-test-entity.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchCompositeTestEntityComponent
  extends SearchUseCase<CompositeTestEntity>
  implements OnInit, OnDestroy
{
  @ViewChild(AverosSearchEntityComponent, { static: true })
  averosSearchEntity!: AverosSearchEntityComponent<CompositeTestEntity>

  entityViewLayout = CompositeTestEntity.getEntityViewLayout()
  searchInputFormGoup: FormGroup

  searchUseCaseViewLayout = CompositeTestEntity.getUseCaseViewLayout(UseCase.SEARCH_INPUT)
  useCaseConfig: UseCaseConfig<CompositeTestEntity> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entityType: CompositeTestEntity,
    entity: undefined,
  }
  showSearchResult = false
  searchCriteria!: SearchInputCriteria
  tableValues$!: Observable<CompositeTestEntity[] | PaginatedData<CompositeTestEntity> | null>
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
    objectSubjectToAction: CompositeTestEntity,
    avConfig: AverosViewConfig,
  ): Observable<CompositeTestEntity | null> => {
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
    private entityService: CompositeTestEntityService,
    private formControlService: FormControlService,
    private alertService: AlertService,
    public dialog: MatDialog,
    private router: Router,
    private viewLayoutService: ViewLayoutService,
    private route: ActivatedRoute,
  ) {
    super()
    this.searchInputFormGoup = this.formControlService.buildUseCaseFormFromEntityType(
      CompositeTestEntity,
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
    this.router.navigate(
      [
        '/compositetestentitys/edit',
        entity[TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)],
      ],
      navigationExtras,
    )
  }

  delete(valueToBeDeleted: IndexableType<CompositeTestEntity>) {
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService
      .deleteEntity(
        valueToBeDeleted[idName] as string | CompositeTestEntity | Partial<CompositeTestEntity>,
      )
      .subscribe({
        next: (deletedEntity: CompositeTestEntity | null) => {
          if (!deletedEntity) {
            return
          }
          this.alertService
            .success($localize`:@@uc.delete.entity:Entity ${valueToBeDeleted[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                has been deleted successfully`)
          this.tableValues$ = this.tableValues$.pipe(
            map((e) => {
              if (e instanceof Array) {
                return e.filter((el) => (el as Indexable)[idName] !== valueToBeDeleted[idName])
              } else {
                let paginatedData = e as PaginatedData<CompositeTestEntity>
                paginatedData.data = paginatedData.data.filter(
                  (el) => (el as Indexable)[idName] !== (valueToBeDeleted as any)[idName],
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

  deleteMany(valuesToBeDeleted: (CompositeTestEntity | undefined)[]) {
    if (valuesToBeDeleted === undefined) {
      return
    }
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService
      .deleteMany(valuesToBeDeleted as CompositeTestEntity[])
      .subscribe({
        next: (deletedEntities: CompositeTestEntity[] | null) => {
          if (!deletedEntities) {
            return
          }
          this.alertService.success(
            $localize`:@@uc.delete.many:All records has been deleted successfully`,
          )
          this.tableValues$ = this.tableValues$.pipe(
            map((e) => {
              if (e instanceof Array) {
                return e.filter(
                  (el) =>
                    deletedEntities.findIndex(
                      (e) => (e as Indexable)[idName] === el[idName as keyof CompositeTestEntity],
                    ) < 0,
                )
              } else {
                let paginatedData = e as PaginatedData<CompositeTestEntity>
                paginatedData.data = paginatedData.data.filter(
                  (el) =>
                    deletedEntities.findIndex(
                      (e) =>
                        e[idName as keyof CompositeTestEntity] ===
                        el[idName as keyof CompositeTestEntity],
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

  search(event: any) {
    this.tableValues$ = this.entityService.getEntitiesByCriteria(event)
  }

  add(entity: any) {
    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: CompositeTestEntity.instanceMetadata(),
      compositeObject: {
        value: CompositeTestEntity.instanceMetadata(),
        type: 'CompositeTestEntity',
      },
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
    this.router.navigate(
      [
        '/compositetestentitys/view/',
        entity[TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)],
      ],
      navigationExtras,
    )
  }

  /**
   * This function handles a one-to-one and one-to-many relationships in a view composite relation use case
   * Please do not modify or update the function structure since it's is auto-updated when including additional entity members
   */
  viewCompositeObject(compositeObjectMetaData: EntityMetaData) {
    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: null,
      compositeObject: compositeObjectMetaData,
      onSubmitCallback: (a: any, b: any) => {},
      onLoadCallback: undefined,
      viewLayout: { useCase: null, editMode: false, canActivateEditMode: false },
    }

    if (compositeObjectMetaData?.compositeType === 'collection') {
      /// handles One-To-Many relationship if any
    } else {
      averosDialogViewConfig.viewLayout.useCase = UseCase.VIEW
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
    this.tableValues$ = this.entityService.getEntitiesByCriteria(this.searchCriteria, true)
  }
}
