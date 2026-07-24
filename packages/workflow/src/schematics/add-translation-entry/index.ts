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

import {
  Rule,
  Tree,
  SchematicsException,
  chain,
  SchematicContext,
  DirEntry,
  noop,
} from '@angular-devkit/schematics'
import { normalize, join } from '@angular-devkit/core'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { AverosAddTranslationEntryOption } from './schema'

export default function (options: AverosAddTranslationEntryOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:add-translation-entry"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    /// Option Setup //////////////
    const workspace = await getWorkspace(host)
    if (!options.project) {
      options.project = workspace.projects.keys().next().value

      if (!options.project) {
        throw new SchematicsException(`❌ Cannot Retrieve the Project.`)
      }
    }
    context.logger.info(`🔍 Preparing to retrieve the project using: ${options.project}`)

    const project = workspace.projects.get(options.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${options.project}`)
    }
    options.projectRootPath = `${project.root}/`
    if (options.path === undefined) {
      options.path = buildDefaultPath(project)
      context.logger.info(`✅ Using the default path: ${options.path}`)
    }
    ///// END Option Setup////////////////////////
    context.logger.info(
      `🌱 Adding translation for [key,value]= [${(options.key, options.value)}] to the language ${options.lang}`,
    )
    return chain([createTranslationKeys(options)])
  }
}

export function createTranslationKeys(options: AverosAddTranslationEntryOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let translationFilesLocation = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/i18n/`),
    )

    let dirEntry: DirEntry = host.getDir(translationFilesLocation)

    let targetLangTranslationFile = dirEntry.subfiles.find((e) => e === `${options.lang}.json`)
    if (!targetLangTranslationFile) {
      context.logger
        .error(`❌ No Translation configuration found for the language ${options.lang}!\n
          Please use {ng g @averos/workflow:add-language} in order to activate averos translation support for your angular project.\n`)
      return noop()
    }
    let translationFile = normalize(join(normalize(dirEntry.path), targetLangTranslationFile))

    if (!host.exists(translationFile)) {
      context.logger
        .error(`❌ No Translation configuration found for the language ${options.lang}!\n
          Please use {ng g @averos/workflow:add-language} in order to activate averos translation support for your angular project.\n`)
      return noop()
    }

    let translationContent = host.read(translationFile)

    if (!translationContent) {
      context.logger
        .error(`❌ No Translation configuration found for the language ${options.lang}!\n
          Please use {ng g @averos/workflow:add-language} in order to activate averos translation support for your angular project.\n`)
      return noop()
    }
    let translationData = JSON.parse(translationContent.toString())

    // if (!translationData[`${options.key.toLocaleLowerCase()}`]){
    // add or update an existing entry
    translationData[`${options.key}`] = options.value
    // }
    host.overwrite(translationFile, JSON.stringify(translationData))

    context.logger.info(`✅ The requested translation entry has been added/updated successfully!`)

    return host
  }
}
