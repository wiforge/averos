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

import { Directive, AfterContentChecked } from '@angular/core'
import { filter } from 'rxjs/operators'
import { AccordionLinkDirective } from './accordion-link.directive'
import { Router, NavigationEnd } from '@angular/router'

@Directive({
  selector: '[averosAccordion]',
  standalone: false,
})
export class AccordionDirective implements AfterContentChecked {
  protected navlinks: Array<AccordionLinkDirective> = []

  constructor(private router: Router) {
    // Fix: `ERROR Error: ExpressionChangedAfterItHasBeenCheckedError:
    // Expression has changed after it was checked`.
    setTimeout(() => this.checkOpenLinks())
  }

  ngAfterContentChecked(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => this.checkOpenLinks())
  }

  addLink(link: AccordionLinkDirective): void {
    this.navlinks.push(link)
  }

  closeOtherLinks(openLink: AccordionLinkDirective): void {
    this.navlinks.forEach((link: AccordionLinkDirective) => {
      if (link !== openLink) {
        link.open = false
      }
    })
  }

  removeGroup(link: AccordionLinkDirective): void {
    const index = this.navlinks.indexOf(link)
    if (index !== -1) {
      this.navlinks.splice(index, 1)
    }
  }

  checkOpenLinks() {
    this.navlinks.forEach((link: AccordionLinkDirective) => {
      if (link.group) {
        const routeUrl = this.router.url
        const currentUrl = routeUrl.split('/')
        if (currentUrl.includes(link.group)) {
          link.open = true
          this.closeOtherLinks(link)
        }
      }
    })
  }
}
