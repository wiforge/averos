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
  SchematicContext,
  chain,
  TaskId,
} from '@angular-devkit/schematics'

import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { NodePackageInstallTask, RunSchematicTask } from '@angular-devkit/schematics/tasks'
import { of } from 'rxjs'
import { concatMap, map } from 'rxjs/operators'

import { NgAddOption } from './schema'
import { AddLanguageOption } from '../add-language/schema'
import {
  addDependencyToPackageJson,
  getPackageCompliantVersion,
  PackageMetadata,
  REQUIRED_PACKAGES,
} from '../util/package-util'

/**
 * Main ng-add schematic entry point
 */
export default function (options: NgAddOption): Rule {
  return chain([
    validateAndSetupOptions(options),
    addPackageJsonDependencies(),
    scheduleTaskChain(options),
  ])
}

/**
 * Validates and sets up default options
 */
function validateAndSetupOptions(options: NgAddOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info('🚀 Setting up Averos...')
    context.logger.info(`Options: ${JSON.stringify(options)}`)

    // Set default application name
    if (!options.applicationName?.trim()) {
      options.applicationName = 'MyFancyApplication'
      context.logger.info(`✅  Using default application name: ${options.applicationName}`)
    }

    // Set default language
    if (!options.defaultLanguageCode?.trim()) {
      options.defaultLanguageCode = 'en'
      context.logger.info('✅  Using default language: English (en)')
    }

    // Get workspace and project
    const workspace = await getWorkspace(host)

    if (!options.project) {
      options.project = workspace.projects.keys().next().value
      if (!options.project) {
        throw new SchematicsException('❌ Cannot retrieve the project.')
      }
    }

    context.logger.info(`🔍 Project: ${options.project}`)

    const project = workspace.projects.get(options.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${options.project}`)
    }

    // Set default paths
    if (options.srcPath === undefined) {
      options.srcPath = buildDefaultPath(project)
      context.logger.info(`✅  Source path: ${options.srcPath}`)
    }

    if (options.projectRootPath === undefined) {
      options.projectRootPath = `${project.root}/`
      context.logger.info(`✅  Project root: ${options.projectRootPath}`)
    }

    return host
  }
}

/**
 * Adds required dependencies to package.json
 */
function addPackageJsonDependencies(): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info('📦 Adding dependencies to package.json...')

    return of(...REQUIRED_PACKAGES).pipe(
      concatMap((packageMetaData: PackageMetadata) => getPackageCompliantVersion(packageMetaData)),
      map((packageInfo) => {
        addDependencyToPackageJson(host, context, packageInfo)
        return host
      }),
    )
  }
}

/**
 * Schedules the task chain for Averos setup
 */
function scheduleTaskChain(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info('🔧 Scheduling Averos setup tasks...')

    // Build task chain
    const installTaskId: TaskId | undefined = undefined // schedulePackageInstall(options, context); (REMOVED PACKAGE INSTALLATION)
    const initTaskId = scheduleInitialization(options, context, installTaskId)

    const defaultLangTaskId = scheduleDefaultLanguage(options, context, initTaskId)
    const additionalLangTaskId = scheduleAdditionalLanguage(options, context, defaultLangTaskId)
    const finalTaskId = additionalLangTaskId || defaultLangTaskId

    schedulePostAdd(options, context, finalTaskId)

    context.logger.info('')
    context.logger.info('✨ Averos has been successfully configured!')
    context.logger.info('')
    context.logger.info('📝 Next step: Start building your application')
    context.logger.info('')

    return host
  }
}

/**
 * Schedules npm install task
 */
function schedulePackageInstall(
  options: NgAddOption,
  context: SchematicContext,
): TaskId | undefined {
  if (options.skipInstall) {
    context.logger.info('⏭️  Skipping package installation')
    return undefined
  }

  context.logger.info('📥 Scheduling package installation...')
  return context.addTask(new NodePackageInstallTask())
}

/**
 * Schedules Averos project initialization
 */
function scheduleInitialization(
  options: NgAddOption,
  context: SchematicContext,
  dependsOn?: TaskId,
): TaskId {
  context.logger.info('🔧 Scheduling project initialization...')

  const task = new RunSchematicTask('initialize-averos-project', options)

  return dependsOn !== undefined ? context.addTask(task, [dependsOn]) : context.addTask(task)
}

/**
 * Schedules default language addition
 */
function scheduleDefaultLanguage(
  options: NgAddOption,
  context: SchematicContext,
  dependsOn: TaskId,
): TaskId {
  context.logger.info(`🌐 Scheduling default language: ${options.defaultLanguageCode}`)

  const langOptions: AddLanguageOption = {
    languageCode: options.defaultLanguageCode,
  }

  const task = new RunSchematicTask('add-language', langOptions)
  return context.addTask(task, [dependsOn])
}

/**
 * Schedules additional language addition (optional)
 */
function scheduleAdditionalLanguage(
  options: NgAddOption,
  context: SchematicContext,
  dependsOn: TaskId,
): TaskId | undefined {
  if (!options.addNewLanguage) {
    context.logger.info('⏭️  Skipping additional language')
    return undefined
  }

  context.logger.info('🌐 Scheduling additional language...')

  const task = new RunSchematicTask('add-language', {})
  return context.addTask(task, [dependsOn])
}

/**
 * Schedules post-add tasks
 */
function schedulePostAdd(
  options: NgAddOption,
  context: SchematicContext,
  dependsOn: TaskId,
): TaskId {
  context.logger.info('🎬 Scheduling post-add tasks...')

  const task = new RunSchematicTask('post-add', options)
  return context.addTask(task, [dependsOn])
}
