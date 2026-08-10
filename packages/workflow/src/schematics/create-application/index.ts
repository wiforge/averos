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
  SchematicContext,
  chain,
  SchematicsException,
} from '@angular-devkit/schematics'
import { CreateApplicationOption } from './schema'
import { dependencies as dependenciesLib } from '../deplib-versions.json'
import * as path from 'path'
import { spawnSync } from 'child_process'

export function createApplication(options: CreateApplicationOption): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const appName = options.applicationName || 'myapplication'

    context.logger.info(`Creating a new Averos application: ${appName}`)

    return chain([addAverosFramework(options)])
  }
}

function addAverosFramework(options: CreateApplicationOption): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:create-application"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)

    let appOtions = {
      name: options.applicationName,
      inlineStyle: false, // --no-inline-style
      inlineTemplate: false, // --no-inline-template
      zoneless: false, // --no-zoneless
      aiConfig: 'none', // --ai-config=none
      routing: true, // --routing
      strict: true, // --strict
      style: 'scss', // --style=scss
      skipInstall: true,
      standalone: false, // --no-standalone
      ssr: false, // --no-ssr
    }
    /// ng new applicationName --no-zoneless --no-inline-style --no-inline-template --ai-config=none --routing --strict --style=scss --no-standalone --no-ssr
    let newAppOptions = toAngularOptionsArray(appOtions)

    if (tree.exists(options.applicationName)) {
      throw new SchematicsException(
        `❌ The directory ${options.applicationName} already exists. Please remove it or choose a different name.`,
      )

      //      context.logger.error(
      //   `❌ The directory ${options.applicationName} already exists. Please remove it or choose a different name.`,
      // )
      // return tree
    }

    context.logger.info(`📦 Running "ng new ${options.applicationName}"...`)
    const result = spawnSync('npx', ['ng', 'new', options.applicationName, ...newAppOptions], {
      stdio: 'inherit',
      shell: true,
    })

    if (result.error) {
       throw new SchematicsException(
        `❌ Failed to create a new application: ${result.error.message}`,
      )
      // context.logger.error(`❌ Failed to create a new application: ${result.error.message}`)
      // return tree // Stop further execution if error occurs
    }

    const appPath = path.join(process.cwd(), options.applicationName)
    process.chdir(appPath) // Change directory
    context.logger.info(`📌 Switched to ${appPath}`)

    ////////// DEVELOPMENT MODE FOR LOCAL TESTING PURPOSES: DO NOT USE FOR PRODUCTION ////////
    if (options.development && options.averosVersion) {
      context.logger.info(
        `ℹ️ ########## INSTALLING A LOCAL AVEROS VERSION ${options.averosVersion} FOR TESTING PURPOSES  ############  `,
      )
      context.logger.info(
        `ℹ️ ##########   PLEASE DO NOT USE DEVELOPMENT OPTION PRODUCTION  ############  `,
      )
      const localRegistry = process.env.AVEROS_DEV_REGISTRY ?? 'http://localhost:4873'
      context.logger.info(`ℹ️ Using local registry: ${localRegistry}`)
      const averosVersion_ = !options.averosVersion
        ? getDependencyLibVersion('@averos/workflow')
        : options.averosVersion
      const averosUiPlatformVersion_ = !options.averosVersion
        ? getDependencyLibVersion('@averos/ui-platform')
        : options.averosVersion
      context.logger.info(`ℹ️ Using local lib @averos/workflow@${averosVersion_}`)
      context.logger.info(`ℹ️ Using local lib @averos/ui-platform@${averosUiPlatformVersion_}`)

      const npmInstallTestLibraryResult = spawnSync(
        'npm',
        [
          'install',
          `@averos/workflow@${averosVersion_}`,
          `@averos/ui-platform@${averosUiPlatformVersion_}`,
          `--@averos:registry=${localRegistry}`,
        ],
        {
          cwd: appPath,
          stdio: 'inherit',
          shell: true,
          env: {
            ...process.env,
          },
        },
      )

      if (npmInstallTestLibraryResult.error || npmInstallTestLibraryResult.status !== 0) {
        context.logger.error(
          `❌ Failed to install Test libraries (exit ${npmInstallTestLibraryResult.status ?? 'spawn error'}): ` +
            `${npmInstallTestLibraryResult.error?.message ?? ''}`,
        )
        throw new Error('Local Averos library install failed')
      } else {
        context.logger.info(
          `ℹ️ npm install @averos/workflow@${options.averosVersion} @averos/ui-platform@${options.averosVersion} executed successfully! `,
        )
      }
    }
    //////////////////// FOR TESTING PURPOSES END //////////////////////

    // Define libraries to add use specific averos version if specified
    const averosVersion = !options.averosVersion
      ? getDependencyLibVersion('@averos/workflow')
      : options.averosVersion
    
    const averosUiPlatformVersion = getDependencyLibVersion('@averos/ui-platform')

    const localizeVersion = getDependencyLibVersion('@angular/localize')
    const libraries = [`@averos/workflow@${averosVersion}`, `@averos/ui-platform${averosUiPlatformVersion}`, `@angular/localize@${localizeVersion}`]

    // Loop through each library and execute "ng add"
    libraries.forEach((lib) => {
      context.logger.info(`📦 Running "ng add ${lib}"...`)
      let optionsArray: string[] = []
      if (lib === `@averos/workflow@${averosVersion}`) {
        optionsArray = toAngularOptionsArray(options)
        if (!optionsArray.find((e) => e === '--defaults')) optionsArray.push('--defaults')
      }
      if (!optionsArray.find((e) => e === '--skip-confirmation'))
        optionsArray.push('--skip-confirmation')

      context.logger.info(`🔧 Using options: ${JSON.stringify(optionsArray)}`)

      const result = spawnSync('npx', ['ng', 'add', lib, ...optionsArray], {
        cwd: appPath,
        stdio: 'inherit',
        shell: true,
      })

      if (result.error) {
        context.logger.error(`❌ Failed to install ${lib}: ${result.error.message}`)
      }
    })

    return tree
  }
}

// Convert camelCase to kebab-case
const toKebabCase = (str: string) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

// Convert JSON options to CLI arguments with kebab-case keys
function toAngularOptionsArray(
  optionArray: CreateApplicationOption | Record<string, string | boolean | number>,
): string[] {
  return Object.entries(optionArray)
    .filter(([_, value]) => value !== undefined) // Remove undefined values
    .map(([key, value]) => `--${toKebabCase(key)}=${value}`)
}

/**
 * Retrieves dependency lib package version
 */
function getDependencyLibVersion(packageName: string): string {
  const version = (dependenciesLib as Record<string, string>)[packageName]

  if (!version) {
    throw new SchematicsException(`❌ Version not found for package: ${packageName}`)
  }

  return version
}
