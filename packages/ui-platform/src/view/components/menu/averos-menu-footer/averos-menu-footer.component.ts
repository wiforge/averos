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


import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { ApplicationStaticVariables } from '@averos/core';

@Component({
    selector: 'averos-menu-footer',
    templateUrl: './averos-menu-footer.component.html',
    styleUrls: ['./averos-menu-footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AverosMenuFooterComponent implements OnInit {

  @Input() isHandset;
  @Input() logged;

  get appVersion(){
    return ApplicationStaticVariables.AVEROS_VERSION;
  } 
  
  constructor() { }

  ngOnInit(): void {
  }

}
