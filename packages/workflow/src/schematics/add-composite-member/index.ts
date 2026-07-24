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
import { AverosAddCompositeMemberOption, AverosEntityRelationDeleteStrategy } from './schema'
import {
  readIntoSourceFile,
  insertImport,
  EntityViewLayout,
  findClassImplementationFilePath,
  FieldViewLayout,
  toValidIdentifier,
} from '../util'

import * as ts from 'typescript'

export default function (options: AverosAddCompositeMemberOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:add-composite-member"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.ename || options.ename.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }

    if (!options.fename || options.fename.trim() === '') {
      throw new SchematicsException(
        `❌ The field entity type Name is mandatory! Please provide one`,
      )
    }

    if (!options.fieldRelationType || options.fieldRelationType.trim() === '') {
      throw new SchematicsException(
        `❌ The relation type with the member you wish to add is mandatory! Please provide one`,
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

    // transform the class name into a valid class identifier
    options.ename = toValidIdentifier(options.ename, 'class')
    options.fename = toValidIdentifier(options.fename, 'class')
    // transform the member name into a valid Class Identifier
    options.memberName = toValidIdentifier(options.memberName)

    options.memberName = getCompositeMemberName(options)
    ///// END Option Setup////////////////////////

    const templatesPath = normalize(join(normalize(options.path), 'model') + '/')
    const entityRelativePath = `${templatesPath}/${strings.dasherize(options.ename)}.ts`
    const memberEntityFilePath = `${templatesPath}/${strings.dasherize(options.fename)}.ts`
    if (!host.exists(entityRelativePath)) {
      throw new SchematicsException(
        `❌ Entity ${options.ename} does not exist in the following location: ${entityRelativePath}!\n Please create your entities (parent and child) before adding any composite members.`,
      )
    }
    if (!host.exists(memberEntityFilePath)) {
      throw new SchematicsException(
        `❌ Target entity member type << ${options.fename} >> does not exist in the following location: ${memberEntityFilePath}!\n Please create your entities (parent and child) before adding any composite members.`,
      )
    }
    //// UPDATE ////
    // 1- get the service path
    // 2- load the service class src file
    //repeat for parent entity service & child entity service
    //let entityHasService: boolean = parent entity service or child entity service are null

    const parentEntityServiceFilePath = findClassImplementationFilePath(host, options.ename)
    if (parentEntityServiceFilePath !== null || parentEntityServiceFilePath !== undefined) {
      // parentEntityHasService = true;
    } else {
      context.logger.info(`⚠️ Entity with name ${options.ename} does not have a managing service!`)
    }
    ///////

    context.logger.info(
      `🌱 Entity '${options.fieldRelationType}' relation with the field seeds named '${options.memberName}' is being sown...`,
    )
    context.logger.info(`🌱 Entity View layout default configuration seeds are being sown...`)

    /**
     * updateCompositeRelationInSearchEntityUC() and updateCollectionRelationInSearchEntityUC()
     * are no more needed in averos 1.8.0 since now viewCompositeOject dynamically retrieves the composite entity class type
     */
    return chain([
      registerEntityMember(options),
      // options.fieldRelationType==='ManyToOne' || options.fieldRelationType==='OneToOne' ? updateCompositeRelationInSearchEntityUC(options) : noop(),
      // options.fieldRelationType==='OneToMany' ? updateCollectionRelationInSearchEntityUC(options) : noop(),
      createDefaultTranslationKeys(options),
      addDefaultMemberViewLayoutToEntityVL(options),
    ])
  }
}

function registerEntityMember(options: AverosAddCompositeMemberOption): Rule {
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

    const importMemberEntityType = insertImport(
      source as any,
      entityFilePath,
      options.fename,
      `./${strings.dasherize(options.fename)}`,
    )
    const importAverosDecorator = insertImport(
      source as any,
      entityFilePath,
      options.fieldRelationType,
      `@averos/core`,
    )
    const updateEntityWithNewMember = addMemberToEntity(source, entityFilePath, options, context)
    let changes = [importMemberEntityType, importAverosDecorator, updateEntityWithNewMember]
    if (options.deleteStrategy !== null && options.deleteStrategy !== undefined) {
      const importEntityRelationDeleteStrategy = insertImport(
        source as any,
        entityFilePath,
        `EntityRelationDeleteStrategy`,
        `@averos/core`,
      )
      changes.push(importEntityRelationDeleteStrategy)
    }
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
  options: AverosAddCompositeMemberOption,
  context: SchematicContext,
): Change {
  if (!source || !entityPath) {
    return new NoopChange()
  }

  let memberName = options.memberName

  const classDeclarationNode = source.statements.find(
    (n) => n.kind == ts.SyntaxKind.ClassDeclaration,
  )
  if (!classDeclarationNode) {
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
      `⚠️ Composite field {${memberName}} is already declared in the entity  {${options.ename}} !\n ⏭️ Skipping the composite field creation \n`,
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

  let data = `\n    @${options.fieldRelationType}('${options.fename}', import('./${strings.dasherize(options.fename)}')`
  if (options.deleteStrategy !== null && options.deleteStrategy !== undefined) {
    if (
      options.deleteStrategy !== AverosEntityRelationDeleteStrategy.DELETE_CHILDREN &&
      options.deleteStrategy !== AverosEntityRelationDeleteStrategy.KEEP_CHILDREN
    ) {
      options.deleteStrategy = AverosEntityRelationDeleteStrategy.KEEP_CHILDREN
    }

    data = data.concat(`, EntityRelationDeleteStrategy.${options.deleteStrategy}) `)
  } else {
    data = data.concat(') ')
  }
  data = data.concat(memberName).concat(`!: ${options.fename}`)
  if (options.fieldRelationType === `OneToOne` || options.fieldRelationType === `ManyToOne`) {
    data = data.concat(`;\n`)
  } else {
    data = data.concat(`[];\n`) //array
  }
  return new InsertChange(entityPath, positionToInsertMember, data)
}

function addDefaultMemberViewLayoutToEntityVL(options: AverosAddCompositeMemberOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let entityVLFile = normalize(
      join(
        normalize(options.projectRootPath as string),
        `src/assets/viewlayout/${options.ename.toLocaleLowerCase()}VL.json`,
      ),
    )

    if (!host.exists(entityVLFile)) {
      throw new Error(
        `❌ The requested entity view layout config related to the entity {${options.ename}} does not exist!\n Is the entity provided an averos entity?`,
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
      `✅ Member << ${options.fename} >> view layout have been successfully added to << ${options.ename} >> Entity View Layout!`,
    )
  }
}

function updateDefaultEntityViewLayout(
  viewLayoutContent: EntityViewLayout,
  options: AverosAddCompositeMemberOption,
) {
  let entityFieldName =
    options.fieldRelationType === `OneToOne` || options.fieldRelationType === `ManyToOne`
      ? toValidIdentifier(options.fename)
      : toValidIdentifier(options.fename).concat('s')
  let childType =
    options.fieldRelationType === `OneToOne` || options.fieldRelationType === `ManyToOne`
      ? 'composite'
      : 'collection'
  let labelTranslationID = options.ename
    .toLowerCase()
    .concat('.')
    .concat(entityFieldName.toLowerCase())
  let label = labelize(entityFieldName)

  let tableUCViewLayoutEntry = `{
  "entityFieldName": "${entityFieldName}",
  "label": "${label}",
  "labelTranslationID": "${labelTranslationID}",
  "visible": true,
  "type": "${childType}",
  "typeName": "${options.fename}",
  "order": ${getOrderForCompositeField(viewLayoutContent.tableUCViewLayout.ucViewLayout) + 1}
}`

  let viewUCViewLayoutEntry = `{
  "entityFieldName": "${entityFieldName}",
  "label": "${label}",
  "labelTranslationID": "${labelTranslationID}",
  "visible": true,
  "type": "${childType}",
  "typeName": "${options.fename}",
  "order": ${getOrderForCompositeField(viewLayoutContent.viewUCViewLayout.ucViewLayout) + 1},
  "fieldGroup": {
    "groupId": ${getOrderForCompositeField(viewLayoutContent.viewUCViewLayout.ucViewLayout) + 1},
    "layout": "inline",
    "groupLabel": "${label}",
    "groupLabelTranslationID": "${labelTranslationID}",
    "groupOrder": 1
  }
}`

  let createUCViewLayoutEntry = `{
  "entityFieldName": "${entityFieldName}",
  "label": "${label}",
  "labelTranslationID": "${labelTranslationID}",
  "visible": true,
  "type": "${childType}",
  "typeName": "${options.fename}",
  "order": ${getOrderForCompositeField(viewLayoutContent.createUCViewLayout.ucViewLayout) + 1},
  "fieldGroup": {
    "groupId": ${getOrderForCompositeField(viewLayoutContent.createUCViewLayout.ucViewLayout) + 1},
    "layout": "inline",
    "groupLabel": "${label}",
    "groupLabelTranslationID": "${labelTranslationID}",
    "groupOrder": 1
  }
}`

  let editUCViewLayoutEntry = `{
  "entityFieldName": "${entityFieldName}",
  "label": "${label}",
  "labelTranslationID": "${labelTranslationID}",
  "visible": true,
  "type": "${childType}",
  "typeName": "${options.fename}",
  "order": ${getOrderForCompositeField(viewLayoutContent.editUCViewLayout.ucViewLayout) + 1},
  "fieldGroup": {
    "groupId": ${getOrderForCompositeField(viewLayoutContent.editUCViewLayout.ucViewLayout) + 1},
    "layout": "inline",
    "groupLabel": "${label}",
    "groupLabelTranslationID": "${labelTranslationID}",
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

function getOrderForCompositeField(fvLayouts: FieldViewLayout[]): number {
  let compositeElements = fvLayouts.filter((e) => e.type === 'composite' || e.type === 'collection')
  if (compositeElements.length > 0) {
    return compositeElements.length + 1
  } else {
    return 1
  }
}

function createDefaultTranslationKeys(options: AverosAddCompositeMemberOption): Rule {
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
          `❌ No Translation properties found for this project! Please use ng g @averos/workflow:add-language in order to activate averos translation support for your angular project.\n`,
        )
      }
      let translationData = JSON.parse(translationContent.toString())

      if (options.fieldRelationType && options.fieldRelationType === 'ManyToOne') {
        if (
          !translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}`
          ]
        ) {
          translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}`
          ] = labelize(options.fename)
        }
      }

      if (options.fieldRelationType && options.fieldRelationType === 'OneToOne') {
        if (
          !translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}`
          ]
        ) {
          translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}`
          ] = labelize(options.fename)
        }
      }

      if (options.fieldRelationType && options.fieldRelationType === 'OneToMany') {
        const label = labelize(options.fename)
        const targetLabel = label.concat('s')
        if (
          !translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}s`
          ]
        ) {
          translationData[
            `${options.ename.toLocaleLowerCase()}.${options.fename.toLocaleLowerCase()}s`
          ] = targetLabel
        }
      }

      host.overwrite(translationFile, JSON.stringify(translationData))
    })

    context.logger.info(
      `✅ A default translation entry value have been created for this composite field key!\nPlease note this translation entry is by default created for all existing configured languages (including the default one).\nIn order to update the translation entry value for this key use the command:\n{ ng g @averos/workflow:add-translation-entry --lang=[LANGUAGE] --key=[KEY] --value=[valueInTargetLang] }`,
    )
  }
}

function getCompositeMemberName(options: AverosAddCompositeMemberOption) {
  if (
    options.memberName !== null &&
    options.memberName !== undefined &&
    options.memberName !== ''
  ) {
    return options.memberName
  } else if (
    options.fieldRelationType === `OneToOne` ||
    options.fieldRelationType === `ManyToOne`
  ) {
    return toValidIdentifier(options.fename)
  } else if (options.fieldRelationType === `OneToMany`) {
    return toValidIdentifier(options.fename).concat('s')
  } else {
    throw new Error(
      'Cannot construct member name! please provide either a member-name parameter or a valid field-relation-type parameter.',
    )
  }
}
