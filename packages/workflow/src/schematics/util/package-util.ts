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
  addPackageJsonDependency,
  getPackageJsonDependency,
  NodeDependency,
  NodeDependencyType,
} from '@schematics/angular/utility/dependencies'
import { Observable, of } from 'rxjs'
import { SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics'
import {
  dependencies as dependencyLibVersions,
  externalDependencies as externalLibVersions,
} from '../deplib-versions.json'

/**
 * Package metadata for dependencies to be installed
 */
export interface PackageMetadata {
  packageName: string
  type: NodeDependencyType
}

export interface PackageInfo {
  packageVersion: string
  packageMetaData: PackageMetadata
}

/**
 * List of required Averos dependencies
 */
export const REQUIRED_PACKAGES: PackageMetadata[] = [
  { packageName: '@averos/workflow', type: NodeDependencyType.Default },
  { packageName: '@averos/ui-platform', type: NodeDependencyType.Default },
  { packageName: '@angular/material', type: NodeDependencyType.Default },
  { packageName: '@angular/cdk', type: NodeDependencyType.Default },
  { packageName: '@angular/localize', type: NodeDependencyType.Default },
  { packageName: 'file-saver', type: NodeDependencyType.Default },
]

/**
 * Gets the compliant version for a package
 */
export function getPackageCompliantVersion(
  packageMetaData: PackageMetadata,
): Observable<PackageInfo> {
  return of({
    packageVersion: getPackageVersion(packageMetaData.packageName),
    packageMetaData: packageMetaData,
  })
}

/**
 * Retrieves package version from dependency library versions
 */
export function getPackageVersion(packageName: string): string {
  let version = (dependencyLibVersions as Record<string, string>)[packageName]

  if (!version) {
    // try from extLib
    version = (externalLibVersions as Record<string, string>)[packageName]
    if (!version) {
      throw new SchematicsException(`❌ Version not found for package: ${packageName}`)
    }
  }
  return version
}

/**
 * Adds a single dependency to package.json
 */
export function addDependencyToPackageJson(
  host: Tree,
  context: SchematicContext,
  packageInfo: PackageInfo,
): void {
  const nodeDependency: NodeDependency = {
    type: packageInfo.packageMetaData.type,
    name: packageInfo.packageMetaData.packageName,
    version: packageInfo.packageVersion,
    overwrite: false,
  }

  const existingDep = getPackageJsonDependency(host, nodeDependency.name)

  if (!existingDep) {
    addPackageJsonDependency(host, nodeDependency)
    context.logger.info(`✅ Added ${nodeDependency.name}@${nodeDependency.version}`)
  } else {
    context.logger.info(`ℹ️ ${nodeDependency.name} already installed (${existingDep.version})`)
  }
}
