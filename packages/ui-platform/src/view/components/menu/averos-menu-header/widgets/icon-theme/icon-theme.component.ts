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
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { MatSelect } from '@angular/material/select'
import { ResourceLoaderService } from '@averos/core'

@Component({
  selector: 'averos-icon-theme',
  templateUrl: './icon-theme.component.html',
  styleUrls: ['./icon-theme.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class IconThemeComponent implements OnInit {
  @Input() color: any
  @Output() changeIconTheme: EventEmitter<any> = new EventEmitter<any>()

  protected iconThemesSet = this.resourceResourceLoaderService.getAllIconThemes()

  @ViewChild(MatSelect) mselect!: MatSelect

  constructor(private resourceResourceLoaderService: ResourceLoaderService) {}

  ngOnInit(): void {}

  onChangeIconTheme(event: any) {
    this.changeIconTheme.emit(event)
  }
}
