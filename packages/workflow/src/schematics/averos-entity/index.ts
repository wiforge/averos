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
  schematic,
  DirEntry,
  noop,
  callRule,
} from '@angular-devkit/schematics'

import { strings, normalize, join, getSystemPath } from '@angular-devkit/core'

import { findNodes } from '@schematics/angular/utility/ast-utils'

import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import { AverosEntityOption } from './schema'
import { AverosServiceOption } from '../averos-service/schema'
import {
  readIntoSourceFile,
  insertImport,
  toValidIdentifier,
  classifyPreserveTrailingIndex,
} from '../util'

import * as ts from 'typescript'
import { lastValueFrom } from 'rxjs'

export default function (options: AverosEntityOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-entity"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    /// Option Setup //////////////
    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }
    // transform the class name into a valid class identifier
    options.name = toValidIdentifier(options.name, 'class')

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

    if (!options.sname || options.sname === 'noname') {
      options.sname = `${options.name}Service`
    }
    ///// END Option Setup////////////////////////

    let soptions: AverosServiceOption = {
      name: options.sname,
      ename: options.name,
    }

    if (options.createService) {
      soptions.assignToEntity = true
    }
    const templatesPath = normalize(join(normalize(options.path), 'model') + '/')
    const entityRelativePath = `${templatesPath}/${strings.dasherize(options.name)}.ts`

    if (host.exists(entityRelativePath)) {
      // throw new SchematicsException(`❌ Entity ${options.name} is already created! : ${entityRelativePath} `);
      context.logger.warn(
        `⚠️ Entity ${options.name} is already created! : ${entityRelativePath} \n ⏭️ Skipping the entity creation \n`,
      )
      return noop()
    }
    context.logger.info(`🌱 Entity seeds named ${options.name} are being sown...`)
    context.logger.info(`🌱 Entity Service seeds named ${options.sname} are being sown...`)
    context.logger.info(`🌱 Entity View layout default configuration seeds are being sown...`)

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        classifyPreserveTrailingIndex,
        getRelatedServicePath,
        ...options,
      }),

      move(getSystemPath(templatesPath)),
    ])

    // Eagerly apply mergeWith into the host Tree RIGHT NOW
    // so all subsequent rules in the chain see the new entity file
    // via tree.visit() / tree.read()
    context.logger.info(`_________COMMITTING THE ENTITY TREE______________`)
    await lastValueFrom(callRule(mergeWith(templateSource), host, context))

    return chain([
      // No mergeWith here anymore — already applied above
      registerEntity(options),
      createDefaultEntityViewLayout(options),
      createDefaultTranslationKeys(options),
      options.createService ? schematic('averos-service', soptions) : noop(),
    ])
  }
}

function getRelatedServicePath(path: string): string {
  return join(normalize('../'), 'service')
}

export function registerEntity(options: AverosEntityOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(
      `☑️ Entity with name ${options.name} will be Registered in the Averos framework...`,
    )

    let applicationInitializerPath = normalize(
      join(normalize(options.path as string), 'service/application-initializer.service.ts'),
    )
    if (!host.exists(applicationInitializerPath)) {
      throw new SchematicsException(
        `❌ Unable to find averos application initializer service in the following location: ${applicationInitializerPath}`,
      )
    }
    let source = readIntoSourceFile(host, applicationInitializerPath)

    const updateRegisteredEntityImp = insertImport(
      source as any,
      applicationInitializerPath,
      options.name,
      `../model/${strings.dasherize(options.name)}`,
    )
    const updateRegisteredEntityCol = updateRegisteredEntityCollectionMember(
      source,
      applicationInitializerPath,
      options,
    )
    const changes = [updateRegisteredEntityImp, updateRegisteredEntityCol]
    const recorder = host.beginUpdate(applicationInitializerPath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd)
      }
    }
    host.commitUpdate(recorder)
  }
}

function updateRegisteredEntityCollectionMember(
  source: ts.SourceFile,
  appInitializerPath: string,
  options?: any,
): Change {
  if (!source || !appInitializerPath) {
    return new NoopChange()
  }

  // const nodes = source.statements;
  const registeredEntitiesNode = findNodes(source as any, ts.SyntaxKind.Identifier).find(
    (n) => n.getText() === 'registeredEntities',
  )

  if (!registeredEntitiesNode || !registeredEntitiesNode.parent) {
    throw new SchematicsException(
      `❌ Expected registeredEntities variable in ${appInitializerPath}`,
    )
  }
  // define registeredEntitiesNode's sibling nodes and remove registeredEntitiesNode from it
  let registeredEntitiesSiblings = registeredEntitiesNode.parent.getChildren()
  let registeredEntitiesNodeIndex = registeredEntitiesSiblings.indexOf(registeredEntitiesNode)
  registeredEntitiesSiblings = registeredEntitiesSiblings.slice(registeredEntitiesNodeIndex)

  // get registeredEntities array literal experssion from the siblings, this means this sign "["
  let registeredEntitiesArrayLiteralExpressionNode = registeredEntitiesSiblings.find(
    (n) => n.kind === ts.SyntaxKind.ArrayLiteralExpression,
  )

  if (!registeredEntitiesArrayLiteralExpressionNode) {
    throw new SchematicsException(`❌ registeredEntities is not defined`)
  }

  // get registeredEntities array list node which is in the children of registeredEntitiesArrayLiteralExpressionNode and its kind of SyntaxList
  let registeredEntitiesListNode = registeredEntitiesArrayLiteralExpressionNode
    .getChildren()
    .find((n) => n.kind === ts.SyntaxKind.SyntaxList)

  if (!registeredEntitiesListNode) {
    throw new SchematicsException(`❌ registeredEntities is not defined`)
  }

  return new InsertChange(
    appInitializerPath,
    registeredEntitiesListNode.getEnd(),
    `${registeredEntitiesListNode.getChildCount() > 0 ? ',' : ''.trim()} ${options?.name}.instanceMetadata()`,
  )
}

export function createDefaultEntityViewLayout(options: AverosEntityOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let entityVLFile = normalize(
      join(
        normalize(options.projectRootPath as string),
        `src/assets/viewlayout/${options.name.toLocaleLowerCase()}VL.json`,
      ),
    )

    // reading the json i18n file
    if (!host.exists(entityVLFile)) {
      host.create(entityVLFile, '')
    } else {
      throw new Error(
        `❌ The requested entity view layout config related to the entity <<${options.name}>> is already configured! (${entityVLFile})`,
      )
    }

    // insert a translation keys
    const insertEntityVLKeysChange = new InsertChange(
      entityVLFile,
      0,
      `${getEntityVLKeys(options.name)}`,
    )
    const tKeysRecorder = host.beginUpdate(entityVLFile)
    tKeysRecorder.insertLeft(insertEntityVLKeysChange.pos, insertEntityVLKeysChange.toAdd)
    // commit changes
    host.commitUpdate(tKeysRecorder)

    context.logger.info(
      `✅ The Entity View Layout related to << ${options.name} >> has been successfully configured!`,
    )
  }
}

function getEntityVLKeys(entityName: string) {
  return `{
    "defaultUCViewLayout": {
    },
    "searchInputUCViewLayout": {
        "orderedView": true,
        "title": "Search ${entityName}",
        "titleTranslationID": "uc.search.${entityName.toLowerCase()}.title",
        "parentEntityLabel": "Search Criteria",
        "parentEntityLabelTranslationId": "uc.search.${entityName.toLowerCase()}.label",
        "iconOrientation": "SUFFIX",
        "ucViewLayout": [
        {
          "entityFieldName": "_entityCreatedAt",
          "visible": true,
          "label": "Creation Date",
          "labelTranslationID": "${entityName.toLowerCase()}.createdat",
          "placeholder": "ex. 01/01/2001 10:00",
          "placeholderTranslationID": "",
          "format": "dd-MM-yyyy HH:mm",
          "type": "date",
          "icon": "calendar_month",
          "order": 3,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        }
      ]
      
    },
    "tableUCViewLayout": {
      "orderedView": false,
      "title": "${entityName} Search Result",
      "titleTranslationID": "app.search.result",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityCreatedAt",
          "label": "Creation Date",
          "labelTranslationID": "${entityName.toLowerCase()}.createdat",
          "type": "date",
          "format": "dd-MM-yyyy HH:mm:sss",
          "visible": true,
          "order": 5
        },
        {
          "entityFieldName": "_entityUpdatedAt",
          "label": "Update Date",
          "labelTranslationID": "${entityName.toLowerCase()}.updatedat",
          "type": "date",
          "format": "dd-MM-yyyy HH:mm:sss",
          "visible": true,
          "order": 6
        }
      ]
      
    },
    "selectableInputTableUCViewLayout": {
      "orderedView": false,
      "title": "${entityName} Search Result",
      "titleTranslationID": "app.search.result",
      "ucViewLayout": [
      ]
    },
    "viewUCViewLayout": {
      "orderedView": true,
      "title": "View ${entityName}",
      "titleTranslationID": "uc.view.${entityName.toLocaleLowerCase()}.title",
      "parentEntityLabel": "${entityName} Details",
      "parentEntityLabelTranslationId": "uc.view.${entityName.toLocaleLowerCase()}.label",
      "iconOrientation": "SUFFIX",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityCreatedAt",
          "label": "Creation Date",
          "labelTranslationID": "${entityName.toLocaleLowerCase()}.createdat",
          "visible": true,
          "format": "dd-MM-yyyy HH:mm:sss",
          "type": "date",
          "icon": "calendar_month",
          "order": 4,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        }
      ]
    },
    "createUCViewLayout": {
      "orderedView": true,
      "title": "Create ${entityName}",
      "titleTranslationID": "uc.create.${entityName.toLocaleLowerCase()}.title",
      "parentEntityLabel": "${entityName} Details",
      "parentEntityLabelTranslationId": "uc.create.${entityName.toLocaleLowerCase()}.label",
      "iconOrientation": "SUFFIX",
      "ucViewLayout": [  ]
    },
    "editUCViewLayout": {
        "orderedView": true,
        "title": "Edit ${entityName}",
        "titleTranslationID": "uc.edit.${entityName.toLocaleLowerCase()}.title",
        "parentEntityLabel": "${entityName} Details",
        "parentEntityLabelTranslationId": "uc.edit.${entityName.toLocaleLowerCase()}.label",
        "iconOrientation": "SUFFIX",
        "ucViewLayout": [ ]
    }
  }`
}

export function createDefaultTranslationKeys(options: AverosEntityOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let translationFilesLocation = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/i18n/`),
    )

    let dirEntry: DirEntry = host.getDir(translationFilesLocation)

    let translationFilesDirEntry = dirEntry.subfiles
    translationFilesDirEntry.forEach((tFile) => {
      let translationFile = normalize(join(normalize(dirEntry.path), tFile))

      if (!host.exists(translationFile)) {
        throw new Error(
          `❌ No Translation properties found for this project! Please use ng g @averos/workflow:add-language in order to activate averos translation support for your angular project.`,
        )
      }

      let translationContent = host.read(translationFile)

      if (!translationContent) {
        throw new Error(
          `❌ No Translation properties found for this project! Please use ng g @averos/workflow:add-language in order to activate averos translation support for your angular project.`,
        )
      }
      let translationData = JSON.parse(translationContent.toString())

      if (!translationData[`${options.name.toLocaleLowerCase()}.name`]) {
        translationData[`${options.name.toLocaleLowerCase()}.name`] = 'Name'
      }
      if (!translationData[`${options.name.toLocaleLowerCase()}.description`]) {
        translationData[`${options.name.toLocaleLowerCase()}.description`] = 'Description'
      }
      if (!translationData[`${options.name.toLocaleLowerCase()}.createdat`]) {
        translationData[`${options.name.toLocaleLowerCase()}.createdat`] = 'Creation Date'
      }
      if (!translationData[`${options.name.toLocaleLowerCase()}.updatedat`]) {
        translationData[`${options.name.toLocaleLowerCase()}.updatedat`] = 'Update Date'
      }
      if (!translationData[`${options.name.toLocaleLowerCase()}.createdby`]) {
        translationData[`${options.name.toLocaleLowerCase()}.createdby`] = 'Creator'
      }
      if (!translationData[`${options.name.toLocaleLowerCase()}.updatedby`]) {
        translationData[`${options.name.toLocaleLowerCase()}.updatedby`] = 'Updator'
      }

      host.overwrite(translationFile, JSON.stringify(translationData))
    })

    context.logger.info(
      `✅ Default translation entries values have been created for this Entity!\nPlease note that these translation entries are by default created for all existing configured languages (including the default one).\nIn order to update a translation entry value use the command:\n{ ng g @averos/workflow:add-translation-entry --lang=[LANGUAGE] --key=[KEY] --value=[valueInTargetLang] }`,
    )
  }
}
