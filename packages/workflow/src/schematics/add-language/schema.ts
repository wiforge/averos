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

export interface AddLanguageOption {
  // The language code to add ex. 'en', 'fr', 'de', 'ar'.
  languageCode: string

  // The path to create the service.
  srcPath?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
