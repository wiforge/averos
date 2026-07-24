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

import { Directive, Input, HostBinding, OnInit, OnDestroy, Inject } from '@angular/core'
import { AccordionDirective } from './accordion.directive'

@Directive({
  selector: '[averosAccordionLink]',
  standalone: false,
})
export class AccordionLinkDirective implements OnInit, OnDestroy {
  @Input() public group: any

  protected oPEN = false
  protected nav: AccordionDirective

  @HostBinding('class.open')
  @Input()
  get open(): boolean {
    return this.oPEN
  }

  set open(value: boolean) {
    this.oPEN = value
    if (value) {
      this.nav.closeOtherLinks(this)
    }
  }

  constructor(@Inject(AccordionDirective) nav: AccordionDirective) {
    this.nav = nav
  }

  ngOnInit(): any {
    this.nav.addLink(this)
  }

  ngOnDestroy(): any {
    this.nav.removeGroup(this)
  }

  toggle(): any {
    this.open = !this.open
  }
}
