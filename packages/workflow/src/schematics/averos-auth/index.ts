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
  Rule, Tree, SchematicsException,
  chain, SchematicContext, noop } from '@angular-devkit/schematics';
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { AverosAuthOption } from './schema';
import { join, normalize } from 'path';
import { addOrUpdateAverosAuthProvider, findClassImplementationFilePath, readIntoSourceFile } from '../util';
import { applyToUpdateRecorder, Change, NoopChange } from '@schematics/angular/utility/change';
import * as ts from 'typescript';
import { addDependencyToPackageJson, getPackageCompliantVersion, PackageInfo, PackageMetadata } from '../util/package-util';
import { concatMap, of } from 'rxjs';
import { NodeDependencyType } from '@schematics/angular/utility/dependencies';

/**
 * Supported authentication providers
 */
export enum AverosAuthProviderType {
  FIREBASE = 'firebase',
  GOOGLE = 'google',
  GITHUB = 'github',
  KEYCLOAK = 'keycloak',
  DUMMY = 'dummy',
  CUSTOM = 'custom'
}


export default function (option: AverosAuthOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-auth" `);
    context.logger.info(`🔧 Using options: ${JSON.stringify(option)}`);
    
    if (!option.provider || option.provider.trim() === '') {
      context.logger.error(`auth provider = ${option.provider} is INVALID`);
      context.logger.info('⏭️  Skipping authentication setup');
      return noop();
    }

    context.logger.info(`🔐 Configuring authentication provider: ${option.provider}`);
    const workspace = await getWorkspace(host);
    if (!option.project) {
      option.project = workspace.projects.keys().next().value;
  
      if (!option.project) {
        throw new SchematicsException(`❌ Cannot Retrieve the Project.`);
      }
    }
    context.logger.info(`☑️ Authentication capability will be added to the project.`);
    context.logger.info(`🔍 Preparing to retrieve the project using: ${option.project}`);
   
    const project = workspace.projects.get(option.project);
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${option.project}`);
    }

    if (option.path === undefined) {// source path
      option.path = buildDefaultPath(project);
    }

    return chain([
        addAuthProvider(option),
        installAuthProviderDependencies(option)
    ]);
  };
}

function addAuthProvider(option: AverosAuthOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    // let modulePath = normalize(join(normalize(option.path as string), '/app-module.ts'));
    const modulePath = findClassImplementationFilePath(host, 'AppModule');
    if (!host.exists(modulePath)){
      throw new Error(`❌ Unable to find the main application module in the following location: ${modulePath}`);
    }
    context.logger.info(`🔧 Module found at: ${modulePath}`);
    let source  = readIntoSourceFile(host, modulePath);
    const updateModuleLanguage = integrateAuthToAverosModule(source , modulePath, option);
    const changes = updateModuleLanguage;
    const updateMainModulesRecorder = host.beginUpdate(modulePath);
    for (const change of changes) {
      applyToUpdateRecorder(updateMainModulesRecorder, [change]);
    }
    host.commitUpdate(updateMainModulesRecorder);
    context.logger.info(`🚀 The main application module has been successfully configured!`);

  };
}

function integrateAuthToAverosModule(source: ts.SourceFile, modulePath: string,  
    options: AverosAuthOption): Change[] {
      
      if(!source || !modulePath){
         return [new NoopChange()];
      }
      let providerType = ''; 
      let providerPackage = '@averos/core';
      switch (options.provider) {
        case AverosAuthProviderType.DUMMY:
          providerType = 'AverosDummyAuthProvider';
          break;
        case AverosAuthProviderType.FIREBASE:
          providerType = 'AverosFirebaseAuthProvider';
          break;
        case AverosAuthProviderType.GITHUB:
          providerType = 'AverosFirebaseAuthProvider';
          break;
        case AverosAuthProviderType.GOOGLE:
          providerType = 'AverosFirebaseAuthProvider';
          break;
        case AverosAuthProviderType.KEYCLOAK:
          providerType = 'AverosKeycloakAuthProvider';
          break;
        case AverosAuthProviderType.CUSTOM:
          if(!options.customProviderClassName && !options.customProviderPackage){
            return [new NoopChange()];
          }
          providerType = options.customProviderClassName;
          providerPackage = options.customProviderPackage;
          break;
      
        default:
          providerType = 'AverosDummyAuthProvider';
          break;
      }
      
return addOrUpdateAverosAuthProvider( source,
                            modulePath,
                            providerType,
                            providerPackage, 
                            options);
}

/**
 * Installs the required dependencies for the selected authentication provider
 */
function installAuthProviderDependencies(option: AverosAuthOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    const packageName = getAuthProviderPackageName(option.provider);
    
    if (!packageName) {
      context.logger.info(`ℹ️  No external dependencies required for provider: ${option.provider}`);
      return host;
    }

    context.logger.info(`📦 Installing required package: ${packageName}`);
    
    const packageMetadata: PackageMetadata = {
      packageName: packageName,
      type: NodeDependencyType.Default
    };

    // Get package version and install
    getPackageCompliantVersion(packageMetadata)
      .pipe(
        concatMap((packageInfo: PackageInfo) => {
          addDependencyToPackageJson(host, context, packageInfo);
          return of(null);;
        })
      )
      .subscribe({
        error: (err) => {
          context.logger.error(`❌ Failed to install ${packageName}: ${err.message}`);
        }
      });

    return host;
  };
}

/**
 * Maps authentication provider type to its required package name
 */
function getAuthProviderPackageName(provider: string): string | null {
  switch (provider) {
    case AverosAuthProviderType.FIREBASE:
    case AverosAuthProviderType.GOOGLE:
    case AverosAuthProviderType.GITHUB:
      return 'firebase';
    
    case AverosAuthProviderType.KEYCLOAK:
      return 'keycloak-js';
    
    case AverosAuthProviderType.DUMMY:
    case AverosAuthProviderType.CUSTOM:
    default:
      return null;
  }
}

