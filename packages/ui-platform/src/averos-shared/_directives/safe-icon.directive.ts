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

/**
 * Directive: SafeIconDirective
 *
 * This directive ensures safe and reliable loading of SVG icons using Angular Material's MatIcon component.
 * It handles dynamic icon registration based on the currently selected theme, and gracefully falls back to a
 * default icon theme if an icon is missing from the active one. This guarantees that icons are always displayed
 * (if available) and avoids broken icons in the UI.
 *
 * Core Responsibilities:
 * - Dynamically assign themed SVG icons using [svgIcon] binding.
 * - Check if the icon exists in the current theme or fallback theme.
 * - Apply visibility rules: hide the element if no icon is found, or show it once the icon is resolved.
 * - Subscribe to icon theme changes and update the rendered icon reactively.
 *
 * Usage:
 * ```html
 * <mat-icon [safeIcon]="'edit'"></mat-icon>
 * ```
 *
 * Dependencies:
 * - ResourceLoaderService: Provides icon metadata and readiness state per theme.
 * - ApplicationSharedService: Provides the current icon theme via an observable.
 * - MatIcon: Angular Material's icon component for SVG rendering.
 *
 * Notes:
 * - The directive waits for both the current and fallback themes to be fully loaded before rendering.
 * - DOM visibility is fully controlled within the subscription logic to prevent UI flickering.
 * - Designed to work seamlessly with OnPush change detection strategy.
 *
 * @example
 * <mat-icon [safeIcon]="'delete'"></mat-icon>
 *
 * @author
 * Houssem LAOUITI
 */

import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core'
import { MatIcon } from '@angular/material/icon'
import {
  ApplicationSharedService,
  LoggerService,
  ResourceLoaderService,
  LogLevel,
} from '@averos/core'
import { Subscription, combineLatest, filter } from 'rxjs'

/**
 * Directive to dynamically and safely bind themed icons to <mat-icon> components.
 * Ensures the icons are registered and ready before rendering.
 */

const NOTFOUND_ICON_NAME = 'no-icon/warning'

@Directive({
  selector: '[safeIcon]',
  standalone: false,
})
export class SafeIconDirective implements OnInit, OnDestroy {
  private _iconName: string = ''

  @Input('safeIcon')
  set iconName(value: string) {
    this._iconName = value
    this.updateIcon() // Call update when input changes
  }

  get iconName(): string {
    return this._iconName
  }

  private sub?: Subscription
  private fallbackDefaultTheme: string = this.icons.getDefaultTheme()

  constructor(
    private matIcon: MatIcon,
    private icons: ResourceLoaderService,
    private appShared: ApplicationSharedService,
    private elRef: ElementRef<HTMLElement>,
    private logger: LoggerService,
  ) {}

  ngOnInit(): void {
    this.fallbackDefaultTheme = this.icons.getDefaultTheme()

    this.sub = combineLatest([
      this.appShared.iconsTheme$,
      this.icons.isThemeReady(this.appShared.getIconsTheme()),
      this.icons.isThemeReady(this.fallbackDefaultTheme),
    ])
      .pipe(filter(([_, themeReady, fallbackReady]) => themeReady && fallbackReady))
      .subscribe(([theme]) => {
        const safeTheme = theme || this.fallbackDefaultTheme
        this.updateIcon(safeTheme)
      })
  }

  updateIcon(theme?: string) {
    if (!theme) {
      theme = this.appShared.getIconsTheme()
    }
    const name = this.iconName
    const themedIcon = `${theme}:${name}`
    const fallbackIcon = `${this.fallbackDefaultTheme}:${name}`
    const notFoundIcon = `${this.fallbackDefaultTheme}:${NOTFOUND_ICON_NAME}`

    if (!name) {
      return
    }
    if (this.trySetSvgIcon(name, theme, this.fallbackDefaultTheme, themedIcon, fallbackIcon)) {
      return
    }

    // Try Material icon
    const materialName = name.split('/').pop()!
    this.matIcon.svgIcon = ''
    this.matIcon.fontIcon = materialName

    if (this.shouldFallbackToNotFound()) {
      this.renderNotFoundIcon(notFoundIcon)
    } else {
      this.resetVisibility()
    }
  }
  private trySetSvgIcon(
    name: string,
    theme: string,
    fallback: string,
    themedIcon: string,
    fallbackIcon: string,
  ): boolean {
    if (this.icons.iconExists(theme, name)) {
      this.matIcon.svgIcon = themedIcon
      this.clearFallbackStyling()
      this.resetVisibility()
      return true
    }

    if (this.icons.iconExists(fallback, name)) {
      this.logger.log(
        'SafeIconDirective',
        LogLevel.WARN,
        `Icon "${name}" not found in "${theme}", falling back to "${fallback}".`,
      )
      this.matIcon.svgIcon = fallbackIcon
      this.clearFallbackStyling()
      this.resetVisibility()
      return true
    }

    return false
  }

  private shouldFallbackToNotFound(): boolean {
    const rendered = this.elRef.nativeElement.querySelector('svg, .mat-icon')
    return !rendered || (rendered instanceof SVGElement && rendered.childNodes.length === 0)
  }

  private renderNotFoundIcon(notFoundIcon: string): void {
    if (this.icons.iconExists(this.icons.getDefaultTheme(), NOTFOUND_ICON_NAME)) {
      this.matIcon.svgIcon = notFoundIcon
      this.matIcon.fontIcon = ''
      this.elRef.nativeElement.style.color = 'red'
      this.elRef.nativeElement.style.visibility = 'visible'
      this.elRef.nativeElement.style.display = ''
    } else {
      this.elRef.nativeElement.style.display = 'none'
    }
  }

  private resetVisibility(): void {
    this.elRef.nativeElement.style.visibility = 'visible'
    this.elRef.nativeElement.style.display = ''
    this.clearFallbackStyling()
  }

  private clearFallbackStyling(): void {
    if (this.elRef.nativeElement.style.color === 'red') {
      this.elRef.nativeElement.style.color = ''
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  }
}
