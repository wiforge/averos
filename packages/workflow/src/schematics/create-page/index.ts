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
  apply,
  url,
  applyTemplates,
  move,
  chain,
  MergeStrategy,
  mergeWith,
  externalSchematic,
  noop,
  schematic,
} from '@angular-devkit/schematics'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { strings, normalize, basename, dirname, join } from '@angular-devkit/core'
import {
  classifyPreserveTrailingIndex,
  findClassImplementationFilePath,
  labelize,
  toValidIdentifier,
} from '../util'
import { CreatePageOptions } from './schema'

export default function (options: CreatePageOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:create-page"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`❌ The Page Name is mandatory! Please provide one`)
    }
    options.name = toValidIdentifier(options.name, 'class')

    const pageFilePath = findClassImplementationFilePath(host, strings.classify(options.name))
    if (pageFilePath) {
      context.logger.info(
        `⚠️ The Page ${strings.classify(options.name)} does already exist!\n ⏭️ Skipping the Page creation \n`,
      )
      return noop()
    }
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

    let registerRouteAndMenuOptions = {
      name: options.name,
      path: options.path,
      project: options.project,
      space: options.space,
      targetMenu: options.targetMenu,
      updateRouteMenu: options.updateRouteMenu,
      projectRootPath: options.projectRootPath,
    }

    options.path = normalize(
      '/' + dirname(join(normalize(options.path), '/view', basename(normalize(options.name)))),
    )

    let ngCreatePageComponentOptions = {
      name: options.name,
      path: join(normalize(options.path)),
      project: options.project,
      style: 'scss',
      standalone: false,
    }

    context.logger.info(`🌱 A new page seed named ${options.name} is being sown...`)

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        classifyPreserveTrailingIndex,
        getRelatedEntityPath,
        getRelatedEntityServicePath,
        toLowerCase,
        labelize,
        ...options,
      }),

      move(options.path),
    ])

    return chain([
      externalSchematic('@schematics/angular', 'component', ngCreatePageComponentOptions),
      mergeWith(templateSource, MergeStrategy.Overwrite),
      options.updateRouteMenu
        ? schematic('update-route-menu', registerRouteAndMenuOptions)
        : noop(),
      (options: any) => {
        return async (host: Tree, context: SchematicContext) => {
          context.logger.info(
            `🎉🎉🎉🎉🎉  Congratulations! Your new page is created successfully! 🎉🎉🎉🎉🎉`,
          )
        }
      },
    ])
  }
}

function getRelatedEntityPath(path: string): string {
  return join(normalize('../../../'), 'model')
}

function getRelatedEntityServicePath(path: string): string {
  return join(normalize('../../../'), 'service')
}

function toLowerCase(str: string): string {
  return str ? str.toLowerCase() : ''
}
