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

import { Rule, Tree, SchematicsException, SchematicContext, noop } from '@angular-devkit/schematics'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { AverosAuthConfigOption } from './schema'
import { join, normalize } from 'path'
import { applyToUpdateRecorder } from '@schematics/angular/utility/change'
import { readIntoSourceFile, configureAverosAuthProvider, findClassImplementationFilePath } from '../util'

export default function (options: AverosAuthConfigOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-auth-config"`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)

    // UPDATED VALIDATION: provider required only when NOT in httpConfig mode
    if (!options.httpConfig && (!options.provider || options.provider.trim() === '')) {
      context.logger.error(`❌ Provider name is required when --http-config is not set`)
      return noop()
    }

    if (!options.key || options.key.trim() === '') {
      context.logger.error(`❌ Configuration key is required`)
      return noop()
    }

    if (options.value === undefined || options.value === null) {
      context.logger.error(`❌ Configuration value is required`)
      return noop()
    }

    if (options.httpConfig) {
      context.logger.info(`🔧 Configuring HTTP auth: ${options.key} = ${options.value}`)
    } else {
      context.logger.info(
        `🔧 Configuring ${options.provider} provider: ${options.key} = ${options.value}`,
      )
    }

    const workspace = await getWorkspace(host)
    if (!options.project) {
      options.project = workspace.projects.keys().next().value
      if (!options.project) {
        throw new SchematicsException(`❌ Cannot retrieve the project.`)
      }
    }

    const project = workspace.projects.get(options.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${options.project}`)
    }

    if (options.path === undefined) {
      options.path = buildDefaultPath(project)
    }

    return updateAuthProviderConfig(options)
  }
}

function updateAuthProviderConfig(options: AverosAuthConfigOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    // const modulePath = normalize(join(normalize(options.path as string), '/app-module.ts'))
    const modulePath = findClassImplementationFilePath(host, 'AppModule', true);

    if (!host.exists(modulePath)) {
      throw new Error(`❌ Unable to find the main application module at: ${modulePath}`)
    }

    context.logger.info(`🔧 Module found at: ${modulePath}`)
    const source = readIntoSourceFile(host, modulePath)
    const changes = configureAverosAuthProvider(source, modulePath, options, context)

    if (changes.length === 0) {
      return noop()
    }

    const updateRecorder = host.beginUpdate(modulePath)
    changes.forEach((change) => {
      applyToUpdateRecorder(updateRecorder, [change])
    })
    host.commitUpdate(updateRecorder)

    context.logger.info(`✅ Configuration updated successfully!`)

    return host
  }
}
