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
  schematic,
  noop,
} from '@angular-devkit/schematics'
import { strings } from '@angular-devkit/core'
import { AdvancedCRUDOption } from './schema'

import { AverosEntityOption } from '../averos-entity/schema'
import { CreateEntityUCOption } from '../create-entity-uc/schema'
import { SearchEntityUCOption } from '../search-entity-uc/schema'
import { join, normalize } from 'path'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { findClassImplementationFilePath, getServiceName, toValidIdentifier } from '../util'
import * as ts from 'typescript'

export default function (options: AdvancedCRUDOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:advanced-crud"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
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

    let entityAlreadyExists = false
    if (!options.ename || options.ename.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }
    // transform the class name into a valid class identifier
    options.ename = toValidIdentifier(options.ename, 'class')

    // Check wether the use case is already created
    const createUseCaseFilePath = findClassImplementationFilePath(
      host,
      strings.classify(`Create${options.ename}`),
    )
    const searcheUseCaseFilePath = findClassImplementationFilePath(
      host,
      strings.classify(`Search${options.ename}`),
    )
    if (createUseCaseFilePath || searcheUseCaseFilePath) {
      context.logger.info(
        `⚠️ The advanced crud use case does already exist!\n ⏭️ Skipping the use case creation \n`,
      )
      return noop()
    }

    //Retrieve the related service if it already exists
    if ((!options.sname || options.sname === undefined) && options.ename) {
      let entityFilePath = normalize(
        join(normalize(options.path as string), `model/${strings.dasherize(options.ename)}.ts`),
      )

      const text = host.read(entityFilePath)
      if (text !== null) {
        const sourceText = text.toString('utf-8')
        let entitySource = ts.createSourceFile(
          entityFilePath,
          sourceText,
          ts.ScriptTarget.Latest,
          true,
        )

        let sname = getServiceName(entitySource)
        if (sname && sname !== '') {
          // if (sname.endsWith("Service")){
          //   sname = sname.slice(0, sname.length - 7)
          // }
          options.sname = sname
        } else {
          // Create a default service name

          options.sname = `${options.ename}Service`
          context.logger.info(`✅ Using the default entity service: ${options.sname}`)
        }
      } else {
        // Create a default service name
        options.sname = `${options.ename}Service`
        context.logger.info(`✅ Using the default entity service: ${options.sname}`)
      }
    }

    context.logger.info(
      `⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️  STARTING A NEW AVEROS WORKFLOW : CREATE AVEROS ADVANCED CRUD COMPONENTS  ⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️⚙️`,
    )
    let averosEntityOptions: AverosEntityOption = {
      name: options.ename,
      sname: options.sname,
      createService: true,
    }
    let createEntityUCOptions: CreateEntityUCOption = {
      name: `Create${options.ename}`,
      ename: options.ename,
      sname: options.sname,
    }
    let searchEntityUCOptions: SearchEntityUCOption = {
      name: `Search${options.ename}`,
      ename: options.ename,
      sname: options.sname,
    }
    const templatesPath = normalize(join(normalize(options.path), 'model') + '/')
    const entityRelativePath = `${templatesPath}/${strings.dasherize(options.ename)}.ts`

    if (host.exists(entityRelativePath)) {
      entityAlreadyExists = true
    }

    return chain([
      entityAlreadyExists ? noop() : schematic('averos-entity', averosEntityOptions),
      schematic('create-entity-uc', createEntityUCOptions),
      schematic('search-entity-uc', searchEntityUCOptions),
      (options: any) => {
        return async (host: Tree, context: SchematicContext) => {
          context.logger.info(
            `🎉🎉🎉🎉🎉🎉🎉  Congratulations! Your AVEROS ADVANCED CRUD have been implemented successfully! Enjoy!  🎉🎉🎉🎉🎉🎉🎉`,
          )
        }
      },
    ])
  }
}
