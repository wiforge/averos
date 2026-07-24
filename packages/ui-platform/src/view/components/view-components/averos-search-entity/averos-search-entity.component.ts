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
  EventEmitter,
  Output,
  ViewChild,
} from '@angular/core'
import { FormGroup } from '@angular/forms'

import { Observable } from 'rxjs'
import { MatExpansionPanel } from '@angular/material/expansion'
import {
  AlertService,
  Indexable,
  SearchInputCriteria,
  UseCaseConfig,
  UseCaseViewLayout,
} from '@averos/core'

@Component({
  selector: 'averos-search-entity',
  templateUrl: './averos-search-entity.component.html',
  styleUrls: ['./averos-search-entity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchEntityComponent<T extends Indexable> implements OnInit {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() searchInputFormGoup!: FormGroup
  @Output() executeSearch: EventEmitter<SearchInputCriteria> =
    new EventEmitter<SearchInputCriteria>()

  @ViewChild(MatExpansionPanel, { static: true }) matExpansionPanel!: MatExpansionPanel

  constructor(private alertService: AlertService) {}

  ngOnInit(): void {}

  searchEntities() {
    if (this.searchInputFormGoup.invalid) {
      this.alertService.error(
        $localize`:@@uc.search.inputcriteria.invalid:One or more search criteria are invalid! `,
      )
    } else {
      this.matExpansionPanel.close()
      this.executeSearch.emit(new SearchInputCriteria(this.searchInputFormGoup.value))
    }
  }
}
