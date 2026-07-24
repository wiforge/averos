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
  noop,
  schematic,
  DirEntry,
} from '@angular-devkit/schematics'

import { strings, normalize, join } from '@angular-devkit/core'

import { findNodes } from '@schematics/angular/utility/ast-utils'

import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import {
  InsertChange,
  Change,
  NoopChange,
  ReplaceChange,
  applyToUpdateRecorder,
} from '@schematics/angular/utility/change'
import { AverosAddSimpleMemberOption } from './schema'
import { readIntoSourceFile, EntityViewLayout, toValidIdentifier } from '../util'

import * as ts from 'typescript'

export default function (options: AverosAddSimpleMemberOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:add-simple-member"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.ename || options.ename.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }

    if (!options.mname || options.mname.trim() === '') {
      throw new SchematicsException(`❌ The field type is mandatory! Please provide one`)
    }

    if (!options.memberType || options.memberType.trim() === '') {
      throw new SchematicsException(
        `❌ The relation type with the member you wish to add is mandatory! Please provide one`,
      )
    }

    if (
      options.memberType.toLowerCase() === 'enumeration' &&
      (!options.listOfEnumValues || options.listOfEnumValues.trim() === '')
    ) {
      throw new SchematicsException(
        `❌ The member you are trying to add is of type << enumeration >> but no values were provided!\n Please provide a list of values for the new eumeration member [--listOfEnumValues]`,
      )
    }

    // transform the member name into a valid Class Identifier
    options.mname = toValidIdentifier(options.mname)

    // transform the entity class name into a valid Class name if not already
    options.ename = toValidIdentifier(options.ename, 'class')

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

    const templatesPath = normalize(join(normalize(options.path), 'model') + '/')
    const entityRelativePath = `${templatesPath}/${strings.dasherize(options.ename)}.ts`

    if (!host.exists(entityRelativePath)) {
      throw new SchematicsException(
        `❌ Entity ${options.ename} does not exist in the following location: ${entityRelativePath} `,
      )
    }
    if (options.technicalId && options.businessId) {
      throw new SchematicsException(
        `❌ The entity member to be added could not be qualified as technical identifier and business identifier in the same time! Please use one of the qualification but not both on the same field.`,
      )
    }
    if (
      options.memberType !== 'string' &&
      options.memberType !== 'number' &&
      (options.technicalId || options.businessId)
    ) {
      throw new SchematicsException(
        `❌ A techical identifier or a business identifier should either be 'number' or 'string'.`,
      )
    }

    context.logger.info(
      `🌱 Entity ${options.memberType} relation with the field seeds named ${options.mname} is being sown...`,
    )
    context.logger.info(`🌱 Entity View layout default configuration seeds are being sown...`)

    return chain([
      options.memberType === 'enumeration'
        ? schematic('add-enumeration-member', {
            ename: options.ename,
            mname: options.mname,
            listOfEnumValues: options.listOfEnumValues,
          })
        : noop(),
      options.memberType !== 'enumeration' ? registerSimpleMember(options) : noop(),
      options.memberType !== 'enumeration' && !options.technicalId
        ? addDefaultMemberViewLayoutToEntityVL(options)
        : noop(),
      options.memberType !== 'enumeration' ? createDefaultTranslationKeys(options) : noop(),
    ])
  }
}

function registerSimpleMember(options: AverosAddSimpleMemberOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`☑️ Entity with name ${options.ename} will be Updated...`)

    let entityFilePath = normalize(
      join(normalize(options.path as string), `model/${strings.dasherize(options.ename)}.ts`),
    )
    if (!host.exists(entityFilePath)) {
      throw new SchematicsException(
        `❌ Unable to find the averos entity << ${options.ename} >> in the following location: ${entityFilePath}`,
      )
    }
    let source = readIntoSourceFile(host, entityFilePath)

    // const importMemberEntityType = insertImport(source as any, entityFilePath, options.mname, `./${strings.dasherize(options.mname)}`);
    const updateEntityWithNewMember = addMemberToEntity(source, entityFilePath, options, context)
    const changes = [updateEntityWithNewMember]
    const recorder = host.beginUpdate(entityFilePath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd)
      } else {
        applyToUpdateRecorder(recorder, [change])
      }
    }
    host.commitUpdate(recorder)
  }
}

function addMemberToEntity(
  source: ts.SourceFile,
  entityPath: string,
  options: AverosAddSimpleMemberOption,
  context: SchematicContext,
): Change {
  if (options.technicalId) {
    return addSimpleAnnotatedMemberToEntity(source, entityPath, options, 'ID', context)
  } else if (options.businessId) {
    return addSimpleAnnotatedMemberToEntity(source, entityPath, options, 'BusinessID', context)
  } else {
    return addSimpleMemberToEntity(source, entityPath, options, context)
  }
}

function addSimpleMemberToEntity(
  source: ts.SourceFile,
  entityPath: string,
  options: AverosAddSimpleMemberOption,
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
    context.logger.warn(
      `⚠️ Field {${memberName}} is already declared in the entity  {${options.ename}} !\n ⏭️ Skipping the field creation \n`,
    )
    return new NoopChange()
  }
  let positionToInsertMember = classDeclarationNode
    .getChildAt(classDeclarationNode.getChildCount() - 3)
    .getEnd()
  if (propertiesDeclarationNodes__ && propertiesDeclarationNodes__.length > 0) {
    positionToInsertMember = propertiesDeclarationNodes__.reduce((previous: number, current) => {
      return previous + current.getFullWidth()
    }, positionToInsertMember)
  }
  let mType = getMemberType(options.memberType.toLowerCase())

  let data = `\n    ${memberName.concat(`!: ${mType}`)};\n`
  return new InsertChange(entityPath, positionToInsertMember, data)
}

function addSimpleAnnotatedMemberToEntity(
  source: ts.SourceFile,
  entityPath: string,
  options: AverosAddSimpleMemberOption,
  annotation: string,
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
    context.logger.warn(
      `⚠️ Field {${memberName}} is already declared in the entity  {${options.ename}} !\n ⏭️ Skipping the field creation \n`,
    )
    return new NoopChange()
  }
  const idMemberDeclaration = findNodes(
    source as any,
    ts.SyntaxKind.Decorator,
  ) as unknown as ts.Decorator[]
  const idDecorator = idMemberDeclaration?.find(
    (decorator: ts.Decorator) => decorator.getText() === `@${annotation}()`,
  )

  if (!!idDecorator) {
    let positionToInsertMember = idDecorator.parent.getStart()
    let mType = getMemberType(options.memberType.toLowerCase())
    let newData = `\n    @${annotation}()\n    ${memberName.concat(`!: ${mType}`)};\n`
    return new ReplaceChange(
      entityPath,
      positionToInsertMember,
      idDecorator.parent.getText(),
      newData,
    )
  } else {
    let positionToInsertMember = classDeclarationNode
      .getChildAt(classDeclarationNode.getChildCount() - 3)
      .getEnd()
    if (propertiesDeclarationNodes__ && propertiesDeclarationNodes__.length > 0) {
      positionToInsertMember = propertiesDeclarationNodes__.reduce((previous: number, current) => {
        return previous + current.getFullWidth()
      }, positionToInsertMember)
    }
    let mType = getMemberType(options.memberType.toLowerCase())

    let data = `\n    @${annotation}()\n    ${memberName.concat(`!: ${mType}`)};\n`
    return new InsertChange(entityPath, positionToInsertMember, data)
  }
}

export function addDefaultMemberViewLayoutToEntityVL(options: AverosAddSimpleMemberOption): Rule {
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
  options: AverosAddSimpleMemberOption,
) {
  let entityFieldName = options.mname
  let labelTranslationID = options.ename
    .toLowerCase()
    .concat('.')
    .concat(entityFieldName.toLowerCase())
  let label = labelize(entityFieldName)
  let memberIcon = 'label'
  switch (options.memberType.toLowerCase()) {
    case 'date':
      memberIcon = 'today'
      break
    case 'boolean':
      memberIcon = 'flaky'
      break
    case 'textarea':
      memberIcon = 'description'
      break
    case 'password':
      memberIcon = 'lock'
      break
    case 'phone':
      memberIcon = 'local_phone'
      break
    case 'number':
      memberIcon = 'pin'
      break
    case 'numberslider':
      memberIcon = 'pin'
      break
    default:
      memberIcon = 'label'
      break
  }

  let tableUCViewLayoutEntry = `{
    "entityFieldName": "${entityFieldName}",
    "label": "${label}",
    "labelTranslationID": "${labelTranslationID}",
    "visible": true,
    "type": "${options.memberType.toLowerCase() === 'numberslider' ? 'number' : options.memberType.toLowerCase()}",
    ${options.memberType.toLowerCase() === 'date' ? '"format": "dd/MM/yyyy",' : ''}
    "order": ${viewLayoutContent.tableUCViewLayout.ucViewLayout.length + 1}
  }`

  let viewUCViewLayoutEntry = `{
  "entityFieldName": "${entityFieldName}",
  "label": "${label}",
  "labelTranslationID": "${labelTranslationID}",
  "visible": true,
  "type": "${options.memberType.toLowerCase() === 'numberslider' ? 'number' : options.memberType.toLowerCase()}",
  ${options.memberType.toLowerCase() === 'date' ? '"format": "dd/MM/yyyy",' : ''}
  "icon": "${memberIcon}",
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
  "type": "${options.memberType.toLowerCase() === 'numberslider' ? 'number' : options.memberType.toLowerCase()}",
  ${options.memberType.toLowerCase() === 'date' ? '"format": "dd/MM/yyyy",' : ''}
  "icon": "${memberIcon}",
  "required": false,
	"disabled": false,
  "defaultValue": "",
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
  "type": "${options.memberType.toLowerCase() === 'numberslider' ? 'number' : options.memberType.toLowerCase()}",
  ${options.memberType.toLowerCase() === 'date' ? '"format": "dd/MM/yyyy",' : ''}
  "icon": "${memberIcon}",
  "required": false,
	"disabled": false,
  "defaultValue": "",
  "order": ${viewLayoutContent.createUCViewLayout.ucViewLayout.length + 1},
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
function getMemberType(memberType: string): string {
  switch (memberType) {
    case 'date':
      return 'Date'
    case 'number':
      return 'number'
    case 'textarea':
      return 'string'
    case 'password':
      return 'string'
    case 'phone':
      return 'string'
    default:
      return 'string'
  }
}

export function createDefaultTranslationKeys(options: AverosAddSimpleMemberOption): Rule {
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
          `❌ No Translation properties found for this project! Please use ng g @averos/workflow:add-language in order to activate averos translation support for your angular project.\n`,
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

      host.overwrite(translationFile, JSON.stringify(translationData))
    })

    context.logger.info(
      `✅ A default translation entry value have been created for this simple field key!\nPlease note this translation entry is by default created for all existing configured languages (including the default one).\nIn order to update the translation entry value for this key use the command:\n{ ng g @averos/workflow:add-translation-entry --lang=[LANGUAGE] --key=[KEY] --value=[valueInTargetLang] }`,
    )
  }
}
