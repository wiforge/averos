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
} from '@angular-devkit/schematics'

import { strings, normalize, join } from '@angular-devkit/core'

import { findNodes } from '@schematics/angular/utility/ast-utils'

import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import { AverosAddEnumValuesOption } from './schema'
import { readIntoSourceFile, insertImport, EntityViewLayout, toValidIdentifier } from '../util'

import * as ts from 'typescript'

export default function (options: AverosAddEnumValuesOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    if (!options.ename || options.ename.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }

    if (!options.mname || options.mname.trim() === '') {
      throw new SchematicsException(`❌ The field type is mandatory! Please provide one`)
    }

    // transform the class name into a valid class identifier
    options.ename = toValidIdentifier(options.ename, 'class')
    // transform the member name into a valid member name
    options.mname = toValidIdentifier(options.mname)

    if (!options.listOfEnumValues || options.listOfEnumValues.trim() === '') {
      throw new SchematicsException(
        `❌ The field enumeration values are mandatory! Please provide them`,
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
    if (options.path === undefined) {
      options.path = buildDefaultPath(project)
      context.logger.info(`✅ Using the default path: ${options.path}`)
    }

    ///// END Option Setup////////////////////////

    const templatesPath = normalize(join(normalize(options.path), 'model') + '/')
    const entityRelativePath = `${templatesPath}/${strings.dasherize(options.ename)}.ts`

    if (!host.exists(entityRelativePath)) {
      throw new SchematicsException(
        `❌ Entity ${options.ename} does not exist in the following location: ${entityRelativePath} `,
      )
    }
    context.logger.info(
      `🌱 Entity field seeds named ${options.mname} of ype Enumeration is being sown...`,
    )
    context.logger.info(`🌱 Entity View layout default configuration seeds are being sown...`)

    return chain([
      registerEnumeration(options),
      registerEnumMember(options),
      addDefaultMemberViewLayoutToEntityVL(options),
      createDefaultTranslationKeys(options),
    ])
  }
}

export function registerEnumeration(options: AverosAddEnumValuesOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let enumFieldName = `${options.ename}${options.mname}`

    let enumTypeFilePath = normalize(
      join(normalize(options.path as string), `model/${strings.dasherize(enumFieldName)}.ts`),
    )
    if (!host.exists(enumTypeFilePath)) {
      context.logger.info(`☑️ Enum with name ${enumFieldName} will be created...`)
    } else {
      context.logger.info(
        `☑️ Enum with name ${enumFieldName} already exists! Proceding with the existing enum...`,
      )
      return
    }

    let enumerations = options.listOfEnumValues.split(',')

    let addedEnumFields: string[] = []
    let enumerationvalues = enumerations.reduce((p: string, c: string) => {
      let enumFieldName = c.toUpperCase()
      if (addedEnumFields.indexOf(enumFieldName) < 0) {
        addedEnumFields.push(enumFieldName)

        let enumFieldValue = strings.capitalize(c)
        let enumFieldEntry = `${enumFieldName} = '${enumFieldValue}'`
        if (p === '') {
          p = p.concat(`${enumFieldEntry}`)
        } else {
          p = p.concat(`, \n    ${enumFieldEntry}`)
        }
      }

      return p
    }, '')

    host.create(
      enumTypeFilePath,
      `\n
export enum ${enumFieldName} {
            
    ${enumerationvalues}

}`,
    )

    const recorder = host.beginUpdate(enumTypeFilePath)
    host.commitUpdate(recorder)
  }
}

export function registerEnumMember(options: AverosAddEnumValuesOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`☑️ Entity with name ${options.ename} will be Updated...`)

    let enumFieldName = `${options.ename}${options.mname}`

    let entityFilePath = normalize(
      join(normalize(options.path as string), `model/${strings.dasherize(options.ename)}.ts`),
    )
    if (!host.exists(entityFilePath)) {
      throw new SchematicsException(
        `❌ Unable to find the averos entity << ${enumFieldName} >> in the following location: ${entityFilePath}`,
      )
    }
    let source = readIntoSourceFile(host, entityFilePath)

    const importMemberEntityType = insertImport(
      source as any,
      entityFilePath,
      enumFieldName,
      `./${strings.dasherize(enumFieldName)}`,
    )
    const updateEntityWithNewMember = addMemberToEntity(source, entityFilePath, options, context)
    const changes = [importMemberEntityType, updateEntityWithNewMember]
    const recorder = host.beginUpdate(entityFilePath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd)
      }
    }
    host.commitUpdate(recorder)
  }
}

function addMemberToEntity(
  source: ts.SourceFile,
  entityPath: string,
  options: AverosAddEnumValuesOption,
  context: SchematicContext,
): Change {
  if (!source || !entityPath) {
    return new NoopChange()
  }
  let memberName = options.mname
  const classDeclarationNode = source.statements.find(
    (n) => n.kind == ts.SyntaxKind.ClassDeclaration,
  )
  if (!classDeclarationNode) {
    // no entity class declaration found
    throw new Error(`❌ No Class Declaration Found!`)
  }
  const propertiesDeclarationNodes__ = findNodes(
    source as any,
    ts.SyntaxKind.PropertyDeclaration,
  ) as unknown as ts.DeclarationStatement[]
  const memberDeclaration = propertiesDeclarationNodes__?.find(
    (n: ts.DeclarationStatement) => n.name?.text === memberName,
  )
  if (memberDeclaration) {
    // Member already declared
    // throw new Error(
    //   `❌ Member << ${memberName} >> is already declared in the entity << ${options.ename} >>!`
    // )
    context.logger.warn(
      `⚠️ Field {${memberName}} is already declared in the entity  {${options.ename}} !\n ⏭️ Skipping the field creation \n`,
    )
    return new NoopChange()
  }
  // add the new member declaration to the entity
  let positionToInsertMember = classDeclarationNode
    .getChildAt(classDeclarationNode.getChildCount() - 3)
    .getEnd()
  if (propertiesDeclarationNodes__ && propertiesDeclarationNodes__.length > 0) {
    positionToInsertMember = propertiesDeclarationNodes__.reduce((previous: number, current) => {
      return previous + current.getFullWidth()
    }, positionToInsertMember)
  }
  let enumFieldName = `${options.ename}${options.mname}`
  let data = `\n    ${memberName.concat(`!: ${enumFieldName}`)};\n`
  return new InsertChange(entityPath, positionToInsertMember, data)
}

export function addDefaultMemberViewLayoutToEntityVL(options: AverosAddEnumValuesOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let entityVLFile = normalize(
      join(
        normalize(options.projectRootPath as string),
        `src/assets/viewlayout/${options.ename.toLocaleLowerCase()}VL.json`,
      ),
    )

    if (!host.exists(entityVLFile)) {
      throw new Error(
        `❌ The requested entity view layout config related to the entity <<${options.ename}>>does not exist!\n Is the entity provided an averos entity?`,
      )
    }

    let vlContent = host.read(entityVLFile)
    if (!vlContent) {
      return
    }
    let entityViewLayout: EntityViewLayout = JSON.parse(vlContent.toString())
    updateDefaultEntityViewLayout(entityViewLayout, options)
    host.overwrite(entityVLFile, JSON.stringify(entityViewLayout))
    context.logger.info(
      `✅ Member {${options.mname}} view layout have been successfully added to {${options.ename}} Entity View Layout!`,
    )
  }
}

function updateDefaultEntityViewLayout(
  viewLayoutContent: EntityViewLayout,
  options: AverosAddEnumValuesOption,
) {
  let entityFieldName = options.mname
  let labelTranslationID = options.ename
    .toLowerCase()
    .concat('.')
    .concat(entityFieldName.toLowerCase())
  let label = labelize(entityFieldName)

  let memberDomain = options.listOfEnumValues.split(',').reduce((p: [], c) => {
    ;(p as any).push({
      key: `${strings.capitalize(c)}`,
      value: `${strings.capitalize(c)}`,
      translationID: `${labelTranslationID}.${c.toUpperCase()}`,
    } as { key: string; value: string; translationID: string })
    return p
  }, [])

  let tableUCViewLayoutEntry = `{
      "entityFieldName": "${entityFieldName}",
      "label": "${label}",
      "labelTranslationID": "${labelTranslationID}",
      "visible": true,
      "order": ${viewLayoutContent.tableUCViewLayout.ucViewLayout.length + 1}
    }`

  let viewUCViewLayoutEntry = `{
    "entityFieldName": "${entityFieldName}",
    "label": "${label}",
    "labelTranslationID": "${labelTranslationID}",
    "visible": true,
    "order": ${viewLayoutContent.viewUCViewLayout.ucViewLayout.length + 1},
    "fieldGroup": {
      "groupId": 1,
      "groupOrder": 1
    }
  }`

  let createUCViewLayoutEntry = `{
    "entityFieldName": "${entityFieldName}",
    "label": "${label}",
    "labelTranslationID": "${labelTranslationID}",
    "visible": true,
    "type": "combo",
    "icon": "view_list",
    "required": false,
    "targetFieldDomain": { "defaultDomain": ${JSON.stringify(memberDomain)}},
    "order": ${viewLayoutContent.createUCViewLayout.ucViewLayout.length + 1},
    "fieldGroup": {
      "groupId": 1,
      "groupOrder": 1
    }
  }`

  let editUCViewLayoutEntry = `{
    "entityFieldName": "${entityFieldName}",
    "label": "${label}",
    "labelTranslationID": "${labelTranslationID}",
    "visible": true,
    "type": "combo",
    "icon": "view_list",
    "required": false,
    "targetFieldDomain": { "defaultDomain": ${JSON.stringify(memberDomain)}},
    "order": ${viewLayoutContent.editUCViewLayout.ucViewLayout.length + 1},
    "fieldGroup": {
      "groupId": 1,
      "groupOrder": 1
    }
  }`

  if (
    !viewLayoutContent.createUCViewLayout.ucViewLayout.find(
      (e) => e.entityFieldName === entityFieldName,
    )
  ) {
    viewLayoutContent.createUCViewLayout.ucViewLayout.push(JSON.parse(createUCViewLayoutEntry))
  }

  if (
    !viewLayoutContent.editUCViewLayout.ucViewLayout.find(
      (e) => e.entityFieldName === entityFieldName,
    )
  ) {
    viewLayoutContent.editUCViewLayout.ucViewLayout.push(JSON.parse(editUCViewLayoutEntry))
  }

  if (
    !viewLayoutContent.viewUCViewLayout.ucViewLayout.find(
      (e) => e.entityFieldName === entityFieldName,
    )
  ) {
    viewLayoutContent.viewUCViewLayout.ucViewLayout.push(JSON.parse(viewUCViewLayoutEntry))
  }

  if (
    !viewLayoutContent.tableUCViewLayout.ucViewLayout.find(
      (e) => e.entityFieldName === entityFieldName,
    )
  ) {
    viewLayoutContent.tableUCViewLayout.ucViewLayout.push(JSON.parse(tableUCViewLayoutEntry))
  }

  return viewLayoutContent
}

function labelize(str: string): string {
  if (str) {
    return strings
      .dasherize(str)
      .split('-')
      .reduce((previous: string, current: string) => {
        return previous !== ''
          ? previous.concat(' ').concat(strings.capitalize(current))
          : previous.concat(strings.capitalize(current))
      }, '')
  }
  return ''
}

export function createDefaultTranslationKeys(options: AverosAddEnumValuesOption): Rule {
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

      translationData[`${options.ename.toLocaleLowerCase()}.${options.mname.toLocaleLowerCase()}`] =
        labelize(options.mname)
      if (
        !translationData[
          `${options.ename.toLocaleLowerCase()}.${options.mname.toLocaleLowerCase()}`
        ]
      ) {
      }

      options.listOfEnumValues.split(',').reduce((p: any, c) => {
        translationData[
          `${options.ename.toLocaleLowerCase()}.${options.mname.toLocaleLowerCase()}.${c.toUpperCase()}`
        ] = labelize(c)
      }, null)

      host.overwrite(translationFile, JSON.stringify(translationData))
    })

    context.logger.info(
      `✅ A default translation entry value have been created for this simple enumeration field key!\nPlease note this translation entry is by default created for all existing configured languages (including the default one).\nIn order to update the translation entry value for this key use the command:\n{ ng g @averos/workflow:add-translation-entry --lang=[LANGUAGE] --key=[KEY] --value=[valueInTargetLang] }`,
    )
  }
}
