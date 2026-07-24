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

import { Rule, Tree, SchematicContext, chain, noop } from '@angular-devkit/schematics'
import { strings, normalize, join } from '@angular-devkit/core'
import { InsertChange, Change, NoopChange } from '@schematics/angular/utility/change'
import * as ts from 'typescript'
import {
  readIntoSourceFile,
  addApplicationInitializerProviderToModule,
  addAverosCoreModuleToApplicationModuleImport,
  EntityConfiguration,
  findClassImplementationFilePath,
} from '../util'
import { NgAddOption } from './schema'
import { AVEROS_DEFAULT_AVATARS } from '../util'

export default function (options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      addApplicationInitializer(options),
      integrateAverosCoreModule(options),
      addAverosTemplates(options),
      importAverosStyling(options),
      importAverosAssets(options),
      options.enableExternalEntityMapping ? addEntityExternalFieldMappingconfig(options) : noop(),
    ])(host, context)
  }
}

function addAverosTemplates(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Configuring the application template...`)
    let indexhtmlFile = normalize(
      join(normalize(options.projectRootPath as string), `src/index.html`),
    )

    let appComponenthtmlFile = normalize(join(normalize(options.srcPath as string), `app.html`))

    let appRoutingModuleFile = normalize(
      join(normalize(options.srcPath as string), `app-routing-module.ts`),
    )

    // Added for @angular/localize support
    let mainTsFile = normalize(join(normalize(options.projectRootPath as string), `src/main.ts`))

    if (!host.exists(appRoutingModuleFile)) {
      throw new Error(
        `❌ Unable to find app-routing-module.ts on the following location: ${appRoutingModuleFile}!\n Make sure you are running Averos into an angular project.`,
      )
    }

    if (!host.exists(appComponenthtmlFile)) {
      throw new Error(
        `❌ Unable to find app.html on the following location: ${appComponenthtmlFile}!\n Make sure you are running Averos into an angular project.`,
      )
    }

    if (!host.exists(mainTsFile)) {
      throw new Error(
        `❌ Unable to find main.ts on the following location: ${mainTsFile}!\n Make sure you are running Averos into an angular project.`,
      )
    }

    if (!host.exists(indexhtmlFile)) {
      host.create(indexhtmlFile, '')
    } else {
      host.overwrite(indexhtmlFile, '')
    }

    host.overwrite(appComponenthtmlFile, '')
    const insertindexHTMLChange = new InsertChange(
      indexhtmlFile,
      0,
      `<!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <title>${strings.classify(options.applicationName)}</title>
          <base href="/">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="icon" type="image/x-icon" href="favicon.ico">
		  <!-- Uncomment the line below if you want to use the online google fonts -->
          <!-- <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet"> -->
		  <!-- Uncomment the line below if you want to use the online google material -->
          <!--  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet"> -->
        </head>
        <body class="mat-typography">
          <app-root>
		    <div id="global-app-loader" class="loader-container">
				<div class="loader">
					<div class="bar red"></div>
					<div class="bar blue"></div>
					<div class="bar green"></div>
					<div class="bar yellow"></div>
					<div class="bar orange"></div>
					<div class="bouncing_ball"></div>
				</div>
			</div>
		  </app-root>
		  <noscript>Please enable JavaScript to continue using this application.</noscript>
        </body>
        </html>
        `,
    )
    const indexHtmlRecorder = host.beginUpdate(indexhtmlFile)
    indexHtmlRecorder.insertLeft(insertindexHTMLChange.pos, insertindexHTMLChange.toAdd)

    const insertappComponenthtmlChange = new InsertChange(
      appComponenthtmlFile,
      0,
      `\n<averos-application></averos-application>`,
    )
    const appComponenthtmlRecorder = host.beginUpdate(appComponenthtmlFile)
    appComponenthtmlRecorder.insertLeft(
      insertappComponenthtmlChange.pos,
      insertappComponenthtmlChange.toAdd,
    )

    host.overwrite(appRoutingModuleFile, ``)
    const insertAppRoutingModuleChange = new InsertChange(
      appRoutingModuleFile,
      0,
      `\nimport { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import {
  LoginComponent,
  RegisterComponent,
  UserDashboardComponent,
} from '@averos/ui-platform';

import {
  AuthenticationGuard,
  CanDeactivateGuard,
  UnauthenticatedSpaceGuard
} from '@averos/core';

        const routes: Routes = [
            { path: '', redirectTo: 'public', pathMatch: 'full' },
            { path: 'login', component: LoginComponent },
            { path: 'register', component: RegisterComponent },
            { path: 'home', component: UserDashboardComponent },
            { path: 'public', loadChildren: () => import ('@averos/ui-platform').then(module => module.PublicSpaceModule),
                          canActivate: [UnauthenticatedSpaceGuard]},
            { path: '**', redirectTo: 'public'}
          
          ];
              
  @NgModule({
    imports: [RouterModule.forRoot(routes, 
      {
        enableTracing: false,
        preloadingStrategy: PreloadAllModules,
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
        onSameUrlNavigation: 'reload'
      })],
    exports: [RouterModule]
  })
  export class AppRoutingModule { }`,
    )
    const insertappRoutingModuleRecorder = host.beginUpdate(appRoutingModuleFile)
    insertappRoutingModuleRecorder.insertLeft(
      insertAppRoutingModuleChange.pos,
      insertAppRoutingModuleChange.toAdd,
    )

    const insertLocalizeChange = new InsertChange(
      mainTsFile,
      0,
      `/// <reference types="@angular/localize" />\n`,
    )
    const insertLocalizeChangeRecorder = host.beginUpdate(mainTsFile)
    insertLocalizeChangeRecorder.insertLeft(insertLocalizeChange.pos, insertLocalizeChange.toAdd)

    host.commitUpdate(insertLocalizeChangeRecorder)
    host.commitUpdate(insertappRoutingModuleRecorder)
    host.commitUpdate(indexHtmlRecorder)
    host.commitUpdate(appComponenthtmlRecorder)
    context.logger.info(`✅ Averos templates configured successfully...`)
  }
}

function integrateAverosCoreModule(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Integrating averos core module...`)
    // let modulePath = normalize(join(normalize(options.srcPath as string), '/app-module.ts'))
	const modulePath = findClassImplementationFilePath(host, 'AppModule', true);
    if (!host.exists(modulePath)) {
      throw new Error(
        `❌ Unable to find the main application module in the following location: ${modulePath}`,
      )
    }
    context.logger.info(`🔧 Module found at: ${modulePath}`)
    let source = readIntoSourceFile(host, modulePath)
    const updateModuleLanguage = updateMainApplicationModule(source, modulePath, options, context)
    const changes = updateModuleLanguage
    const updateMainModulesRecorder = host.beginUpdate(modulePath)
    for (const change of changes) {
      if (change instanceof InsertChange) {
        updateMainModulesRecorder.insertLeft(change.pos, change.toAdd)
      }
    }
    host.commitUpdate(updateMainModulesRecorder)
    context.logger.info(`✅ The main application module has been successfully configured!`)
  }
}

function importAverosStyling(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Applying averos styling...`)
    let globalStyleFile = normalize(
      join(normalize(options.projectRootPath as string), `src/styles.scss`),
    )

    if (!host.exists(globalStyleFile)) {
      throw new Error(
        `❌ Unable to find styles.scss on the following location: ${globalStyleFile}!\n Make sure you are using SCSS for styling your application`,
      )
    } else {
      const styleFile = host.read(globalStyleFile)
      if (styleFile && styleFile.includes('averos/ui-platform/src/styles/application-theme')) {
        context.logger.info(`✅ Averos style is already configured!`)
        return noop()
      } else {
        const insertTKeysChange = new InsertChange(
          globalStyleFile,
          0,
          `@use '@averos/ui-platform/src/styles/application-theme';\n`,
        )
        const tKeysRecorder = host.beginUpdate(globalStyleFile)
        tKeysRecorder.insertLeft(insertTKeysChange.pos, insertTKeysChange.toAdd)
        host.commitUpdate(tKeysRecorder)
        context.logger.info(`✅ Averos Style Added successfully...`)
        return host
      }
    }
  }
}

function importAverosAssets(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Importing averos assets...`)
    let avatarsLocation = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/images/avatars`),
    )

    Object.keys(AVEROS_DEFAULT_AVATARS).forEach((avatarName) => {
      const avatarFile = `${avatarsLocation}/${avatarName}.svg`
      if (!host.exists(avatarFile)) {
        host.create(avatarFile, '')
      } else {
        host.overwrite(avatarFile, '')
      }
      // add averos avatar
      const insertAverosAvatarChange = new InsertChange(
        avatarFile,
        0,
        AVEROS_DEFAULT_AVATARS[avatarName],
      )
      const insertAverosAvatarRecorder = host.beginUpdate(avatarFile)
      insertAverosAvatarRecorder.insertLeft(
        insertAverosAvatarChange.pos,
        insertAverosAvatarChange.toAdd,
      )
      host.commitUpdate(insertAverosAvatarRecorder)
    })
    context.logger.info(`✅ Averos default avatars added successfully...`)

    let viewLayoutLocation = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/viewlayout`),
    )
    const userViewLayout = `${viewLayoutLocation}/userVL.json`
    const roleViewLayout = `${viewLayoutLocation}/roleVL.json`
    if (!host.exists(userViewLayout)) {
      host.create(userViewLayout, '')
    } else {
      host.overwrite(userViewLayout, '')
    }
    if (!host.exists(roleViewLayout)) {
      host.create(roleViewLayout, '')
    } else {
      host.overwrite(roleViewLayout, '')
    }
    // add user & role View layout
    const insertUserVLChange = new InsertChange(userViewLayout, 0, getDefaultUserViewLayout())
    const insertRoleVLChange = new InsertChange(roleViewLayout, 0, getDefaultRoleViewLayout())
    const insertUserVLRecorder = host.beginUpdate(userViewLayout)
    insertUserVLRecorder.insertLeft(insertUserVLChange.pos, insertUserVLChange.toAdd)

    const insertRoleVLRecorder = host.beginUpdate(roleViewLayout)
    insertRoleVLRecorder.insertLeft(insertRoleVLChange.pos, insertRoleVLChange.toAdd)
    host.commitUpdate(insertUserVLRecorder)
    host.commitUpdate(insertRoleVLRecorder)
    context.logger.info(`✅ Averos default View layout updated...`)
  }
}

function updateMainApplicationModule(
  source: ts.SourceFile,
  modulePath: string,
  options: NgAddOption,
  context: SchematicContext,
): Change[] {
  if (!source || !modulePath) {
    return [new NoopChange()]
  }
  const importChanges = addAverosCoreModuleToApplicationModuleImport(
    source,
    modulePath,
    `AverosCoreModule`,
    '@averos/ui-platform',
    options,
  )

  const providerChanges = addApplicationInitializerProviderToModule(
    source,
    modulePath,
    `ApplicationInitializerService`,
    './service/application-initializer.service',
  )

  return importChanges.concat(providerChanges)
}

function addApplicationInitializer(options: NgAddOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Configuring the application initializer...`)
    let initializerPath = normalize(
      join(normalize(options.srcPath as string), '/service/application-initializer.service.ts'),
    )
    let initializer_specPath = normalize(
      join(
        normalize(options.srcPath as string),
        '/service/application-initializer.service.spec.ts',
      ),
    )
    if (host.read(initializerPath)) {
      context.logger.info(
        `⚠️ application-initializer already exist. Proceeding with the existing application initializer.`,
      )
      return
    }
	context.logger.info(`🔧 Initializing the application initializer...`)
    host.create(
      initializerPath,
      `\nimport { Injectable } from '@angular/core';
import { ViewLayoutService } from '@averos/core';

@Injectable({
  providedIn: 'root'
})
export class ApplicationInitializerService {

  private registeredEntities: Array<any> = [];

  constructor(private viewLayoutService: ViewLayoutService) { }


  initialize(): Promise<any> {
    const registerEntitiesPromise = this.viewLayoutService.registerEntitiesViewLayouts(this.registeredEntities);
    const asyncInitPromises: Promise<any>[] = [registerEntitiesPromise];
    return Promise.all(asyncInitPromises);// Wait for all promises to execute
  }
}`,
    )

    host.create(
      initializer_specPath,
      `\nimport { TestBed } from '@angular/core/testing';

import { ApplicationInitializerService } from './application-initializer.service';

describe('ApplicationInitializerService', () => {
  let service: ApplicationInitializerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApplicationInitializerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});`,
    )
	context.logger.info(`🔧 Application initializer configured.`)
  }
}

function getDefaultUserViewLayout(): string {
  return `{
	"defaultUCViewLayout": {},
	"searchInputUCViewLayout": {
		"orderedView": true,
		"title": "Search Users",
		"titleTranslationID": "uc.search.user.title",
		"parentEntityLabel": "Search Criteria",
		"parentEntityLabelTranslationId": "uc.search.user.label",
		"iconOrientation": "SUFFIX",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"visible": true,
				"label": "User Name",
				"labelTranslationID": "user.userName",
				"placeholder": "",
				"placeholderTranslationID": "",
				"type": "string",
				"icon": "person",
				"required": true,
				"disabled": false,
				"validators": {},
				"defaultValue": "",
				"order": 1,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "email",
				"visible": true,
				"label": "Email",
				"labelTranslationID": "user.email",
				"placeholder": "ex. test@test.com",
				"placeholderTranslationID": "user.email.placeholder",
				"type": "string",
				"icon": "email",
				"required": true,
				"disabled": false,
				"defaultValue": "",
				"order": 2,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "firstName",
				"visible": true,
				"label": "First Name",
				"labelTranslationID": "user.firstName",
				"placeholder": "ex. Houcem",
				"placeholderTranslationID": "user.firstName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {},
				"order": 1,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "birthdate",
				"visible": true,
				"label": "Birth date",
				"labelTranslationID": "user.birthdate",
				"placeholder": "ex. 01/01/2001",
				"placeholderTranslationID": "user.birthdate.placeholder",
				"format": "dd-MM-yyyy HH:mm",
				"type": "date",
				"icon": "cake",
				"order": 2,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			}
		]
	},
	"tableUCViewLayout": {
		"orderedView": false,
		"title": "Users Search Result",
		"titleTranslationID": "app.search.result",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"label": "UserName",
				"labelTranslationID": "user.userName",
				"visible": true,
				"order": 1
			},
			{
				"entityFieldName": "birthdate",
				"label": "Date de naissance",
				"labelTranslationID": "user.birthdate",
				"visible": true,
				"required": false,
				"format": "dd/MM/yyyy",
				"type": "date",
				"order": 4
			},
			{
				"entityFieldName": "firstName",
				"label": "FirstName",
				"labelTranslationID": "user.firstName",
				"visible": true,
				"required": false,
				"order": 6
			},
			{
				"entityFieldName": "_entityCreatedBy",
				"label": "createdBy",
				"labelTranslationID": "user.createdby",
				"type": "composite",
				"typeName": "User",
				"visible": true,
				"order": 3
			},
			{
				"entityFieldName": "_entityUpdatedBy",
				"label": "updatedBy",
				"labelTranslationID": "user.updatedby",
				"type": "composite",
				"typeName": "User",
				"visible": true,
				"order": 4
			},
			{
				"entityFieldName": "gender",
				"label": "gender",
				"labelTranslationID": "user.gender",
				"visible": true,
				"required": false,
				"order": 8
			},
			{
				"entityFieldName": "lastName",
				"label": "LastName",
				"labelTranslationID": "user.lastName",
				"visible": true,
				"required": false,
				"order": 7
			},
			{
				"entityFieldName": "identifier.uniqueID",
				"label": "Identifiant Unique",
				"labelTranslationID": "user.identifier.uniqueID",
				"visible": false,
				"required": false,
				"order": 10
			},
			{
				"entityFieldName": "image",
				"label": "avatar",
				"labelTranslationID": "user.image",
				"visible": true,
				"required": false,
				"type": "image",
				"order": 5
			},
			{
				"entityFieldName": "telephone",
				"label": "telephone",
				"labelTranslationID": "user.telephone",
				"visible": true,
				"required": false,
				"order": 11
			},
			{
				"entityFieldName": "mobile",
				"label": "mobile",
				"labelTranslationID": "user.mobile",
				"visible": true,
				"required": false,
				"order": 12
			},
			{
				"entityFieldName": "profileLanguage",
				"label": "profileLanguage",
				"labelTranslationID": "user.profileLanguage",
				"visible": true,
				"required": false,
				"order": 13
			},
			{
				"entityFieldName": "roles",
				"label": "roles",
				"labelTranslationID": "user.roles",
				"visible": true,
				"required": false,
				"type": "collection",
				"typeName": "Role",
				"order": 2
			},
			{
				"entityFieldName": "lastLoginIPAddress",
				"label": "IP Address",
				"labelTranslationID": "user.lastLoginIPAddress",
				"visible": false,
				"required": false,
				"type": "string",
				"order": 20
			},
			{
				"entityFieldName": "passwordLastUpdateDate",
				"label": "passwordLastUpdateDate",
				"labelTranslationID": null,
				"visible": true,
				"required": false,
				"format": "dd-MM-yyyy HH:mm:sss",
				"type": "date",
				"order": 20
			},
			{
				"entityFieldName": "isAccountLocked",
				"label": "compte verouillé",
				"labelTranslationID": "user.isAccountLocked",
				"visible": true,
				"required": true,
				"type": "boolean",
				"order": 3
			},
			{
				"entityFieldName": "_entityCreatedAt",
				"label": "date creation",
				"labelTranslationID": "user.createdat",
				"visible": true,
				"required": false,
				"format": "dd-MM-yyyy HH:mm:sss",
				"type": "date",
				"order": 2
			},
			{
				"entityFieldName": "_entityUpdatedAt",
				"label": "Date de MAJ",
				"labelTranslationID": null,
				"visible": false,
				"required": false,
				"order": 20
			},
			{
				"entityFieldName": "address",
				"label": "addresse",
				"labelTranslationID": "user.address",
				"visible": true,
				"required": false,
				"order": 20
			},
			{
				"entityFieldName": "address2",
				"label": "addresse 2",
				"labelTranslationID": "user.address2",
				"visible": true,
				"required": false,
				"order": 20
			},
			{
				"entityFieldName": "city",
				"label": "city",
				"labelTranslationID": "user.city",
				"visible": true,
				"required": false,
				"order": 20
			}
		]
	},
	"selectableInputTableUCViewLayout": {
		"orderedView": false,
		"title": "Users Search Result",
		"titleTranslationID": "app.search.result",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"label": "UserName",
				"labelTranslationID": "user.userName",
				"visible": true,
				"order": 1
			}
		]
	},
	"viewUCViewLayout": {
		"orderedView": true,
		"title": "View User",
		"titleTranslationID": "uc.view.user.title",
		"parentEntityLabel": "User Details",
		"parentEntityLabelTranslationId": "uc.view.user.label",
		"iconOrientation": "SUFFIX",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"visible": true,
				"label": "User Name",
				"labelTranslationID": "user.userName",
				"placeholder": "",
				"placeholderTranslationID": "",
				"type": "string",
				"icon": "person",
				"required": true,
				"disabled": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter a username",
							"validationMessageTranslationID": ""
						}
					]
				},
				"defaultValue": "",
				"order": 1,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "email",
				"visible": true,
				"label": "Email",
				"labelTranslationID": "user.email",
				"placeholder": "ex. test@test.com",
				"placeholderTranslationID": "user.email.placeholder",
				"type": "string",
				"icon": "email",
				"required": true,
				"disabled": true,
				"defaultValue": "",
				"order": 2,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "firstName",
				"visible": true,
				"label": "First Name",
				"labelTranslationID": "user.firstName",
				"placeholder": "ex. Houcem",
				"placeholderTranslationID": "user.firstName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a FirstName is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "lastName",
				"visible": true,
				"label": "Last Name",
				"labelTranslationID": "user.lastName",
				"placeholder": "ex. LAOUITI",
				"placeholderTranslationID": "user.lastName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a last name is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "identifier.uniqueID",
				"visible": true,
				"label": "Identifiant Unique",
				"labelTranslationID": "user.identifier.uniqueID",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "string",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "please enter your identifier",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "identifier.uniqueIdType",
				"visible": true,
				"label": "Type",
				"labelTranslationID": "user.identifier.uniqueIdType",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "combo",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please select a document Type",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain": 
				{ 
					"defaultDomain": [
										{
											"key": "CIN",
											"value": "CIN",
											"translationID": ""
										},
										{
											"key": "Passeport",
											"value": "Passeport",
											"translationID": ""
										},
										{
											"key": "RC",
											"value": "RC",
											"translationID": ""
										}
				  					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "gender",
				"visible": true,
				"label": "Gender",
				"labelTranslationID": "user.gender",
				"placeholder": "",
				"placeholderTranslationID": "user.gender.placeholder",
				"type": "combo",
				"icon": "wc",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter your gender",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain":
				{
					"defaultDomain":
								[
									{
										"key": "Male",
										"value": "Male",
										"translationID": "user.gender.male"
									},
									{
										"key": "Female",
										"value": "Female",
										"translationID": "user.gender.female"
									}
								]
							
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "birthdate",
				"visible": true,
				"label": "Birth date",
				"labelTranslationID": "user.birthdate",
				"placeholder": "ex. 01/01/2001",
				"placeholderTranslationID": "user.birthdate.placeholder",
				"format": "dd/MM/yyyy",
				"type": "date",
				"icon": "cake",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter an email adress",
							"validationMessageTranslationID": "user.email.validation.required"
						},
						{
							"validatorID": "birthDateValidator",
							"validatorKey": "invalidBirthDate_under18",
							"type": "GlobalCustomValidationService",
							"nature": "sync",
							"validationDefaultMessage": "This operation is not allowed for persons under the age of 18",
							"validationMessageTranslationID": "user.birthdate.validation.birthDateValidator"
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "city",
				"visible": true,
				"label": "City",
				"labelTranslationID": "user.city",
				"placeholder": "ex. Tunis",
				"placeholderTranslationID": "user.city.placeholder",
				"type": "string",
				"icon": "location_city",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address",
				"visible": true,
				"label": "Address",
				"labelTranslationID": "user.address",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address2",
				"visible": true,
				"label": "Address 2",
				"labelTranslationID": "user.address2",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 3,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "fonction",
				"visible": true,
				"label": "Fonction",
				"labelTranslationID": "user.fonction",
				"placeholder": "ex. lawyer",
				"placeholderTranslationID": "user.fonction.placeholder",
				"type": "string",
				"icon": "work",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 6,
					"groupOrder": 6
				}
			},
			{
				"entityFieldName": "mobile",
				"visible": true,
				"label": "Mobile",
				"labelTranslationID": "user.mobile",
				"placeholder": "ex. 21697111222",
				"placeholderTranslationID": "user.mobile.placeholder",
				"type": "phone",
				"icon": "phone_android",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "telephone",
				"visible": true,
				"label": "Tel",
				"labelTranslationID": "user.telephone",
				"placeholder": "ex. 21671111222",
				"placeholderTranslationID": "user.telephone.placeholder",
				"type": "phone",
				"icon": "local_phone",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "about",
				"visible": true,
				"label": "About",
				"labelTranslationID": "user.about",
				"placeholder": "What describes you the most ?",
				"placeholderTranslationID": "user.about",
				"type": "textarea",
				"icon": "assignment",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 9,
					"groupOrder": 9
				}
			},
			{
				"entityFieldName": "_entityCreatedBy",
				"label": "createdBy",
				"labelTranslationID": "user.createdby",
				"type": "composite",
				"typeName": "User",
				"visible": true,
				"order": 3,
				"fieldGroup": {
					"groupId": 11,
					"layout": "tab",
					"groupLabel": "Creator",
					"groupLabelTranslationID": "user.createdby",
					"groupOrder": 1
				}
			}
		]
	},
	"createUCViewLayout": {
		"orderedView": true,
		"title": "Create User",
		"titleTranslationID": "uc.create.user.title",
		"parentEntityLabel": "User Details",
		"parentEntityLabelTranslationId": "uc.create.user.label",
		"iconOrientation": "SUFFIX",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"visible": true,
				"label": "User Name",
				"labelTranslationID": "user.userName",
				"placeholder": "",
				"placeholderTranslationID": "",
				"type": "string",
				"icon": "person",
				"required": true,
				"disabled": false,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter a username",
							"validationMessageTranslationID": ""
						}
					]
				},
				"defaultValue": "",
				"order": 1,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "email",
				"visible": true,
				"label": "Email",
				"labelTranslationID": "user.email",
				"placeholder": "ex. test@test.com",
				"placeholderTranslationID": "user.email.placeholder",
				"type": "string",
				"icon": "email",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "maxLength",
							"validatorKey": "maxlength",
							"parameters": [
								30
							],
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "email should be less than 30 characters!"
						},
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter an email adress",
							"validationMessageTranslationID": "user.email.validation.required"
						},
						{
							"validatorID": "email",
							"validatorKey": "email",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Not a valid email",
							"validationMessageTranslationID": "user.email.validation.email"
						}
					],
					"asyncValidators": [
						{
							"validatorID": "emailAlreadyexistsValidator",
							"validatorKey": "emailNotAvailable",
							"type": "GlobalCustomValidationService",
							"nature": "async",
							"validationDefaultMessage": "email already exists",
							"validationMessageTranslationID": "user.email.validation.emailNotAvailable"
						}
					],
					"updateOn": "blur"
				},
				"defaultValue": "",
				"order": 2,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "password",
				"visible": true,
				"label": "password",
				"labelTranslationID": "user.password",
				"placeholder": "",
				"placeholderTranslationID": "",
				"type": "password",
				"required": false,
				"order": 3,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "firstName",
				"visible": true,
				"label": "First Name",
				"labelTranslationID": "user.firstName",
				"placeholder": "ex. Houcem",
				"placeholderTranslationID": "user.firstName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a FirstName is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "lastName",
				"visible": true,
				"label": "Last Name",
				"labelTranslationID": "user.lastName",
				"placeholder": "ex. LAOUITI",
				"placeholderTranslationID": "user.lastName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a last name is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "identifier.uniqueID",
				"visible": true,
				"label": "Identifiant Unique",
				"labelTranslationID": "user.identifier.uniqueID",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "string",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "please enter your identifier",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "identifier.uniqueIdType",
				"visible": true,
				"label": "Type",
				"labelTranslationID": "user.identifier.uniqueIdType",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "combo",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please select a document Type",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain": 
				{ 
					"defaultDomain": [
										{
											"key": "CIN",
											"value": "CIN",
											"translationID": ""
										},
										{
											"key": "Passeport",
											"value": "Passeport",
											"translationID": ""
										},
										{
											"key": "RC",
											"value": "RC",
											"translationID": ""
										}
				  					]
				}
				,
				"order": 2,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "gender",
				"visible": true,
				"label": "Gender",
				"labelTranslationID": "user.gender",
				"placeholder": "",
				"placeholderTranslationID": "user.gender.placeholder",
				"type": "combo",
				"icon": "wc",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter your gender",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain": 
				{
					"defaultDomain":
								[
									{
										"key": "Male",
										"value": "Male",
										"translationID": "user.gender.male"
									},
									{
										"key": "Female",
										"value": "Female",
										"translationID": "user.gender.female"
									}
								]
							
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "birthdate",
				"visible": true,
				"label": "Birth date",
				"labelTranslationID": "user.birthdate",
				"placeholder": "ex. 01/01/2001",
				"placeholderTranslationID": "user.birthdate.placeholder",
				"format": "dd-MM-yyyy HH:mm",
				"type": "date",
				"icon": "cake",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter an email adress",
							"validationMessageTranslationID": "user.email.validation.required"
						},
						{
							"validatorID": "birthDateValidator",
							"validatorKey": "invalidBirthDate_under18",
							"type": "GlobalCustomValidationService",
							"nature": "sync",
							"validationDefaultMessage": "This operation is not allowed for persons under the age of 18",
							"validationMessageTranslationID": "user.birthdate.validation.birthDateValidator"
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "city",
				"visible": true,
				"label": "City",
				"labelTranslationID": "user.city",
				"placeholder": "ex. Tunis",
				"placeholderTranslationID": "user.city.placeholder",
				"type": "string",
				"icon": "location_city",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address",
				"visible": true,
				"label": "Address",
				"labelTranslationID": "user.address",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address2",
				"visible": true,
				"label": "Address 2",
				"labelTranslationID": "user.address2",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 3,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "fonction",
				"visible": true,
				"label": "Fonction",
				"labelTranslationID": "user.fonction",
				"placeholder": "ex. lawyer",
				"placeholderTranslationID": "user.fonction.placeholder",
				"type": "string",
				"icon": "work",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 6,
					"groupOrder": 6
				}
			},
			{
				"entityFieldName": "mobile",
				"visible": true,
				"label": "Mobile",
				"labelTranslationID": "user.mobile",
				"placeholder": "ex. 21697111222",
				"placeholderTranslationID": "user.mobile.placeholder",
				"type": "phone",
				"icon": "phone_android",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "telephone",
				"visible": true,
				"label": "Tel",
				"labelTranslationID": "user.telephone",
				"placeholder": "ex. 21671111222",
				"placeholderTranslationID": "user.telephone.placeholder",
				"type": "phone",
				"icon": "local_phone",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "role",
				"visible": false,
				"label": "Role",
				"labelTranslationID": "user.role",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "string",
				"icon": "groups",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 8,
					"groupLabel": "User Role",
					"groupLabelTranslationID": "user.group.userRole",
					"groupOrder": 8
				}
			},
			{
				"entityFieldName": "about",
				"visible": true,
				"label": "About",
				"labelTranslationID": "user.about",
				"placeholder": "What describes you the most ?",
				"placeholderTranslationID": "user.about",
				"type": "textarea",
				"icon": "assignment",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 9,
					"groupOrder": 9
				}
			},
			{
				"entityFieldName": "roles",
				"visible": true,
				"label": "Roles",
				"labelTranslationID": "user.roles",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "collection",
				"typeName": "Role",
				"icon": "groups",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 10,
					"layout": "tab",
					"groupLabel": "Roles",
					"groupLabelTranslationID": "user.group.userRole",
					"groupOrder": 1
				}
			}
		]
	},
	"editUCViewLayout": {
		"orderedView": true,
		"title": "Edit User",
		"titleTranslationID": "uc.edit.user.title",
		"parentEntityLabel": "User Details",
		"parentEntityLabelTranslationId": "uc.edit.user.label",
		"iconOrientation": "SUFFIX",
		"ucViewLayout": [
			{
				"entityFieldName": "userName",
				"visible": true,
				"label": "User Name",
				"labelTranslationID": "user.userName",
				"placeholder": "",
				"placeholderTranslationID": "",
				"type": "string",
				"icon": "person",
				"required": true,
				"disabled": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter a username",
							"validationMessageTranslationID": ""
						}
					]
				},
				"defaultValue": "",
				"order": 1,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "email",
				"visible": true,
				"label": "Email",
				"labelTranslationID": "user.email",
				"placeholder": "ex. test@test.com",
				"placeholderTranslationID": "user.email.placeholder",
				"type": "string",
				"icon": "email",
				"required": true,
				"disabled": true,
				"defaultValue": "",
				"order": 2,
				"fieldGroup": {
					"groupId": 1,
					"groupOrder": 1
				}
			},
			{
				"entityFieldName": "firstName",
				"visible": true,
				"label": "First Name",
				"labelTranslationID": "user.firstName",
				"placeholder": "ex. Houcem",
				"placeholderTranslationID": "user.firstName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a FirstName is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "lastName",
				"visible": true,
				"label": "Last Name",
				"labelTranslationID": "user.lastName",
				"placeholder": "ex. LAOUITI",
				"placeholderTranslationID": "user.lastName.placeholder",
				"type": "string",
				"icon": "emoji_people",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "a last name is required",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 2,
					"groupOrder": 2
				}
			},
			{
				"entityFieldName": "identifier.uniqueID",
				"visible": true,
				"label": "Identifiant Unique",
				"labelTranslationID": "user.identifier.uniqueID",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "string",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "please enter your identifier",
							"validationMessageTranslationID": ""
						}
					]
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "identifier.uniqueIdType",
				"visible": true,
				"label": "Type",
				"labelTranslationID": "user.identifier.uniqueIdType",
				"placeholder": "",
				"placeholderTranslationID": null,
				"type": "combo",
				"icon": "assignment",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please select a document Type",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain": 
				{ 
					"defaultDomain": [
										{
											"key": "CIN",
											"value": "CIN",
											"translationID": ""
										},
										{
											"key": "Passeport",
											"value": "Passeport",
											"translationID": ""
										},
										{
											"key": "RC",
											"value": "RC",
											"translationID": ""
										}
				  					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 3,
					"groupLabel": "Identifier",
					"groupLabelTranslationID": "user.group.identifier",
					"groupOrder": 3
				}
			},
			{
				"entityFieldName": "gender",
				"visible": true,
				"label": "Gender",
				"labelTranslationID": "user.gender",
				"placeholder": "",
				"placeholderTranslationID": "user.gender.placeholder",
				"type": "combo",
				"icon": "wc",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter your gender",
							"validationMessageTranslationID": ""
						}
					]
				},
				"targetFieldDomain": 
				{
					"defaultDomain":
								[
									{
										"key": "Male",
										"value": "Male",
										"translationID": "user.gender.male"
									},
									{
										"key": "Female",
										"value": "Female",
										"translationID": "user.gender.female"
									}
								]
							
				},
				"order": 1,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "birthdate",
				"visible": true,
				"label": "Birth date",
				"labelTranslationID": "user.birthdate",
				"placeholder": "ex. 01/01/2001",
				"placeholderTranslationID": "user.birthdate.placeholder",
				"format": "dd-MM-yyyy HH:mm",
				"type": "date",
				"icon": "cake",
				"required": true,
				"validators": {
					"syncValidators": [
						{
							"validatorID": "required",
							"validatorKey": "required",
							"type": "Validators",
							"nature": "sync",
							"validationDefaultMessage": "Please enter an email adress",
							"validationMessageTranslationID": "user.email.validation.required"
						},
						{
							"validatorID": "birthDateValidator",
							"validatorKey": "invalidBirthDate_under18",
							"type": "GlobalCustomValidationService",
							"nature": "sync",
							"validationDefaultMessage": "This operation is not allowed for persons under the age of 18",
							"validationMessageTranslationID": "user.birthdate.validation.birthDateValidator"
						}
					]
				},
				"order": 2,
				"fieldGroup": {
					"groupId": 4,
					"groupOrder": 4
				}
			},
			{
				"entityFieldName": "city",
				"visible": true,
				"label": "City",
				"labelTranslationID": "user.city",
				"placeholder": "ex. Tunis",
				"placeholderTranslationID": "user.city.placeholder",
				"type": "string",
				"icon": "location_city",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address",
				"visible": true,
				"label": "Address",
				"labelTranslationID": "user.address",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "address2",
				"visible": true,
				"label": "Address 2",
				"labelTranslationID": "user.address2",
				"placeholder": "ex. Southpark street n° 41 bis",
				"placeholderTranslationID": "user.address.placeholder",
				"type": "string",
				"icon": "place",
				"required": false,
				"order": 3,
				"fieldGroup": {
					"groupId": 5,
					"groupLabel": "Location",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 5
				}
			},
			{
				"entityFieldName": "fonction",
				"visible": true,
				"label": "Fonction",
				"labelTranslationID": "user.fonction",
				"placeholder": "ex. lawyer",
				"placeholderTranslationID": "user.fonction.placeholder",
				"type": "string",
				"icon": "work",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 6,
					"groupOrder": 6
				}
			},
			{
				"entityFieldName": "mobile",
				"visible": true,
				"label": "Mobile",
				"labelTranslationID": "user.mobile",
				"placeholder": "ex. 21697111222",
				"placeholderTranslationID": "user.mobile.placeholder",
				"type": "phone",
				"icon": "phone_android",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "telephone",
				"visible": true,
				"label": "Tel",
				"labelTranslationID": "user.telephone",
				"placeholder": "ex. 21671111222",
				"placeholderTranslationID": "user.telephone.placeholder",
				"type": "phone",
				"icon": "local_phone",
				"required": false,
				"order": 2,
				"fieldGroup": {
					"groupId": 7,
					"groupLabel": "Other Informations",
					"groupLabelTranslationID": "user.group.otherinformation",
					"groupOrder": 7
				}
			},
			{
				"entityFieldName": "about",
				"visible": true,
				"label": "About",
				"labelTranslationID": "user.about",
				"placeholder": "What describes you the most ?",
				"placeholderTranslationID": "user.about",
				"type": "textarea",
				"icon": "assignment",
				"required": false,
				"order": 1,
				"fieldGroup": {
					"groupId": 9,
					"groupOrder": 9
				}
			}
		]
	}
}`
}

function getDefaultRoleViewLayout(): string {
  return `{
    "defaultUCViewLayout": {
    },
    "searchInputUCViewLayout": {
        "orderedView": true,
        "title": "Roles Search Input",
        "titleTranslationID": "uc.search.role.title",
        "parentEntityLabel": "Search Criteria",
        "parentEntityLabelTranslationId": "uc.search.role.label",
        "iconOrientation": "SUFFIX",
        "ucViewLayout": [
        {
          "entityFieldName": "_entityLogicalName",
          "label": "name",
          "labelTranslationID": "role.name",
          "visible": true,
          "order": 1,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        },
        {
          "entityFieldName": "_entityDescription",
          "label": "description",
          "labelTranslationID": "role.description",
          "visible": true,
          "order": 2,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        }
      ]
      
    },
    "tableUCViewLayout": {
      "orderedView": false,
      "title": "Roles Search Result",
      "titleTranslationID": "app.search.result",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityLogicalName",
          "label": "name",
          "labelTranslationID": "role.name",
          "visible": true,
          "order": 1
        },
        {
          "entityFieldName": "_entityDescription",
          "label": "description",
          "labelTranslationID": "role.description",
          "visible": true,
          "order": 2
        },
        {
          "entityFieldName": "_entityCreatedBy",
          "label": "createdBy",
          "labelTranslationID": "role.createdby",
          "type": "composite",
          "typeName": "User",
          "visible": true,
          "order": 3
        },
        {
          "entityFieldName": "_entityUpdatedBy",
          "label": "updatedBy",
          "labelTranslationID": "role.updatedby",
          "type": "composite",
          "typeName": "User",
          "visible": true,
          "order": 4
        }
      ]
      
    },
    "selectableInputTableUCViewLayout": {
      "orderedView": false,
      "title": "Roles Search Result",
      "titleTranslationID": "app.search.result",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityLogicalName",
          "label": "name",
          "labelTranslationID": "role.name",
          "visible": true,
          "order": 1
        },
        {
          "entityFieldName": "_entityDescription",
          "label": "description",
          "labelTranslationID": "role.description",
          "visible": true,
          "order": 2
        }
      ]
    },
    "viewUCViewLayout": {
      "orderedView": true,
      "title": "View Role",
      "titleTranslationID": "uc.view.role.title",
      "parentEntityLabel": "Role Details",
      "parentEntityLabelTranslationId": "uc.view.role.label",
      "iconOrientation": "SUFFIX",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityLogicalName",
          "visible": true,
          "label": "Role Name",
          "labelTranslationID": "role.name",
          "placeholder": "",
          "placeholderTranslationID": "",
          "type": "string",
          "icon": "person",
          "required": true,
          "disabled": true,
          "validators": {
            "syncValidators": 
            [
                  {
                    "validatorID":"required", 
                    "validatorKey": "required", 
                    "type": "Validators", 
                    "nature": "sync",
                    "validationDefaultMessage": "Please enter a name", 
                    "validationMessageTranslationID": ""
                  }
            ]
          },
          "defaultValue": "",
          "order": 1,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        },
        {
          "entityFieldName": "_entityDescription",
          "visible": true,
          "label": "description",
          "labelTranslationID": "role.description",
          "placeholder": "",
          "placeholderTranslationID": "",
          "type": "string",
          "icon": "email",
          "required": false,
          "disabled": false,
          "defaultValue": "",
          "order": 2,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        },
              {
          "entityFieldName": "_entityCreatedBy",
          "label": "createdBy",
          "labelTranslationID": "user.createdby",
          "type": "composite",
          "typeName": "User",
          "visible": true,
          "order": 3,
          "fieldGroup": {
            "groupId": 10,
            "layout": "tab",
            "groupLabel": "Creator",
            "groupLabelTranslationID": "user.createdby",
            "groupOrder": 1
          }
        }
      ]
    },
    "createUCViewLayout": {
      "orderedView": true,
      "title": "Create Role",
      "titleTranslationID": "uc.create.role.title",
      "parentEntityLabel": "Role Details",
      "parentEntityLabelTranslationId": "uc.create.role.label",
      "iconOrientation": "SUFFIX",
      "ucViewLayout": [
        {
          "entityFieldName": "_entityLogicalName",
          "visible": true,
          "label": "Role Name",
          "labelTranslationID": "role.name",
          "placeholder": "",
          "placeholderTranslationID": "",
          "type": "string",
          "icon": "person",
          "required": true,
          "disabled": false,
          "validators": {
            "syncValidators": 
            [
                  {
                    "validatorID":"required", 
                    "validatorKey": "required", 
                    "type": "Validators", 
                    "nature": "sync",
                    "validationDefaultMessage": "Please enter a name", 
                    "validationMessageTranslationID": ""
                  }
            ]
          },
          "defaultValue": "",
          "order": 1,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        },
        {
          "entityFieldName": "_entityDescription",
          "visible": true,
          "label": "description",
          "labelTranslationID": "role.description",
          "placeholder": "",
          "placeholderTranslationID": "",
          "type": "string",
          "icon": "email",
          "required": false,
          "disabled": false,
          "defaultValue": "",
          "order": 2,
          "fieldGroup": {
            "groupId": 1,
            "groupOrder": 1
          }
        }
      ]
    },
    "editUCViewLayout": {
        "orderedView": true,
        "title": "Edit Role",
        "titleTranslationID": "uc.edit.role.title",
        "parentEntityLabel": "Role Details",
        "parentEntityLabelTranslationId": "uc.edit.role.label",
        "iconOrientation": "SUFFIX",
        "ucViewLayout": [
          {
            "entityFieldName": "_entityLogicalName",
            "visible": true,
            "label": "Role Name",
            "labelTranslationID": "role.name",
            "placeholder": "",
            "placeholderTranslationID": "",
            "type": "string",
            "icon": "person",
            "required": true,
            "disabled": false,
            "validators": {
              "syncValidators": 
              [
                    {
                      "validatorID":"required", 
                      "validatorKey": "required", 
                      "type": "Validators", 
                      "nature": "sync",
                      "validationDefaultMessage": "Please enter a name", 
                      "validationMessageTranslationID": ""
                    }
              ]
            },
            "defaultValue": "",
            "order": 1,
            "fieldGroup": {
              "groupId": 1,
              "groupOrder": 1
            }
          },
          {
            "entityFieldName": "_entityDescription",
            "visible": true,
            "label": "description",
            "labelTranslationID": "role.description",
            "placeholder": "",
            "placeholderTranslationID": "",
            "type": "string",
            "icon": "email",
            "required": false,
            "disabled": false,
            "defaultValue": "",
            "order": 2,
            "fieldGroup": {
              "groupId": 1,
              "groupOrder": 1
            }
          }
          
        ]
    }
  }`
}

export function addEntityExternalFieldMappingconfig(options: NgAddOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`🔧 Activating entity external mapping...`)
    let entityExMappingConfigFile = normalize(
      join(normalize(options.projectRootPath as string), `src/assets/entity/entity-config.json`),
    )
    context.logger.info(`🔧 Initializing entity external field mapping configuration...`)

    if (!host.exists(entityExMappingConfigFile)) {
      host.create(entityExMappingConfigFile, createEntityConfigTemplate())
      context.logger.info(
        `✅ Entity external field mapping configuration was initialized successfully!`,
      )
    }
  }
}

function createEntityConfigTemplate(): string {
  let envConfig = new EntityConfiguration()
  return JSON.stringify(envConfig)
}
