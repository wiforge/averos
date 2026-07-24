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
} from '@angular-devkit/schematics'
import { getWorkspace } from '@schematics/angular/utility/workspace'
import { normalize, join } from '@angular-devkit/core'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import { findNodes } from '@schematics/angular/utility/ast-utils'
import * as ts from 'typescript'
import { getDecoratorMetadata, readIntoSourceFile, getMetadataField, findClassImplementationFilePath } from '../util'
import { AddLanguageOption } from './schema'
import { noop } from 'rxjs'

import { getTranslationKeys, getTranslationFlag } from './language-data'

export default function (options: AddLanguageOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:add-language"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.languageCode || options.languageCode.trim() === '') {
      throw new SchematicsException(`❌ language code is mandatory! Please provide one`)
    }

    if (
      options.languageCode &&
      options.languageCode.trim() !== 'ar' &&
      options.languageCode.trim() !== 'cn' &&
      options.languageCode.trim() !== 'en' &&
      options.languageCode.trim() !== 'es' &&
      options.languageCode.trim() !== 'fr' &&
      options.languageCode.trim() !== 'de' &&
      options.languageCode.trim() !== 'jp' &&
      options.languageCode.trim() !== 'nl' &&
      options.languageCode.trim() !== 'ru' &&
      options.languageCode.trim() !== 'se' &&
      options.languageCode.trim() !== 'no'
    ) {
      throw new Error(
        `❌ The language requested is not supported yet! Please submit a support request [https://github.com/averos-io/averos-io-starter/issues] so that it could be included in future releases.`,
      )
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
    if (options.srcPath === undefined) {
      options.srcPath = join(normalize(`${project.root}/`), 'src') //buildDefaultPath(project);
      context.logger.info(`✅ Using the default source path: ${options.srcPath}`)
    }

    context.logger.info(
      `🌱 << ${options.languageCode} >> language support will be added to the application...`,
    )

    return chain([addLanguageSupport(options)])
  }
}

export function addLanguageSupport(options: AddLanguageOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    // let modulePath = normalize(join(normalize(options.srcPath as string), '/app/app-module.ts'))
    const modulePath = findClassImplementationFilePath(host, 'AppModule', true);
    if (!host.exists(modulePath)) {
      throw new Error(
        `❌ Unable to find the main application module in the following location: ${modulePath}`,
      )
    }
    let i18nConfigFile = normalize(
      join(normalize(options.srcPath as string), `/assets/i18n/${options.languageCode}.json`),
    )

    let countryFlag = `${options.languageCode}.svg`
    if (options.languageCode && options.languageCode === 'en') {
      countryFlag = 'gb.svg'
    }
    if (options.languageCode && options.languageCode === 'ar') {
      countryFlag = 'ar.svg'
    }
    let i18nLanguageFlag = normalize(
      join(normalize(options.srcPath as string), `/assets/icons/svg/default/flags/${countryFlag}`),
    )

    // reading the json i18n file
    if (!host.exists(i18nConfigFile)) {
      host.create(i18nConfigFile, '{}')
    } else {
      context.logger.warn(
        `⚠️ The requested language <<${options.languageCode}>> is already configured!\n Skipping the language configuration \n`,
      )
      return noop()
    }

    if (!host.exists(i18nLanguageFlag)) {
      host.create(i18nLanguageFlag, '')
    }
    // insert a translation keys
    const insertTKeysChange = new InsertChange(
      i18nConfigFile,
      1,
      `${getTranslationKeys(options.languageCode)}`,
    )
    const tKeysRecorder = host.beginUpdate(i18nConfigFile)
    tKeysRecorder.insertLeft(insertTKeysChange.pos, insertTKeysChange.toAdd)

    // insert the language flag
    const insertLanguageFlagChange = new InsertChange(
      i18nLanguageFlag,
      0,
      `\n${getTranslationFlag(options.languageCode)}\n`,
    )
    const langFlagRecorder = host.beginUpdate(i18nLanguageFlag)
    langFlagRecorder.insertLeft(insertLanguageFlagChange.pos, insertLanguageFlagChange.toAdd)

    /// Register Language into the main app module
    let source = readIntoSourceFile(host, modulePath)

    const updateModuleLanguage = insertLanguage(source, modulePath, options, context)
    const changes = updateModuleLanguage
    const registerModuleLanguageRecorder = host.beginUpdate(modulePath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        registerModuleLanguageRecorder.insertLeft(change.pos, change.toAdd)
      }
    }
    // commit changes
    host.commitUpdate(registerModuleLanguageRecorder)
    host.commitUpdate(tKeysRecorder)
    host.commitUpdate(langFlagRecorder)

    context.logger.info(
      `✅ The << ${options.languageCode} >> language support has been successfully added to your application!`,
    )
  }
}

function insertLanguage(
  source: ts.SourceFile,
  modulePath: string,
  options: AddLanguageOption,
  context: SchematicContext,
): Change[] {
  if (!source || !modulePath) {
    return [new NoopChange()]
  }

  const nodes_ = getDecoratorMetadata(source, 'NgModule', '@angular/core')
  let node: any = nodes_[0]

  // Find the decorator declaration.
  if (!node) {
    return []
  }

  // Get all the children property assignment of object literals.
  const matchingProperties = getMetadataField(node, 'imports')

  if (matchingProperties.length === 0) {
    throw new Error(
      `❌ Could not register the language! Please check your averos project configuration.`,
    )
  }

  const supportedLanguageParameterNode = findNodes(source as any, ts.SyntaxKind.Identifier)?.find(
    (n) => n.getText() === 'supportedLanguages',
  )

  if (!supportedLanguageParameterNode || !supportedLanguageParameterNode.parent) {
    const averosCoreModuleNode = findNodes(node, ts.SyntaxKind.Identifier, 200, true)?.find(
      (n) => n.getText() === 'AverosCoreModule',
    )

    if (!averosCoreModuleNode) {
      throw new Error(
        `❌ Expected AverosCoreModule.forRoot() ${modulePath} was not found! \nPlease check your project configuration!`,
      )
    }

    const averosCoreModuleForRootNode = findNodes(
      node,
      ts.SyntaxKind.CallExpression,
      200,
      true,
    )?.find((n) =>
      n
        .getChildren()
        .find((c) =>
          findNodes(c, ts.SyntaxKind.Identifier, 200, true)?.find(
            (i) => i.getText() === 'AverosCoreModule',
          ),
        ),
    )

    if (!averosCoreModuleForRootNode) {
      throw new Error(
        `❌ Expected AverosCoreModule.forRoot() ${modulePath} was not found! \nPlease check your project configuration!`,
      )
    }

    let parameterUpdatePositionNode = averosCoreModuleForRootNode.getChildAt(2)

    if (!parameterUpdatePositionNode) {
      throw new Error(
        `❌ Expected AverosCoreModule.forRoot() ${modulePath} was not found! \nPlease check your project configuration!`,
      )
    } else {
      let data =
        parameterUpdatePositionNode.getChildren()?.length > 0
          ? `, supportedLanguages: ['${options.languageCode}']`
          : `{ supportedLanguages: ['${options.languageCode}']}`
      let createLanguageParameterChange = new InsertChange(
        modulePath,
        parameterUpdatePositionNode.getChildren()?.length > 0
          ? parameterUpdatePositionNode.getChildAt(0).getChildAt(1).getEnd()
          : parameterUpdatePositionNode.getEnd(),
        data,
      )
      return [createLanguageParameterChange]
    }
  } else {
    // define supportedLanguageParameterNode's sibling nodes and remove supportedLanguageParameterNode from it
    let supportedLanguageParameterNodeSiblings = supportedLanguageParameterNode.parent.getChildren()
    let supportedLanguageNodeIndex = supportedLanguageParameterNodeSiblings?.indexOf(
      supportedLanguageParameterNode,
    )
    supportedLanguageParameterNodeSiblings = supportedLanguageParameterNodeSiblings?.slice(
      supportedLanguageNodeIndex,
    )

    // get supportedLanguageParameter array literal expression from the siblings
    let supportedLanguageParameterArrayLiteralExpressionNode =
      supportedLanguageParameterNodeSiblings.find(
        (n) => n.kind === ts.SyntaxKind.ArrayLiteralExpression,
      )

    if (!supportedLanguageParameterArrayLiteralExpressionNode) {
      throw new SchematicsException(`❌ supportedLanguages array is not defined`)
    }

    // get supportedLanguages array node which is in the children of supportedLanguageParameterArrayLiteralExpressionNode and its kind of SyntaxList
    let supportedLanguageListNode = supportedLanguageParameterArrayLiteralExpressionNode
      .getChildren()
      .find((n) => n.kind === ts.SyntaxKind.SyntaxList)

    if (!supportedLanguageListNode) {
      throw new SchematicsException(`❌ supportedLanguages array is not defined`)
    }

    let data =
      supportedLanguageListNode.getWidth() > 0
        ? `, '${options.languageCode}'`
        : `'${options.languageCode}'`
    let registerLanguageChange = new InsertChange(
      modulePath,
      supportedLanguageListNode.getEnd(),
      data,
    )

    return [registerLanguageChange]
  }
}
