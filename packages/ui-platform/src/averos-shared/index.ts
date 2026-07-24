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
  MaterialElevationDirective,
  AccordionDirective,
  AccordionAnchorDirective,
  AccordionLinkDirective,
  DataExportDirective,
  SafeIconDirective,
} from './_directives'

import {
  SortCollectionByPipe,
  ToObservablePipe,
  ToViewLayoutPipe,
  ToTabbedViewLayoutPipe,
  ToCompositeViewLayoutPipe,
  TransformViewLayoutPipe,
  ToBooleanPipe,
} from './_pipes'

export const averosSharedComponents: any[] = []

export const averosSharedDirectives: any[] = [
  MaterialElevationDirective,
  AccordionDirective,
  AccordionAnchorDirective,
  AccordionLinkDirective,
  DataExportDirective,
  SafeIconDirective,
]

export const averosSharedPipes: any[] = [
  SortCollectionByPipe,
  ToObservablePipe,
  ToViewLayoutPipe,
  ToTabbedViewLayoutPipe,
  ToCompositeViewLayoutPipe,
  TransformViewLayoutPipe,
  ToBooleanPipe,
]

export const averosSharedModules: any[] = []

export * from './_directives'
export * from './_pipes'
