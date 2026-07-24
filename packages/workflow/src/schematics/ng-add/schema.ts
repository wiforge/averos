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

export interface NgAddOption {
  // The name of the application
  applicationName: string

  // enable authentication
  enableAuthentication?: boolean

  // enables entity external fields mapping
  enableExternalEntityMapping?: boolean

  // The default language code to add ex. 'en', 'fr', 'de', 'ar'.
  defaultLanguageCode?: string

  // Specifies if the user wants to add a new language support or not
  addNewLanguage?: boolean

  // whether to skip package installation or not
  skipInstall?: boolean

  // The name of the project.
  project?: string

  // The rout source path (usually projectRootPath/src/app).
  srcPath?: string

  // The rout source path (usually projectRootPath/src/app).
  projectRootPath?: string
}
