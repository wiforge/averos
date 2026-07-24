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
  ViewChild,
  TrackByFunction,
} from '@angular/core'
import { Observable } from 'rxjs'
import { MatExpansionPanel } from '@angular/material/expansion'
import { AverosDynamicTableComponent } from '../averos-dynamic-table'

import { PageEvent } from '@angular/material/paginator'
import {
  EntityViewLayout,
  Indexable,
  PaginatedData,
  RowAction,
  RowActionMetaData,
  SearchInputCriteria,
} from '@averos/core'

@Component({
  selector: 'averos-search-result',
  templateUrl: './averos-search-result.component.html',
  styleUrls: ['./averos-search-result.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchResultComponent<T extends Indexable> implements OnInit {
  @Input() viewLayout!: Observable<EntityViewLayout<T>>
  // Show/Hide the action buttons
  @Input() showRowActions!: boolean

  @Input() showCustomRowActions: boolean = false
  @Input() selectable!: boolean
  @Input() multipleSelection!: boolean
  @Input() forInput: boolean = false

  @Input() customRowActions: RowAction[] = []

  @Input() data$!: Observable<T[] | PaginatedData<T> | null>
  // Show/Hide the filter component
  @Input() showFilterComponent!: boolean
  @Input() trackByField!: TrackByFunction<T>
  @Input() filterComponentLabel!: string
  @Input() filterComponentLabelTranslationID!: string
  @Input() filterKey!: string

  @Output() viewObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() viewCompositeObject: EventEmitter<any> = new EventEmitter<any>()
  @Output() executeCustomRowAction: EventEmitter<any> = new EventEmitter<any>()
  @Output() editObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() deleteObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() addObject: EventEmitter<T> = new EventEmitter<T>()
  @Output() reloadTable: EventEmitter<T> = new EventEmitter<T>()
  @Output() search: EventEmitter<SearchInputCriteria> = new EventEmitter<SearchInputCriteria>()
  @Output() deleteMany: EventEmitter<T[]> = new EventEmitter<T[]>()
  @Output() pageChange: EventEmitter<PageEvent> = new EventEmitter<PageEvent>()
  @Output() selectOne: EventEmitter<T> = new EventEmitter<T>()
  @Output() selectMany: EventEmitter<T[]> = new EventEmitter<T[]>()

  @ViewChild(MatExpansionPanel, { static: true }) matExpansionPanel!: MatExpansionPanel
  @ViewChild(AverosDynamicTableComponent, { static: true })
  averosDynamicTable!: AverosDynamicTableComponent<T>

  get searchCriteria(): SearchInputCriteria {
    return this.searchCriteria_
  }

  @Input('searchCriteria') set searchCriteria(searchInputCriteria: SearchInputCriteria) {
    if (searchInputCriteria) {
      this.searchCriteria_ = searchInputCriteria
      this.onSearch(this.searchCriteria_)
    }
  }

  searchCriteria_!: SearchInputCriteria

  constructor() {}

  ngOnInit(): void {}

  viewCompObject(compositeObject: { value: unknown; type: string; compositeType?: string }) {
    this.viewCompositeObject.emit(compositeObject)
  }

  executeCustomAction(actionMetaData: RowActionMetaData) {
    this.executeCustomRowAction.emit(actionMetaData)
  }

  view(event: any) {
    this.viewObject.emit(event)
  }

  edit(event: any) {
    this.editObject.emit(event)
  }

  add(event: any) {
    this.addObject.emit(event)
  }

  reloadData(event: any) {
    this.reloadTable.emit(event)
  }

  delete(event: any) {
    this.deleteObject.emit(event)
  }

  onDeleteMany(event: any) {
    this.deleteMany.emit(event)
  }

  searchData(event: any) {
    this.matExpansionPanel.open()
    this.search.emit(event)
  }

  onSearch(searchInputCriteria: SearchInputCriteria) {
    this.averosDynamicTable.onSearch(searchInputCriteria)
  }

  onPageChange(pageEvent: PageEvent) {
    this.pageChange.emit(pageEvent)
  }

  onSelectOne(event: any) {
    this.selectOne.emit(event)
  }

  onSelectMany(event: any) {
    this.selectMany.emit(event)
  }
}
