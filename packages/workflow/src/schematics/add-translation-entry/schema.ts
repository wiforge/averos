/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 */

export interface AverosAddTranslationEntryOption {
  // The target translation key
  key: string

  //The value of the translation key
  value: string

  // The target language
  lang: string
  // The path to create the entity.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
