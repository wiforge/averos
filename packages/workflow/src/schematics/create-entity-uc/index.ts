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
  DirEntry,
  noop,
} from '@angular-devkit/schematics'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { strings, normalize, dirname, join } from '@angular-devkit/core'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import * as ts from 'typescript'
import {
  insertImport,
  readIntoSourceFile,
  ApplicationMenu,
  ApplicationNavigationItem,
  labelize,
  getServiceName,
  toValidIdentifier,
  findClassImplementationFilePath,
  extractRoutesListNode,
  getRouteInsertionPoint,
  classifyPreserveTrailingIndex,
} from '../util'
import { CreateEntityUCOption } from './schema'

export default function (options: CreateEntityUCOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:create-entity-uc"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`❌ Name is mandatory! Please provide one`)
    }
    if (!options.ename || options.ename.trim() === '') {
      throw new SchematicsException(`❌ Entity Name is mandatory! Please provide one`)
    }
    options.name = toValidIdentifier(options.name, 'class')
    options.ename = toValidIdentifier(options.ename, 'class')

    const useCaseFilePath = findClassImplementationFilePath(host, strings.classify(options.name))
    if (useCaseFilePath) {
      context.logger.info(
        `⚠️ The use case ${strings.classify(options.name)} does already exist!\n ⏭️ Skipping the use case creation \n`,
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

    if (options.sname === undefined && options.ename) {
      const entityFilePath = findClassImplementationFilePath(host, options.ename)
      if (!entityFilePath) {
        context.logger.error(`❌ Entity with name ${options.ename} does not exist!`)
        throw new SchematicsException(`❌ Entity with name ${options.ename} does not exist!`)
      }
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
          options.sname = sname
        } else {
          context.logger.info(
            `⚠️ Entity with name ${options.ename} does not have a managing service!`,
          )
          options.sname = `${options.ename}Service`
          context.logger.info(`⚠️ Using the default entity service: ${options.sname}`)
        }
      } else {
        context.logger.info(
          `⚠️ Entity with name ${options.ename} does not have a managing service!`,
        )
        options.sname = `${options.ename}Service`
        context.logger.info(`⚠️ Using the default entity service: ${options.sname}`)
      }
    }

    let registerRouteOptions = {
      name: options.name,
      path: options.path,
      ename: options.ename,
    }

    options.path = normalize(
      '/' + dirname(join(normalize(options.path), '/view', strings.dasherize(options.ename))),
    )

    let menuRouteOptions = {
      name: options.name,
      ename: options.ename,
      projectRootPath: options.projectRootPath,
    }

    let ngCreateUCComponentOptions = {
      name: options.name,
      path: join(normalize(options.path), '/', strings.dasherize(options.ename)),
      project: options.project,
      style: 'scss',
      standalone: false,
    }

    context.logger.info(`🌱 Entity CREATE Use Case seeds named ${options.name} are being sown...`)

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        classifyPreserveTrailingIndex,
        getRelatedEntityPath,
        getRelatedEntityServicePath,
        toLowerCase,
        ...options,
      }),

      move(options.path),
    ])

    return chain([
      externalSchematic('@schematics/angular', 'component', ngCreateUCComponentOptions),
      mergeWith(templateSource, MergeStrategy.Overwrite),
      registerUseCaseRoute(registerRouteOptions),
      createDefaultEntityMenuRoutes(menuRouteOptions),
      createDefaultTranslationKeys(menuRouteOptions),
      (options: any) => {
        return async (host: Tree, context: SchematicContext) => {
          context.logger.info(
            `🎉🎉🎉🎉🎉  Congratulations! Your entity CREATE Use Case is ready! Enjoy!  🎉🎉🎉🎉🎉`,
          )
        }
      },
    ])
  }
}

function registerUseCaseRoute(options: any): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`☑️ UseCase route related to ${options.name} will be added...`)

    let routerModulePath = normalize(
      join(normalize(options.path as string), 'app-routing-module.ts'),
    )
    if (!host.exists(routerModulePath)) {
      throw new SchematicsException(
        `❌ Unable to find the main application routing module in the following location: ${routerModulePath}`,
      )
    }
    let source = readIntoSourceFile(host, routerModulePath)

    let registerRouteOptions = {
      name: options.name,
      ename: options.ename,
      useCaseComponentPath: `./view/${strings.dasherize(options.ename)}/${strings.dasherize(options.name)}/${strings.dasherize(options.name)}`,
    }
    const updateRoutes = registerRouteDeclaration(source, routerModulePath, registerRouteOptions)
    const changes = updateRoutes
    const recorder = host.beginUpdate(routerModulePath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        recorder.insertLeft(change.pos, change.toAdd)
      }
    }
    host.commitUpdate(recorder)
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

function registerRouteDeclaration(
  source: ts.SourceFile,
  routerModulePath: string,
  options: any,
): Change[] {
  if (!source || !routerModulePath) {
    return [new NoopChange()]
  }

  const routesListNode = extractRoutesListNode(source, routerModulePath)

  const routeToRegister = `{ path: '${toLowerCase(options.ename)}s/create', component: ${options.name}, canActivate: [AuthenticationGuard] }`

  const { insertPos, toAdd } = getRouteInsertionPoint(routesListNode, [routeToRegister])

  return [
    new InsertChange(routerModulePath, insertPos, toAdd),
    insertImport(
      source as any,
      routerModulePath,
      `${options.name}`,
      options.useCaseComponentPath,
      false,
    ),
  ]
}

export function createDefaultEntityMenuRoutes(options: any): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let applicationDefaultMenuFile = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/menu/menu.default.json`),
    )

    if (!host.exists(applicationDefaultMenuFile)) {
      host.create(applicationDefaultMenuFile, `{"sideMenu": [],"topMenu": []}`)
    }

    let menuContent = host.read(applicationDefaultMenuFile)
    if (!menuContent) {
      menuContent = Buffer.from(`{
            "sideMenu": [],
          "topMenu": []
          }`)
    }
    let menu: ApplicationMenu = JSON.parse(menuContent.toString())
    updateDefaultMenu(options.ename, menu)
    host.overwrite(applicationDefaultMenuFile, JSON.stringify(menu))
    context.logger.info(`✅ The Entity routes have been added to the default menu!`)
  }
}

function updateDefaultMenu(ename: any, menuContent: ApplicationMenu) {
  let menuChild: ApplicationNavigationItem = {
    displayName: `Add ${ename}`,
    translationID: `menu.${toLowerCase(ename)}.add`,
    iconName: 'add',
    type: 'link',
    route: `/${toLowerCase(ename)}s/create`,
  }
  let sideMenu = menuContent.sideMenu
  let entityMenuGroup = sideMenu.find((value) => value.displayName === ename)
  if (!entityMenuGroup) {
    entityMenuGroup = {
      displayName: `${ename}`,
      translationID: `menu.${toLowerCase(ename)}`,
      loggedSpace: true,
      iconName: 'chevron_right',
      type: 'sub',
      children: [menuChild],
    }
    menuContent.sideMenu.push(entityMenuGroup)
  } else {
    const itemIndex = sideMenu.indexOf(entityMenuGroup)
    if (entityMenuGroup.children) {
      if (!entityMenuGroup.children.find((e) => e.displayName === menuChild.displayName)) {
        entityMenuGroup.children.push(menuChild)
      }
    } else {
      entityMenuGroup.children = [menuChild]
    }
    sideMenu[itemIndex] = entityMenuGroup
    menuContent.sideMenu = sideMenu
  }
  return menuContent
}

export function createDefaultTranslationKeys(options: any): Rule {
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

      if (!translationData[`menu.${toLowerCase(options.ename)}.add`]) {
        translationData[`menu.${toLowerCase(options.ename)}.add`] = `Add ${labelize(options.ename)}`
      }
      if (!translationData[`menu.${toLowerCase(options.ename)}`]) {
        translationData[`menu.${toLowerCase(options.ename)}`] = labelize(options.ename)
      }
      // ///////////CREATE/VIEW/EDIT VIEW LAYOUT TRANSLATION ENTRIES /////////

      //create
      if (!translationData[`uc.create.${toLowerCase(options.ename)}.title`]) {
        translationData[`uc.create.${toLowerCase(options.ename)}.title`] =
          `Create ${labelize(options.ename)}`
      }
      if (!translationData[`uc.create.${toLowerCase(options.ename)}.label`]) {
        translationData[`uc.create.${toLowerCase(options.ename)}.label`] =
          `${labelize(options.ename)} Details`
      }

      ///edit
      if (!translationData[`uc.edit.${toLowerCase(options.ename)}.title`]) {
        translationData[`uc.edit.${toLowerCase(options.ename)}.title`] =
          `Edit ${labelize(options.ename)}`
      }
      if (!translationData[`uc.edit.${toLowerCase(options.ename)}.label`]) {
        translationData[`uc.edit.${toLowerCase(options.ename)}.label`] =
          `${labelize(options.ename)} Details`
      }

      //view
      if (!translationData[`uc.view.${toLowerCase(options.ename)}.title`]) {
        translationData[`uc.view.${toLowerCase(options.ename)}.title`] =
          `View ${labelize(options.ename)}`
      }
      if (!translationData[`uc.view.${toLowerCase(options.ename)}.label`]) {
        translationData[`uc.view.${toLowerCase(options.ename)}.label`] =
          `${labelize(options.ename)} Details`
      }

      host.overwrite(translationFile, JSON.stringify(translationData))
    })

    context.logger.info(
      `✅ Default translation entries values have been created for this Use Case keys!\nPlease note that these translation entries are by default created for all existing configured languages (including the default one).\nIn order to update a translation entry value use the command:\n{ ng g @averos/workflow:add-translation-entry --lang=[LANGUAGE] --key=[KEY] --value=[valueInTargetLang] }`,
    )
  }
}
