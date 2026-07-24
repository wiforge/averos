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
  apply,
  url,
  applyTemplates,
  move,
  chain,
  mergeWith,
  SchematicContext,
  MergeStrategy,
  SchematicsException,
} from '@angular-devkit/schematics'
import { normalize, join } from '@angular-devkit/core'
import { getWorkspace } from '@schematics/angular/utility/workspace'
import { NgAddOption } from './schema'
import {
  getDefaultIconsConfig,
  getDefaultIconsTheme,
  getFilledIconsTheme,
  getOutlinedIconsTheme,
} from './default-icons'

export default function (options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (!options.projectRootPath) {
      throw new SchematicsException(
        `❌ Cannot find a valid project root path! Make sure to run the command inside an angular project.`,
      )
    }

    const templatesPath = normalize(join(normalize(options.projectRootPath), 'src'))

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...options,
      }),

      move(templatesPath),
    ])

    return chain([
      mergeWith(templateSource, MergeStrategy.Overwrite),
      updateAngularJSON(options),
      addCoreIcons(options),
      (options: any) => {
        return async (host: Tree, context: SchematicContext) => {
          context.logger.info(
            `🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉   GOOD JOB!  🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉`,
          )
          context.logger.info(
            `🎉                                                                                                      🎉`,
          )
          context.logger.info(
            `🎉  Congratulations! Your averos project is ready to grow! Go ahead and grow your business!             🎉`,
          )
          context.logger.info(
            `🎉                                                                                                      🎉`,
          )
          context.logger.info(
            `🎉                           🔥  Enjoy your AVEROS journey!  🔥                                         🎉`,
          )
          context.logger.info(
            `🎉                                                                                                      🎉`,
          )
          context.logger.info(
            `🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉`,
          )
        }
      },
    ])(host, context)
  }
}

function updateAngularJSON(options: NgAddOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let angularJSONFile = normalize(
      join(normalize(options.projectRootPath as string), `angular.json`),
    )
    if (!host.exists(angularJSONFile)) {
      throw new Error(
        `❌ Unable to find angular.json on the following location: ${angularJSONFile}!\n Make sure you are in an angular project!`,
      )
    } else {
      // add averos style
      const angularjsonFile = host.read(angularJSONFile)

      if (!angularjsonFile) {
        throw new Error(
          `❌ No angular.json file found for this project! Please make sure this is an angular project.`,
        )
      }
      let fileUpdated = false
      // if(!angularjsonFile.includes('stylePreprocessorOptions')){
      let angularJSONData = JSON.parse(angularjsonFile.toString())

      const workspace = await getWorkspace(host)
      let projectName = workspace.projects.keys().next().value

      // configure @angular/localize/init in polyfills
      if (angularJSONData?.projects[`${projectName}`]?.architect?.build?.options) {
        angularJSONData.projects[`${projectName}`].architect.build.options.polyfills = [
          'zone.js',
          '@angular/localize/init',
        ]
        fileUpdated = true
      }
      if (angularJSONData?.projects[`${projectName}`]?.architect?.test?.options) {
        angularJSONData.projects[`${projectName}`].architect.build.options.polyfills = [
          'zone.js',
          '@angular/localize/init',
        ]
        fileUpdated = true
      }

      // Add assets/favicon.ico to the assets
      if (angularJSONData?.projects[`${projectName}`]?.architect?.build?.options?.assets) {
        angularJSONData.projects[`${projectName}`].architect.build.options.assets = [
          {
            glob: '**/*',
            input: 'public',
          },
          'src/favicon.ico',
          'src/assets',
        ]
        fileUpdated = true
      }
      if (angularJSONData?.projects[`${projectName}`]?.architect?.test?.options?.assets) {
        angularJSONData.projects[`${projectName}`].architect.test.options.assets = [
          {
            glob: '**/*',
            input: 'public',
          },
          'src/favicon.ico',
          'src/assets',
        ]
        fileUpdated = true
      }

      //Add StylePreprocessorOptions attributes to angular.json file
      if (
        !angularJSONData?.projects[`${projectName}`]?.architect?.build?.options
          ?.stylePreprocessorOptions
      ) {
        angularJSONData.projects[
          `${projectName}`
        ].architect.build.options.stylePreprocessorOptions = {
          includePaths: ['node_modules', 'src/assets/styles'],
        }
        fileUpdated = true
      }

      //Add allowedCommonJsDependencies attribute to angular.json file
      if (
        !angularJSONData?.projects[`${projectName}`]?.architect?.build?.options
          ?.allowedCommonJsDependencies
      ) {
        angularJSONData.projects[
          `${projectName}`
        ].architect.build.options.allowedCommonJsDependencies = ['file-saver']
        fileUpdated = true
      }

      //Update build budget for production
      if (
        !!angularJSONData?.projects[`${projectName}`]?.architect?.build?.configurations?.production
          ?.budgets
      ) {
        angularJSONData.projects[
          `${projectName}`
        ].architect.build.configurations.production.budgets = [
          {
            type: 'initial',
            maximumWarning: '5mb',
            maximumError: '7mb',
          },
          {
            type: 'anyComponentStyle',
            maximumWarning: '6kb',
            maximumError: '10kb',
          },
        ]
        fileUpdated = true
      }

      if (fileUpdated) {
        host.overwrite(angularJSONFile, JSON.stringify(angularJSONData))
      }
      // }

      context.logger.info(`✅ Your application angular.json file was updated successfully!`)
    }
  }
}

function addCoreIcons(options: NgAddOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    options.srcPath = normalize(join(normalize(options.projectRootPath), 'src'))
    context.logger.info(
      `✅ Using the default application source path for icons: ${options.srcPath}`,
    )

    let iconsConfigFile = normalize(
      join(normalize(options.srcPath as string), `/assets/icons/svg/icons.json`),
    )
    // reading the json icon configuration file
    if (!host.exists(iconsConfigFile)) {
      host.create(iconsConfigFile, '{}')
    }
    // create default theme icons
    getDefaultIconsTheme().forEach((iconMetadata) => {
      let svgIcon = normalize(
        join(
          normalize(options.srcPath as string),
          `/assets/icons/svg/default/${iconMetadata.iconName}.svg`,
        ),
      )
      if (!host.exists(svgIcon)) {
        host.create(svgIcon, '')
      }
      // create the icon
      host.overwrite(svgIcon, iconMetadata.iconContent)
    })
    // create filled theme icons
    getFilledIconsTheme().forEach((iconMetadata) => {
      let svgIcon = normalize(
        join(
          normalize(options.srcPath as string),
          `/assets/icons/svg/filled/${iconMetadata.iconName}.svg`,
        ),
      )
      if (!host.exists(svgIcon)) {
        host.create(svgIcon, '')
      }
      // create the icon
      host.overwrite(svgIcon, iconMetadata.iconContent)
    })
    // create outlined theme icons
    getOutlinedIconsTheme().forEach((iconMetadata) => {
      let svgIcon = normalize(
        join(
          normalize(options.srcPath as string),
          `/assets/icons/svg/outlined/${iconMetadata.iconName}.svg`,
        ),
      )
      if (!host.exists(svgIcon)) {
        host.create(svgIcon, '')
      }
      // create the icon
      host.overwrite(svgIcon, iconMetadata.iconContent)
    })
    // insert icons.json config file
    host.overwrite(iconsConfigFile, getDefaultIconsConfig())
    context.logger.info(`✅ Default icons template was successfully added to your application!`)
  }
}
