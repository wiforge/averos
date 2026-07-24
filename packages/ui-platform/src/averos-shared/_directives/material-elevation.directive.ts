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
  Directive,
  ElementRef,
  HostListener,
  Input,
  Renderer2,
  OnChanges,
  SimpleChanges,
} from '@angular/core'

@Directive({
  selector: '[averosMaterialElevation]',
  standalone: false,
})
export class MaterialElevationDirective implements OnChanges {
  @Input()
  defaultElevation = 2

  @Input()
  raisedElevation = 16

  constructor(
    private element: ElementRef,
    private renderer: Renderer2,
  ) {
    this.setElevation(this.raisedElevation, this.defaultElevation)
  }

  @HostListener('pointerenter')
  onPointerEnter() {
    this.setElevation(this.defaultElevation, this.raisedElevation)
  }

  @HostListener('pointerleave')
  onPointerLeave() {
    this.setElevation(this.raisedElevation, this.defaultElevation)
  }

  ngOnChanges(changes: SimpleChanges) {
    this.setElevation(this.raisedElevation, this.defaultElevation)
  }

  setElevation(oldClazz: number, newClazz: number) {
    // remove old class
    const oldClass = `mat-elevation-z${oldClazz}`
    this.renderer.removeClass(this.element.nativeElement, oldClass)
    // add the given elevation class
    const newClass = `mat-elevation-z${newClazz}`
    this.renderer.addClass(this.element.nativeElement, newClass)
  }
}
