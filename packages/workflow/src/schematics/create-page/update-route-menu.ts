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
  DirEntry,
} from '@angular-devkit/schematics'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { strings, normalize, basename, dirname, join } from '@angular-devkit/core'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import * as ts from 'typescript'
import {
  insertImport,
  readIntoSourceFile,
  ApplicationMenu,
  ApplicationNavigationItem,
  labelize,
  toValidIdentifier,
  extractRoutesListNode,
  getRouteInsertionPoint,
} from '../util'
import { CreatePageOptions } from './schema'

export default function (options: CreatePageOptions): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:update-route-menu"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`❌ No target space to host the component was defined!`)
    }
    options.name = toValidIdentifier(options.name, 'class')

    if (!options.targetMenu || options.targetMenu.trim() === '') {
      throw new SchematicsException(`❌ No target menu to host the component was defined!`)
    }

    if (!options.space || options.space.trim() === '') {
      throw new SchematicsException(`❌ The Page Name is mandatory! Please provide one`)
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

    let registerRouteOptions = {
      name: options.name,
      path: options.path,
      space: options.space,
    }

    options.path = normalize(
      '/' +
        dirname(
          join(
            normalize(options.path),
            '/view',
            basename(normalize(strings.dasherize(options.name))),
          ),
        ),
    )

    let menuRouteOptions = {
      name: options.name,
      projectRootPath: options.projectRootPath,
      space: options.space,
      targetMenu: options.targetMenu,
    }
    context.logger.info(`🌱 Route and Default Menu will be updated`)

    return chain([
      registerDefaultRoute(registerRouteOptions),
      createDefaultEntityMenuRoutes(menuRouteOptions),
      createDefaultTranslationKeys(menuRouteOptions),
      (options: any) => {
        return async (host: Tree, context: SchematicContext) => {
          context.logger.info(
            `✅ A new entry is added to the module's route and to the default Menu`,
          )
        }
      },
    ])
  }
}

export function registerDefaultRoute(options: any): Rule {
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
      useCaseComponentPath: `./view/${strings.dasherize(options.name)}/${strings.dasherize(options.name)}`,
      space: options.space,
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

  const routeToRegister = `{ path: '${toLowerCase(options.name)}', component: ${options.name}${options.space === 'logged' ? ', canActivate: [AuthenticationGuard]}' : '}'}`

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
    updateDefaultMenu(options, menu)
    host.overwrite(applicationDefaultMenuFile, JSON.stringify(menu))
    context.logger.info(`✅ The Page route have been added to the default menu!`)
  }
}

function updateDefaultMenu(options: any, menuContent: ApplicationMenu) {
  let isPublicPage = options.space === 'public' ? true : false
  let menuChild: ApplicationNavigationItem = {
    displayName: `${labelize(options.name)}`,
    translationID: `menu.${toLowerCase(options.name)}`,
    iconName: 'chevron_right',
    type: 'link',
    route: `/${toLowerCase(options.name)}`,
  }

  if (options.targetMenu !== 'both') {
    let menuEntry = options.targetMenu === 'side' ? menuContent.sideMenu : menuContent.topMenu
    let entityMenuGroup = menuEntry.find(
      (value) => value.displayName === (isPublicPage ? 'Default Pages' : 'My Pages'),
    )
    if (!entityMenuGroup) {
      entityMenuGroup = {
        displayName: isPublicPage ? 'Default Pages' : 'My Pages',
        loggedSpace: !isPublicPage,
        iconName: 'chevron_right',
        type: 'sub',
        children: [menuChild],
      }
      if (options.targetMenu === 'side') {
        menuContent.sideMenu.push(entityMenuGroup)
      } else {
        menuContent.topMenu.push(entityMenuGroup)
      }
    } else {
      const itemIndex = menuEntry.indexOf(entityMenuGroup)
      if (entityMenuGroup.children) {
        if (!entityMenuGroup.children.find((e) => e.displayName === menuChild.displayName)) {
          entityMenuGroup.children.push(menuChild)
        }
      } else {
        entityMenuGroup.children = [menuChild]
      }
      menuEntry[itemIndex] = entityMenuGroup
      if (options.targetMenu === 'side') {
        menuContent.sideMenu = menuEntry
      } else {
        menuContent.topMenu = menuEntry
      }
    }
  } else {
    let sideMenuEntry = menuContent.sideMenu
    let topMenuEntry = menuContent.topMenu
    let sideMenuGroup = sideMenuEntry.find((value) => value.displayName === 'Default Pages')
    let topMenuGroup = topMenuEntry.find((value) => value.displayName === 'Default Pages')
    let isLoggedSpace = options.space === 'logged' ? true : false

    if (!sideMenuGroup) {
      sideMenuGroup = {
        displayName: isPublicPage ? 'Default Pages' : 'My Pages',
        loggedSpace: isLoggedSpace,
        iconName: 'chevron_right',
        type: 'sub',
        children: [menuChild],
      }
      menuContent.sideMenu.push(sideMenuGroup)
    } else {
      const itemIndex = sideMenuEntry.indexOf(sideMenuGroup)
      if (sideMenuGroup.children) {
        if (!sideMenuGroup.children.find((e) => e.displayName === menuChild.displayName)) {
          sideMenuGroup.children.push(menuChild)
        }
      } else {
        sideMenuGroup.children = [menuChild]
      }
      sideMenuEntry[itemIndex] = sideMenuGroup
      menuContent.sideMenu = sideMenuEntry
    }

    if (!topMenuGroup) {
      topMenuGroup = {
        displayName: isPublicPage ? 'Default Pages' : 'My Pages',
        loggedSpace: isLoggedSpace,
        iconName: 'chevron_right',
        type: 'sub',
        children: [menuChild],
      }
      menuContent.topMenu.push(topMenuGroup)
    } else {
      const itemIndex = topMenuEntry.indexOf(topMenuGroup)
      if (topMenuGroup.children) {
        if (!topMenuGroup.children.find((e) => e.displayName === menuChild.displayName)) {
          topMenuGroup.children.push(menuChild)
        }
      } else {
        topMenuGroup.children = [menuChild]
      }
      topMenuEntry[itemIndex] = topMenuGroup
      menuContent.topMenu = topMenuEntry
    }
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

      if (!translationData[`menu.${toLowerCase(options.name)}`]) {
        translationData[`menu.${toLowerCase(options.name)}`] = labelize(options.name)
      }

      host.overwrite(translationFile, JSON.stringify(translationData))
    })
  }
}
