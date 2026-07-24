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
  OnDestroy,
  Input,
  ViewChild,
  Output,
  EventEmitter,
  ElementRef,
  ChangeDetectorRef,
  TrackByFunction,
} from '@angular/core'
import { MatTableDataSource } from '@angular/material/table'
import { Subject, Observable, Subscription, of, BehaviorSubject } from 'rxjs'
import { FormGroup, FormBuilder } from '@angular/forms'
import { MatSort } from '@angular/material/sort'
import { MatPaginator, PageEvent } from '@angular/material/paginator'
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  shareReplay,
  takeUntil,
} from 'rxjs/operators'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { MatBottomSheet } from '@angular/material/bottom-sheet'
import { BottomSheetDataExportFormatComponent } from './bottom-sheet-data-export-format/bottom-sheet-data-export-format.component'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { SelectionModel } from '@angular/cdk/collections'

import { MatDialog, MatDialogConfig } from '@angular/material/dialog'

import { AverosGenericTextDialogComponent } from '../averos-generic-text-dialog/averos-generic-text-dialog.component'
import { PaginatorState } from './paginator-state'
import { MatCheckboxChange } from '@angular/material/checkbox'
import {
  AlertService,
  AverosLocalServiceCall,
  AverosSearchOperator,
  DataExporterService,
  DataRetrievalMethod,
  EntityMetaData,
  EntityViewLayout,
  FieldType,
  FileService,
  Indexable,
  PaginatedData,
  RowAction,
  RowActionMetaData,
  SearchInputCriteria,
  ServiceLocator,
  TypeScriptTypeMetaDatatHandler,
  UseCase,
  UseCaseConfig,
  UseCaseViewLayout,
  FieldViewLayout,
} from '@averos/core'

@Component({
  selector: 'averos-dynamic-table',
  templateUrl: './averos-dynamic-table.component.html',
  styleUrls: ['./averos-dynamic-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosDynamicTableComponent<T extends Indexable> implements OnInit, OnDestroy {
  // Show/Hide default actions buttons
  @Input() showRowActions!: boolean

  // Show/Hide custom actions buttons
  @Input() showCustomRowActions: boolean = false

  @Input() customRowActions: RowAction[] = []

  // forces the use of handset layout in small spaces
  @Input() shrinkedLayout: boolean = false

  //enables row selection
  // selectable should be placed at the beginning of the template
  //just before the viewLayout Input member because it is used by the latter and should be
  // already initialized when viewLayout is beeing processed (colums names are calculated in the viewLayout input process)
  @Input() selectable: boolean = false

  @Input() multipleSelection: boolean = true

  @Input() forInput: boolean = false

  // Show/Hide the filter component
  @Input() showFilterComponent!: boolean

  // adds tracking for the data source for faster filtering, and sorting
  @Input() trackByField!: TrackByFunction<T>
  @Input() filterComponentLabel!: string
  @Input() filterComponentLabelTranslationID!: string
  @Input() filterKey!: string

  @Input() set useCaseConfig(useCaseConfig: UseCaseConfig<T>) {
    this.internalUseCaseConfig = useCaseConfig
    if (this.useCaseConfig.useCase === UseCase.VIEW) {
      if (!this.tableColumns.find((col) => col === 'actions')) {
        return
      } else {
        // this.tableColumns = Object.assign([], this.tableColumns.filter(e=>e!='actions'));
        this.tableColumns = this.tableColumns.filter((e) => e != 'actions')
      }
    } else {
      if (this.showRowActions) {
        if (!this.tableColumns.find((col) => col === 'actions')) {
          this.tableColumns.push('actions')
        }
      }
      if (this.showCustomRowActions && this.customRowActions.length > 0) {
        if (!this.tableColumns.find((col) => col === 'custom-actions')) {
          this.tableColumns.push('custom-actions')
        }
      }
    }
  }

  get useCaseConfig(): UseCaseConfig<T> {
    return this.internalUseCaseConfig
  }

  @Output() viewObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() viewCompositeObject: EventEmitter<any> = new EventEmitter<any>()
  @Output() executeCustomRowAction: EventEmitter<any> = new EventEmitter<any>()
  @Output() editObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() deleteObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() addObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() reloadTable: EventEmitter<T> = new EventEmitter<T>()
  @Output() search: EventEmitter<SearchInputCriteria> = new EventEmitter<SearchInputCriteria>()
  @Output() resetReloadData: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() selectOne: EventEmitter<T> = new EventEmitter<T>()
  @Output() selectMany: EventEmitter<T[]> = new EventEmitter<T[]>()
  @Output() deleteMany: EventEmitter<T[]> = new EventEmitter<T[]>()
  @Output() pageChange: EventEmitter<PageEvent> = new EventEmitter<PageEvent>()
  // @Output() exportData: EventEmitter<T> = new EventEmitter<T>();

  @ViewChild(MatPaginator, { static: false }) set matPaginator(paginator: MatPaginator) {
    this.matPaginatorState.pageSize = paginator.pageSize
  }

  // add ViewChild support fot the table column sorting
  // allows us to register the table column sorting with the Mat Table
  @ViewChild(MatSort, { static: false }) set matSort(sort: MatSort) {
    this.dataSource.sort = sort
  }

  @ViewChild('dynamicTable') dynamicTable!: ElementRef

  @ViewChild('filterComponent') filterComponent!: ElementRef<HTMLInputElement>

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay(),
  )

  // build the filter form group
  // add a entry for the user to enter filter text
  filtertableFormGoup: FormGroup = this.filterGroup.group({
    filter: [null, null],
  })

  private internalUseCaseConfig: UseCaseConfig<T> = {
    useCase: UseCase.SEARCH_RESULT_TABLE,
  }
  private matTableDataSource: MatTableDataSource<T> = new MatTableDataSource<T>()
  private unsubscribe$ = new Subject<void>()
  private tableDataSubscription!: Subscription
  private bottomSheetSubscription = new Subscription()
  private dataRetrievalSubscription!: Subscription

  private matPaginatorState: PaginatorState = new PaginatorState(5)

  FieldType = FieldType // exposes the FieldType enum to the template

  private cachedData: any[] = []

  protected isGridLoading: boolean = false

  ucVLayout!: UseCaseViewLayout<T>

  get dataSource(): MatTableDataSource<T> {
    return this.matTableDataSource
  }

  private tableColumns!: string[]

  private genericDialog = new MatDialogConfig()

  // Track the subscription for the internal data stream
  private internalDataSubject = new BehaviorSubject<T[] | PaginatedData<T> | null>([])

  // Track the subscription for the external data stream
  private _externalDataSubscription!: Subscription

  // The new API to accept the stream directly.
  // This replaces the need for the parent to use the | async pipe.
  @Input() set dataSource$(obs: Observable<T[] | PaginatedData<T> | null>) {
    if (this._externalDataSubscription) {
      this._externalDataSubscription.unsubscribe()
    }

    if (!obs) {
      this.internalDataSubject.next([])
      return
    }

    // Activate Loading immediately
    this.isGridLoading = true
    this.cdr.markForCheck()

    // Subscribe to the external observable and push to internal BehaviorSubject
    this._externalDataSubscription = obs
      .pipe(
        // Handle Errors Internally
        catchError((err) => {
          console.error('Grid Data Error:', err)
          this.alertService.error(
            $localize`:@@error.serviceUnreachable:Failed to load resources! the requested service is unreachable.`,
          )
          return of([]) // Return empty data so the table doesn't break
        }),
        // Finalize: Runs on Success AND Error
        finalize(() => {
          this.isGridLoading = false
          // Critical for OnPush strategy: tell Angular to check the view
          this.cdr.markForCheck()
        }),
      )
      .subscribe((result) => {
        // Push new data to the internal BehaviorSubject
        // This triggers the internal subscription and updates the table
        this.internalDataSubject.next(result)
      })
  }

  // The new implementation introduces dataSource$ which is an observable and replaces data
  // data is kept for backward compatibility
  @Input() set data(data: T[] | PaginatedData<T>) {
    this.updateTableData(data)
    this.cdr.markForCheck()
  }

  @Input() set reloadData(reloadData: boolean) {
    if (reloadData) {
      this.loadData()
      this.resetReloadData.emit(true)
    }
  }

  get alertservice() {
    return AlertService
  }

  private componentViewLayout?: EntityViewLayout<T> = undefined

  @Input() set viewLayout(viewLayout: EntityViewLayout<T>) {
    if (!!viewLayout && viewLayout !== undefined) {
      this.componentViewLayout = viewLayout
    }

    const col = new Array<string>()
    if (this.selectable) {
      col.push('select')
    }
    // sort the rows by order
    if (this.componentViewLayout) {
      if (this.useCaseConfig.useCase === UseCase.SEARCH_RESULT_TABLE) {
        this.ucVLayout = this.componentViewLayout?.tableUCViewLayout!
      } else if (this.useCaseConfig.useCase === UseCase.SELECTABLE_SEARCH_RESULT_TABLE) {
        this.ucVLayout = this.componentViewLayout?.selectableInputTableUCViewLayout!
      }
      for (const fieldViewLayout of this.ucVLayout?.ucViewLayout?.slice()?.sort((a, b) => {
        const evalA = TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(a, 'order')
        const evalB = TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(b, 'order')
        if (
          !evalA ||
          !evalB ||
          evalA === null ||
          evalB === null ||
          evalA === undefined ||
          evalB === undefined ||
          evalA === '' ||
          evalB === ''
        ) {
          return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
        }
        if (evalA > evalB) {
          return 1
        }
        if (evalA < evalB) {
          return -1
        }
        {
          return JSON.stringify(a) < JSON.stringify(b) ? -1 : 1
        }
      })) {
        if (fieldViewLayout.visible) {
          col.push(fieldViewLayout.entityFieldName)
        }
      }
    }

    this.tableColumns = col
    if (this.showRowActions && this.useCaseConfig.useCase !== UseCase.VIEW) {
      this.tableColumns.push('actions')
    }
    if (
      this.showCustomRowActions &&
      this.customRowActions.length > 0 &&
      this.useCaseConfig.useCase !== UseCase.VIEW
    ) {
      this.tableColumns.push('custom-actions')
    }
  }

  get viewLayout(): EntityViewLayout<T> {
    return this.componentViewLayout!
  }

  get columns(): string[] {
    // return a string array of the columns in the table
    // the order of these values will be the order your columns show up in
    return this.tableColumns
  }

  selection = new SelectionModel<T>(true, [])

  constructor(
    private filterGroup: FormBuilder,
    public dialog: MatDialog,
    private bottomSheetExportFormat: MatBottomSheet,
    private dataExporterService: DataExporterService<T>,
    private alertService: AlertService,
    private breakpointObserver: BreakpointObserver,
    private fileService: FileService,
    private cdr: ChangeDetectorRef,
  ) {
    this.cachedData = []
    this.matTableDataSource.data = []
    // Ensure paginator state is initialized
    if (!this.matPaginatorState) {
      this.matPaginatorState = new PaginatorState(5)
    }
  }

  ngOnDestroy(): void {
    // when the component is destroyed, call to _unsubscribe
    // this will stop any active listeners on the component and free up resources
    this.unsubscribe$.next()
    this.unsubscribe$.complete()
    this.bottomSheetSubscription.unsubscribe()
    this.dataSource.data = []
    this.tableDataSubscription?.unsubscribe()
    this.dataRetrievalSubscription?.unsubscribe()
    if (this._externalDataSubscription) {
      this._externalDataSubscription.unsubscribe()
    }
    // Internal subscription cleaned by takeUntil(this.unsubscribe$)
  }

  get notificationService() {
    return this.alertService
  }

  get usecase() {
    return UseCase
  }

  ngOnInit(): void {
    this.initializeFilterComponent()

    // Subscribe to internal BehaviorSubject
    // This ensures any data pushed to the subject updates the table
    this.internalDataSubject
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError((err) => {
          console.error('Internal data processing error:', err)
          return of([])
        }),
      )
      .subscribe({
        next: (data) => {
          this.updateTableData(data)
          this.cdr.markForCheck()
        },
      })

    this.loadData()
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.columns, event.previousIndex + 1, event.currentIndex + 1)
  }

  resetData() {
    this.matTableDataSource.data = []
  }

  // Initialize and load data
  loadData(): void {
    this.isGridLoading = true
    this.cdr.markForCheck()
    //this.useCaseConfig is optional and could be null for regular table use cases
    // this input parameter should not be null in relationship view use cases
    if (
      (this.useCaseConfig.isRelationView || this.useCaseConfig.asyncRetrieval) &&
      this.useCaseConfig?.onLoadCallback &&
      this.useCaseConfig?.useCase !== UseCase.CREATE
    ) {
      if (this.useCaseConfig.entity instanceof Array && this.useCaseConfig.entity.length === 0) {
        // this.matTableDataSource.data = [];
        this.updateTableData([])
        this.isGridLoading = false
        this.cdr.markForCheck()
      } else {
        this.tableDataSubscription = this.useCaseConfig
          ?.onLoadCallback(this.useCaseConfig.entity) /// this.useCaseConfig.entity holds the collection child entities IDs
          ?.subscribe({
            next: (loadedEntities: T[] | PaginatedData<T>) => {
              this.updateTableData(loadedEntities)
              this.isGridLoading = false
              this.cdr.markForCheck()
            },
            error: (err: Error) => {
              console.log(err)
              this.isGridLoading = false
              this.cdr.markForCheck()
            },
          })
      }
    }
  }

  initializePaginatorState(pageSize: number) {
    if (this.matPaginatorState === null) {
      this.matPaginatorState = new PaginatorState(pageSize)
    }
    this.matPaginatorState.resetState(pageSize)
    //initialize cache
    this.cachedData = []
  }

  /**
   * Initialize filter component
   */
  initializeFilterComponent() {
    // do nothing if there is no filter to be displayed
    if (!this.showFilterComponent) {
      return
    }

    // Subscribe to filter value changes with proper RxJS operators
    this.filtertableFormGoup.controls.filter.valueChanges
      .pipe(
        debounceTime(300), // ← CHANGED: 300ms is more user-friendly (was 50ms)
        distinctUntilChanged(), // Only emit when value actually changes
        takeUntil(this.unsubscribe$), // Cleanup on destroy
      )
      .subscribe({
        next: (value: string) => {
          this.applyFilter(value)
        },
        error: (err) => {
          console.error('Filter error:', err)
          // Optionally show error notification to user
          this.alertService.error('app.notification.error.filter_failed')
        },
      })
  }

  /**
   * Apply filter to the data source
   * Separated into its own method for better testability and reusability
   */
  private applyFilter(filterValue: string): void {
    // Handle null/undefined/empty cases
    if (filterValue === null || filterValue === undefined) {
      this.dataSource.filter = ''
      this.cdr.markForCheck()
      return
    }

    // Handle empty string - clear filter
    if (filterValue.trim() === '') {
      this.dataSource.filter = ''
      this.cdr.markForCheck()
      return
    }

    // Validate data source exists and has data
    if (!this.dataSource || !this.dataSource.data) {
      console.warn('Cannot apply filter: data source not initialized')
      return
    }

    // Apply normalized filter value
    const normalizedFilter = filterValue.trim().toLowerCase()
    this.dataSource.filter = normalizedFilter

    // Reset to first page when filter changes (optional but recommended)
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage()
    }

    // Trigger change detection for OnPush strategy
    this.cdr.markForCheck()
  }

  // Evaluate the related element parameter against the key
  evaluateExpression(element: T, key: string, defaultValue?: any): any {
    return TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(element, key, defaultValue)
  }

  evaluateCompositeRelationValue(element: T, key: string): any {
    let businessIdName = this.getCompositeRelationEntityBusinessIdName(key)
    let compositeEntity = TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(element, key)
    // If entity id then return some of the ID
    if (typeof compositeEntity === 'string') {
      return compositeEntity.length <= 7
        ? compositeEntity
        : compositeEntity.substring(compositeEntity.length - 7, compositeEntity.length)
    } else {
      return TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(
        element,
        `${key}.${businessIdName}`,
      )
    }
  }
  getCompositeRelationEntityBusinessIdName(compositeRelationNavigationKey) {
    let compositeMemberType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.componentViewLayout!.entityClass,
      compositeRelationNavigationKey,
    )
    let name = TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(compositeMemberType)
    return name
  }

  _onPreviewImage(image: string) {
    console.log('TO BE IMPLEMENTED')
  }

  displayTextArea(text: string, title: string, titleTranslationID: string) {
    const viewConfig = {
      useCaseConfig: {
        customUseCaseMetaData: {
          data: text,
          title: title,
          titleTranslationID: titleTranslationID,
        },
        useCase: UseCase.DISPLAY_SIMPLE_TEXT,
      },
    }
    this.genericDialog.data = viewConfig
    this.dialog.open(AverosGenericTextDialogComponent, this.genericDialog)
  }

  viewCompositeEntity(
    entityMetaData: EntityMetaData /*{compositeEntityNavigationKey?: string, value: any, type: string, compositeType?: string}*/,
  ) {
    this.viewCompositeObject.emit(entityMetaData)
  }

  executeCustomAction(actionMetaData: RowActionMetaData) {
    this.executeCustomRowAction.emit(actionMetaData)
  }

  onAddObject(event: any) {
    this.addObject.emit(event)
  }

  onReload(event: any) {
    this.resetData()
    this.reloadTable.emit(event)
  }

  onExportData(format: string) {
    switch (format) {
      case 'excel': {
        this.dataExporterService.exportData(
          this.dynamicTable.nativeElement,
          'excel',
          `Exported_excel__${new Date().toISOString()}`,
        )
        break
      }
      case 'csv': {
        this.dataExporterService.exportData(
          this.matTableDataSource.data,
          'csv',
          `Exported_CSV__${new Date().toISOString()}`,
        )
        break
      }
      case 'txt': {
        this.dataExporterService.exportData(
          this.matTableDataSource.data,
          'txt',
          `Exported_txt__${new Date().toISOString()}`,
        )
        break
      }
      case 'pdf': {
        this.dataExporterService.exportData(
          this.matTableDataSource.data,
          'pdf',
          `Exported_pdf__${new Date().toISOString()}`,
        )
        break
      }
      default: {
        break
      }
    }
  }

  openBottomSheetExportTypes() {
    const bottomSheetRef = this.bottomSheetExportFormat.open(BottomSheetDataExportFormatComponent)
    this.bottomSheetSubscription = bottomSheetRef
      .afterDismissed()
      .subscribe((dataFromBottomSheet) => {
        this.onExportData(dataFromBottomSheet)
      })
  }

  onViewObject(selectedObject: T) {
    // when clicked, output an event to the parent container to view the account details
    // we do this so that the container can be responsible for how it wants to process this event
    // i.e. open a dialog or maybe route to a details page
    this.viewObject.emit(selectedObject)
  }

  onEditObject(selectedObject: T) {
    // when clicked, output an event to the parent container to view the account details
    // we do this so that the container can be responsible for how it wants to process this event
    // i.e. open a dialog or maybe route to a details page
    this.editObject.emit(selectedObject)
  }

  onDeleteObject(selectedObject: T) {
    // when clicked, output an event to the parent container to view the account details
    // we do this so that the container can be responsible for how it wants to process this event
    // i.e. open a dialog or maybe route to a details page
    this.alertService.warn(
      $localize`:@@app.notification.warning.modification:Modifications will be lost ! \nDo you confirm your action`,
    )
    this.alertService.getAlertDialogResponse().subscribe({
      next: (confirmed) => {
        if (confirmed) {
          this.deleteObject.emit(selectedObject)
        }
      },
      error: (error) => {
        console.log(error)
      },
    })
  }

  openSearch() {
    this.filterComponent.nativeElement.focus()
  }
  onSearch(criteria: SearchInputCriteria) {
    //Initialize PaginatorState
    this.initializePaginatorState(
      this.matPaginatorState?.pageSize ? this.matPaginatorState?.pageSize : 5,
    )
    /**
     * Add page & pageSize parameters according to MatPagination configuration
     */
    // const defaultHttpGetPaginationParameters = [
    //   {
    //     key: "page",
    //     httpParameter: {
    //         paramKey: "page",
    //         paramValue: `${this.matPaginatorState.currentPageIndex}`
    //       }
    //   },
    //   {
    //     key: "pagesize",
    //     httpParameter: {
    //       paramKey: "pagesize",
    //       paramValue: `${this.matPaginatorState.pageSize}`
    //     }
    //   }
    // ];

    // criteria.addHttpCriteriaRecords(defaultHttpGetPaginationParameters);
    this.search.emit(criteria)
  }

  onSelectOne(selectedObject: T) {
    this.selection.clear()
    this.selection.toggle(selectedObject)
    this.selection.select(selectedObject)
    this.selectOne.emit(selectedObject)
  }

  onSelectMany() {
    this.selectMany.emit(this.selection.selected)
  }

  onDeleteMany() {
    this.alertService.warn(
      $localize`:@@app.notification.warning.modification:Modifications will be lost ! \nDo you confirm your action`,
    )
    this.alertService.getAlertDialogResponse().subscribe({
      next: (confirmed) => {
        if (confirmed) {
          if (this.selection.selected.length === 0) {
            return
          }
          this.deleteMany.emit(this.selection.selected)
          return true
        }
        return
      },
      error: (error) => {
        console.log(error)
        return
      },
    })
    return
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length
    const numRows = this.dataSource.data.length
    return numSelected === numRows
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear()
      return
    }

    this.selection.select(...this.dataSource.data)
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: T): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row`
  }

  getFile(currentElement: T, fieldViewLayout: FieldViewLayout, type: string) {
    let retrievalMethod: DataRetrievalMethod = !!fieldViewLayout?.dataRetrievalStrategy
      ?.retrievalMethod
      ? fieldViewLayout?.dataRetrievalStrategy?.retrievalMethod
      : DataRetrievalMethod.EAGER

    let dataLabel = !!fieldViewLayout.dataRetrievalStrategy?.dataLabel
      ? fieldViewLayout.dataRetrievalStrategy.dataLabel
      : fieldViewLayout.entityFieldName
    switch (retrievalMethod) {
      case DataRetrievalMethod.EAGER: {
        if (
          typeof fieldViewLayout.dataRetrievalStrategy?.dataRetrievalAccessLocation !== 'string'
        ) {
          return
        }
        let data = this.evaluateExpression(
          currentElement,
          fieldViewLayout.dataRetrievalStrategy.dataRetrievalAccessLocation as string,
        )
        return this.fileService.exportTextToFile(data, dataLabel, type)
      }
      case DataRetrievalMethod.LAZY: {
        if (
          typeof fieldViewLayout.dataRetrievalStrategy?.dataRetrievalAccessLocation === 'string'
        ) {
          let parentEntityIDName = TypeScriptTypeMetaDatatHandler.instance.getIdName(
            this.componentViewLayout?.entityClass,
          )
          let dataFieldKeyName = fieldViewLayout.dataRetrievalStrategy.dataRetrievalAccessLocation
          /**
           * use the default related entity service getEntitiesWithCriterias call in order to retrieve the related data
           *
           */

          let criteria = {}
          criteria[parentEntityIDName] = {
            entityAccessor: parentEntityIDName,
            entityValue: this.evaluateExpression(currentElement, parentEntityIDName),
            operator: AverosSearchOperator.OPER_EQ,
          }
          let requestedFields = [dataFieldKeyName]

          this.dataRetrievalSubscription = this.useCaseConfig.entityType.constructor
            .onLoadCollectionByCriteriaCallback(new SearchInputCriteria(criteria, requestedFields))
            .subscribe({
              next: (retrievedData: Array<any>) => {
                let firstValue = retrievedData[0]
                let data = firstValue[dataFieldKeyName]
                return this.fileService.exportTextToFile(data, dataLabel, type)
              },
              error: (error) => {
                console.log(error)
                this.dataRetrievalSubscription?.unsubscribe()
              },
              complete: () => this.dataRetrievalSubscription?.unsubscribe(),
            })
        } else if (
          fieldViewLayout.dataRetrievalStrategy?.dataRetrievalAccessLocation?.['service'] !==
            null &&
          fieldViewLayout.dataRetrievalStrategy?.dataRetrievalAccessLocation?.['service'] !==
            undefined
        ) {
          let service = (
            fieldViewLayout.dataRetrievalStrategy
              .dataRetrievalAccessLocation as AverosLocalServiceCall
          ).service
          let method = (
            fieldViewLayout.dataRetrievalStrategy
              .dataRetrievalAccessLocation as AverosLocalServiceCall
          ).method
          let parentEntityIDName = TypeScriptTypeMetaDatatHandler.instance.getIdName(
            this.componentViewLayout?.entityClass,
          )
          this.dataRetrievalSubscription = ServiceLocator.injector
            .get<typeof service>(service)
            [method](currentElement[parentEntityIDName])
            .subscribe({
              next: (data) => this.fileService.exportTextToFile(data, dataLabel, type),
              error: (error) => console.log(error),
              complete: () => this.dataRetrievalSubscription?.unsubscribe(),
            })
        } else if (fieldViewLayout.dataRetrievalStrategy?.dataRetrievalAccessLocation) {
          /**
           * if the AccessLocation is a function then use that function to retrieve the value data
           */
          let dataStream = (
            fieldViewLayout.dataRetrievalStrategy.dataRetrievalAccessLocation as Function
          )()
          this.dataRetrievalSubscription = dataStream.subscribe({
            next: (data) => this.fileService.exportTextToFile(data, dataLabel, type),
            error: (error) => console.log(error),
            complete: () => this.dataRetrievalSubscription?.unsubscribe(),
          })
        }
        break
      }
      default:
        break
    }
  }

  // Triggered on page change
  onPageChange(pageEvent: PageEvent): void {
    const { pageIndex, pageSize } = pageEvent

    // Update the paginator state
    this.matPaginatorState.currentPageIndex = pageIndex
    this.matPaginatorState.pageSize = pageSize

    // Check if cached data can fulfill the current page
    const startIndex = pageIndex * pageSize
    const endIndex = startIndex + pageSize

    if (
      (this.cachedData.length >= endIndex ||
        this.cachedData.length === this.matPaginatorState.totalItemsCount) &&
      this.cachedData[startIndex] !== undefined
    ) {
      this.updatePageData()
    } else {
      // Fetch data only if not already loaded
      this.pageChange.emit(pageEvent) //(this.currentPageIndex, this.pageSize);
    }
  }

  // updatePageData(){
  //   const currentPageIndex = this.matPaginatorState.currentPageIndex;
  //   const pageSize = this.matPaginatorState.pageSize;

  //   // Calculate start and end indices
  //   const startIndex = currentPageIndex * pageSize;
  //   const endIndex = Math.min(startIndex + pageSize, this.matPaginatorState.totalItemsCount);

  //   // Slice the cached data to match the current page
  //   this.dataSource.data = this.cachedData.slice(startIndex, endIndex);
  // }
  updatePageData(): void {
    try {
      const currentPageIndex = this.matPaginatorState?.currentPageIndex ?? 0
      const pageSize = this.matPaginatorState?.pageSize ?? 5
      const totalItemsCount = this.matPaginatorState?.totalItemsCount ?? 0

      // Validate paginator state
      if (!this.matPaginatorState) {
        console.warn('updatePageData: matPaginatorState not initialized')
        this.matTableDataSource.data = []
        return
      }

      // Validate cached data
      if (!this.cachedData || !Array.isArray(this.cachedData)) {
        console.warn('updatePageData: cachedData not initialized')
        this.matTableDataSource.data = []
        return
      }

      // Calculate start and end indices
      const startIndex = currentPageIndex * pageSize
      const endIndex = Math.min(startIndex + pageSize, totalItemsCount)

      // Validate indices
      if (startIndex < 0 || startIndex > this.cachedData.length) {
        console.warn('updatePageData: invalid startIndex', startIndex)
        this.matTableDataSource.data = []
        return
      }

      // Slice the cached data to match the current page
      this.matTableDataSource.data = this.cachedData.slice(startIndex, endIndex)
    } catch (err) {
      console.error('Error updating page data:', err)
      this.matTableDataSource.data = []
    }
  }

  // updateCachedData(paginatedData: PaginatedData<T>){
  //   const startIndex = this.matPaginatorState.currentPageIndex * this.matPaginatorState.pageSize;
  //        // Ensure the cache has enough space
  //   if (this.cachedData.length < startIndex + paginatedData.data.length) {
  //     this.cachedData.length = startIndex + paginatedData.data.length;
  //   }
  //   // Merge the new data into the cache
  //   for (let i = 0; i < paginatedData.data.length; i++) {
  //     this.cachedData[startIndex + i] = paginatedData.data[i];
  //   }
  //   // Update the paginator state
  //   this.matPaginatorState.totalItemsCount = paginatedData.totalCount ?? this.matPaginatorState.totalItemsCount;
  // }

  updateCachedData(paginatedData: PaginatedData<T>): void {
    try {
      // Validate input
      if (!paginatedData || !paginatedData.data || !Array.isArray(paginatedData.data)) {
        console.warn('updateCachedData: invalid paginated data')
        return
      }

      const startIndex = this.matPaginatorState.currentPageIndex * this.matPaginatorState.pageSize

      // Validate startIndex
      if (startIndex < 0) {
        console.warn('updateCachedData: invalid startIndex', startIndex)
        return
      }

      // Ensure the cache has enough space
      if (this.cachedData.length < startIndex + paginatedData.data.length) {
        this.cachedData.length = startIndex + paginatedData.data.length
      }

      // Merge the new data into the cache
      for (let i = 0; i < paginatedData.data.length; i++) {
        this.cachedData[startIndex + i] = paginatedData.data[i]
      }

      // Update total count
      this.matPaginatorState.totalItemsCount =
        paginatedData.totalCount ?? this.matPaginatorState.totalItemsCount ?? 0
    } catch (err) {
      console.error('Error updating cached data:', err)
      // Reset cache on error
      this.cachedData = []
    }
  }

  getTotalItemsCount() {
    return this.matPaginatorState.totalItemsCount
  }

  getPageSize() {
    return this.matPaginatorState.pageSize
  }

  getPageIndex() {
    return this.matPaginatorState.currentPageIndex
  }

  updateTableData(data: T[] | PaginatedData<T> | null): void {
    try {
      // Validate input data
      if (!data || data === null) {
        console.warn('updateTableData: received null/undefined data')
        this.matTableDataSource.data = []
        this.cachedData = []
        this.matPaginatorState.totalItemsCount = 0
        this.matPaginatorState.currentPageIndex = 0
        return
      }

      // Handle Array data
      if (Array.isArray(data)) {
        this.cachedData = [...data] // Defensive copy
        this.matPaginatorState.totalItemsCount =
          data.length ?? this.matPaginatorState.totalItemsCount
        this.matPaginatorState.currentPageIndex = 0
        this.updatePageData()
        return
      }

      // Handle PaginatedData
      const paginatedData = data as PaginatedData<T>

      // Validate paginated data structure
      if (!paginatedData.data || !Array.isArray(paginatedData.data)) {
        console.warn('updateTableData: invalid paginated data structure', paginatedData)
        this.matTableDataSource.data = []
        return
      }

      // TODO: Check this: in case everything
      // Update paginated data
      this.matPaginatorState.totalItemsCount =
        paginatedData.totalCount ??
        paginatedData.data.length ??
        this.matPaginatorState.totalItemsCount

      this.matPaginatorState.currentPageIndex = Math.min(
        this.matPaginatorState.currentPageIndex,
        paginatedData.currentPageIndex ?? this.matPaginatorState.currentPageIndex,
      )

      this.updateCachedData(paginatedData)
      this.updatePageData()
    } catch (err) {
      console.error('Critical error in updateTableData:', err)
      // Log the problematic data for debugging
      console.error('Problematic data:', data)

      // Fail gracefully - set empty data
      this.matTableDataSource.data = []
      this.cachedData = []
      this.matPaginatorState.totalItemsCount = 0
      this.matPaginatorState.currentPageIndex = 0

      // Optionally notify user of critical error
      this.alertService.error('app.notification.error.updating_table')
    }
  }

  changeCheckBox(matCheckBowChangeEvent: MatCheckboxChange, row: any) {
    if (!this.multipleSelection) {
      this.selection.clear()
      this.selection.toggle(row)
    } else {
      if (matCheckBowChangeEvent.checked) {
        this.selection.select(row)
      } else {
        this.selection.deselect(row)
      }
    }
  }
}
