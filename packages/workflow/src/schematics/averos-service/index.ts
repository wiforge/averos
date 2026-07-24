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
  apply,
  url,
  applyTemplates,
  move,
  chain,
  mergeWith,
  SchematicContext,
  noop,
} from '@angular-devkit/schematics'
import { strings, normalize, join, getSystemPath } from '@angular-devkit/core'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { AverosServiceOption } from './schema'
import {
  addServiceClassToAverosEntityDecorator,
  classifyPreserveTrailingIndex,
  findClassImplementationFilePath,
  getImportPath,
  insertImport,
  insertImportAsTextChange,
  toValidIdentifier,
} from '../util'
import * as ts from 'typescript'
import { applyToUpdateRecorder, ReplaceChange } from '@schematics/angular/utility/change'

export default function (options: AverosServiceOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-service"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`Service Name is mandatory! Please provide one`)
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

    if (options.path === undefined) {
      options.path = buildDefaultPath(project)
    }

    if (!options.ename) {
      options.ename = 'any'
    }
    options.ename = toValidIdentifier(options.ename, 'class')
    options.name = toValidIdentifier(options.name, 'class')

    let serviceAlreadyExist = false
    const serviceFilePath = findClassImplementationFilePath(host, options.name)
    context.logger.info(`🔍Looking for Service with name ${options.name}...🔍`)

    if (serviceFilePath !== null && serviceFilePath !== undefined) {
      context.logger.info(
        `☑️ Found the Service ${options.name} in the following location ${serviceFilePath}`,
      )
      serviceAlreadyExist = true
    } else {
      context.logger.info(`☑️ Entity Service with name ${options.name} will be added...`)
    }

    const templatesPath = normalize(join(normalize(options.path), 'service') + '/')
    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        classifyPreserveTrailingIndex,
        getRelatedEntityPath,
        toLowerCase,
        ...options,
      }),
      move(getSystemPath(templatesPath)),
    ])

    return chain([
      !serviceAlreadyExist ? mergeWith(templateSource) : noop(),
      options.assignToEntity ? assignServiceToEntity(options) : noop(),
    ])
  }
}

function getRelatedEntityPath(path: string): string {
  return join(normalize('../'), 'model')
}

function toLowerCase(str: string): string {
  return str ? str.toLowerCase() : ''
}

function assignServiceToEntity(options: AverosServiceOption): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const entityFilePath = findClassImplementationFilePath(tree, options.ename)

    _context.logger.info(`☑️ Assigning the service ${options.name} to the entity ${options.ename}`)
    if (!entityFilePath) {
      throw new Error(`Class ${options.ename} not found in the project.`)
    }
    if (options.path === null || options.path === undefined) {
      throw new Error(`Cannot retrieve the project source path.`)
    }

    const sourceFile = ts.createSourceFile(
      entityFilePath,
      tree.read(entityFilePath)!.toString(),
      ts.ScriptTarget.Latest,
      true,
    )
    let serviceFilePath = findClassImplementationFilePath(tree, options.name)
    if (serviceFilePath === null) {
      _context.logger.info(`Class '${options.name}' implementation file not found in the project.`)
      serviceFilePath = normalize(join(normalize(options.path), 'service') + '/')
      _context.logger.info(`Using the default service file path: '${serviceFilePath}'`)
    }
    let relativeServicePath = getImportPath(tree, entityFilePath, serviceFilePath)
    if (relativeServicePath === null || relativeServicePath === undefined) {
      throw new Error(`Cannot retrieve ${options.name} service source file path.`)
    }
    const insertChange = insertImportAsTextChange(sourceFile, options.name, relativeServicePath)

    const decoratorChange = addServiceClassToAverosEntityDecorator(
      sourceFile,
      entityFilePath,
      options.ename,
      options.name,
    )
    let changes: (ts.TextChange | ReplaceChange)[] = []
    changes.push(...insertChange)
    if (decoratorChange) {
      changes.push(decoratorChange)
    }

    applyChanges(tree, entityFilePath, changes)
    _context.logger.info(`☑️ Service ${options.name} assigned to the entity ${options.ename}`)
    return tree
  }
}

function applyChanges(tree: Tree, filePath: string, changes: (ts.TextChange | ReplaceChange)[]) {
  const recorder = tree.beginUpdate(filePath)

  for (const change of changes) {
    if (change instanceof ReplaceChange) {
      applyToUpdateRecorder(recorder, [change])
    } else {
      recorder.insertLeft(change.span.start, change.newText)
    }
  }

  tree.commitUpdate(recorder)
}
