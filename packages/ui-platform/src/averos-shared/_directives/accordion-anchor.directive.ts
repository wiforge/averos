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

import { Directive, HostListener, Inject } from '@angular/core'
import { AccordionLinkDirective } from './accordion-link.directive'

@Directive({
  selector: '[averosAccordionAnchor]',
  standalone: false,
})
export class AccordionAnchorDirective {
  protected navlink: AccordionLinkDirective

  constructor(@Inject(AccordionLinkDirective) navlink: AccordionLinkDirective) {
    this.navlink = navlink
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent) {
    this.navlink.toggle()
  }
}
