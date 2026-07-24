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
import { ToDoTask } from '../../../model/to-do-task'
import { ToDoTaskService } from '../../../service/to-do-task-service.service'
import { AverosSearchEntityComponent } from '@averos/ui-platform/view/components/view-components/averos-search-entity/averos-search-entity.component'
import { AverosDynamicDialogComponent } from '@averos/ui-platform/view/components/view-components/averos-dynamic-dialog/averos-dynamic-dialog.component'
import { PageEvent } from '@angular/material/paginator'
import {
  AlertService,
  AverosDialogViewConfig,
  AverosViewConfig,
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
  selector: 'app-search-to-do-task-component',
  templateUrl: './search-to-do-task.component.html',
  styleUrls: ['./search-to-do-task.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SearchToDoTaskComponent extends SearchUseCase<ToDoTask> implements OnInit, OnDestroy {
  @ViewChild(AverosSearchEntityComponent, { static: true })
  averosSearchEntity!: AverosSearchEntityComponent<ToDoTask>

  entityViewLayout = ToDoTask.getEntityViewLayout()
  searchInputFormGoup: FormGroup

  searchUseCaseViewLayout = ToDoTask.getUseCaseViewLayout(UseCase.SEARCH_INPUT)
  useCaseConfig: UseCaseConfig<ToDoTask> = {
    componentAppearance: 'outline',
    iconLayout: 'component',
    entityType: ToDoTask,
    entity: undefined,
  }
  showSearchResult = false
  searchCriteria!: SearchInputCriteria
  tableValues$!: Observable<ToDoTask[] | PaginatedData<ToDoTask> | null>
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
    objectSubjectToAction: ToDoTask,
    avConfig: AverosViewConfig,
  ): Observable<ToDoTask | null> => {
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
    private entityService: ToDoTaskService,
    private formControlService: FormControlService,
    private alertService: AlertService,
    public dialog: MatDialog,
    private router: Router,
    private viewLayoutService: ViewLayoutService,
    private route: ActivatedRoute,
  ) {
    super()
    this.searchInputFormGoup = this.formControlService.buildUseCaseFormFromEntityType(
      ToDoTask,
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
        '/todotasks/edit',
        entity[TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)],
      ],
      navigationExtras,
    )
  }

  delete(valueToBeDeleted: IndexableType<ToDoTask>) {
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService
      .deleteEntity((valueToBeDeleted as any)[idName])
      .subscribe({
        next: (deletedEntity: ToDoTask | null) => {
          this.alertService
            .success($localize`:@@uc.delete.entity:Entity ${valueToBeDeleted[TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(this.useCaseConfig.entityType)]}:entity:
                has been deleted successfully`)
          this.tableValues$ = this.tableValues$.pipe(
            map((e) => {
              if (e instanceof Array) {
                return e.filter((el: Indexable) => el[idName] !== valueToBeDeleted[idName])
              } else {
                let paginatedData = e as PaginatedData<ToDoTask>
                paginatedData.data = paginatedData.data.filter(
                  (el: Indexable) => el[idName] !== valueToBeDeleted[idName],
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

  deleteMany(valuesToBeDeleted: ToDoTask[]) {
    const idName = TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
    this.deleteSubscription = this.entityService.deleteMany(valuesToBeDeleted).subscribe({
      next: (deletedEntities: ToDoTask[] | null) => {
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
                (el: Indexable) =>
                  deletedEntities.findIndex((e: Indexable) => e[idName] === el[idName]) < 0,
              )
            } else {
              let paginatedData = e as PaginatedData<ToDoTask>
              paginatedData.data = paginatedData.data.filter(
                (el: Indexable) =>
                  deletedEntities.findIndex((e: Indexable) => e[idName] === el[idName]) < 0,
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
      objectClass: ToDoTask.instanceMetadata(),
      compositeObject: { value: ToDoTask.instanceMetadata(), type: 'ToDoTask' },
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
        '/todotasks/view/',
        entity[TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)],
      ],
      navigationExtras,
    )
  }

  /**
   * This function handles a one-to-one and one-to-many relationships in a view composite relation use case
   * Please do not modify or update the function structure since it's is auto-updated when including additional entity members
   */
  viewCompositeObject(compositeObject: { value: unknown; type: string; compositeType?: string }) {
    let averosDialogViewConfig: AverosDialogViewConfig = {
      objectClass: null, ////example User (type not string)
      compositeObject: compositeObject,
      onSubmitCallback: (a: any, b: any) => {},
      onLoadCallback: undefined,
      viewLayout: { useCase: null, editMode: false, canActivateEditMode: false },
    }

    if (compositeObject?.compositeType === 'collection') {
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
