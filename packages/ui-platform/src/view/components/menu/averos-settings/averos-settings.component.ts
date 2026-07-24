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
  Output,
  EventEmitter,
  Input,
} from '@angular/core'
import { CdkDragStart } from '@angular/cdk/drag-drop'

interface AppSettings {
  navPos?: 'side' | 'top'
  dir?: 'ltr' | 'rtl'
  theme?: 'light' | 'dark'
  showHeader?: boolean
  headerPos?: 'fixed' | 'static' | 'above'
  showUserPanel?: boolean
  sidenavOpened?: boolean
  sidenavCollapsed?: boolean
  // language?: string;
}

const defaults: AppSettings = {
  navPos: 'side',
  dir: 'ltr',
  theme: 'light',
  showHeader: true,
  headerPos: 'fixed',
  showUserPanel: true,
  sidenavOpened: true,
  sidenavCollapsed: false, //,
  // language: 'en-US',
}

@Component({
  selector: 'averos-settings',
  templateUrl: './averos-settings.component.html',
  styleUrls: ['./averos-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSettingsComponent implements OnInit {
  options = defaults
  opened = false
  dragging = false

  @Input() isHandset!: boolean
  @Output() openRightSideNavEvent = new EventEmitter<boolean>()

  constructor() {}

  ngOnInit(): void {}

  handleDragStart(event: CdkDragStart): void {
    this.dragging = true
  }

  openPanel(event: MouseEvent) {
    if (this.dragging) {
      this.dragging = false
      return
    }
    // this.opened = true;
    this.openRightSideNavEvent.emit(true)
  }

  // *************

  // closePanel() {
  //   this.opened = false;
  // }

  // togglePanel() {
  //   this.opened = !this.opened;
  // }

  // sendOptions() {
  //   this.optionsEvent.emit(this.options);
  // }
  ///// *********************
}
