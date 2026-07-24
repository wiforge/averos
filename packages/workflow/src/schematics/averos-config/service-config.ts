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
import { normalize, join } from '@angular-devkit/core'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { ServiceConfigurationOption } from './schema'
import { EnvironmentConfiguration, ServiceConfigurationItem } from '../util'

export default function (serviceConfigOptions: ServiceConfigurationOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    if (!serviceConfigOptions.id || serviceConfigOptions.id.trim() === '') {
      throw new SchematicsException(`Configuration ID is mandatory! Please provide one`)
    }
    if (!serviceConfigOptions.type || serviceConfigOptions.type.trim() === '') {
      throw new SchematicsException(`Configuration type is mandatory! Please provide one`)
    }

    const workspace = await getWorkspace(host)
    if (!serviceConfigOptions.project) {
      serviceConfigOptions.project = workspace.projects.keys().next().value

      if (!serviceConfigOptions.project) {
        throw new SchematicsException(`❌ Cannot Retrieve the Project.`)
      }
    }
    context.logger.info(
      `🔍 Preparing to retrieve the project using: ${serviceConfigOptions.project}`,
    )

    const project = workspace.projects.get(serviceConfigOptions.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${serviceConfigOptions.project}`)
    }
    serviceConfigOptions.projectRootPath = `${project.root}/`
    if (serviceConfigOptions.path === undefined) {
      serviceConfigOptions.path = buildDefaultPath(project)
    }
    ///// End Options Setup
    return chain([createApiServiceConfiguration(serviceConfigOptions)])
  }
}

export function createApiServiceConfiguration(
  serviceConfigOptions: ServiceConfigurationOption,
): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let environmentConfigurationLocation = normalize(
      join(normalize(serviceConfigOptions.projectRootPath as string), `src/assets/environment/`),
    )

    let dirEntry: DirEntry = host.getDir(environmentConfigurationLocation)

    let envConfigurationFileDirEntry = dirEntry.subfiles.find((e) => e === `env-config.json`)
    let serviceConfigurationFile

    if (!envConfigurationFileDirEntry) {
      serviceConfigurationFile = normalize(join(normalize(dirEntry.path), `env-config.json`))
    } else {
      serviceConfigurationFile = normalize(
        join(normalize(dirEntry.path), envConfigurationFileDirEntry),
      )
    }
    if (!host.exists(serviceConfigurationFile)) {
      /// create the file if it does not exist
      let envConfig = new EnvironmentConfiguration()
      host.create(serviceConfigurationFile, JSON.stringify(envConfig))
    }

    let serviceConfigurationContent = host.read(serviceConfigurationFile)

    if (!serviceConfigurationContent) {
      throw new Error(`❌ No Service configuration found for the language for your application!`)
    }
    let serviceConfigData: EnvironmentConfiguration = JSON.parse(
      serviceConfigurationContent.toString(),
    )

    updateServiceConfiguration(serviceConfigData, serviceConfigOptions)
    host.overwrite(serviceConfigurationFile, JSON.stringify(serviceConfigData))

    context.logger.info(
      `✅ The requested service configuration entry has been added/updated successfully!`,
    )
  }
}

function updateServiceConfiguration(
  srvConfigData: EnvironmentConfiguration,
  serviceConfigOptions: ServiceConfigurationOption,
): EnvironmentConfiguration {
  let serviceConfigItem: ServiceConfigurationItem = srvConfigData.configurationItems.find(
    (e) => e.type === 'service' && e.id === serviceConfigOptions.id,
  ) as ServiceConfigurationItem
  if (isNull(serviceConfigItem)) {
    // a new entry
    let serviceConfigItem_ = new ServiceConfigurationItem()
    serviceConfigItem_.id = serviceConfigOptions.id
    serviceConfigItem_.type = 'service'

    if (!isNull(serviceConfigOptions.apiHost) && serviceConfigOptions.apiHost !== undefined) {
      serviceConfigItem_.apiHost = serviceConfigOptions.apiHost
    }
    if (!isNull(serviceConfigOptions.apiPort) && serviceConfigOptions.apiPort !== undefined) {
      serviceConfigItem_.apiPort = serviceConfigOptions.apiPort
    }
    if (
      !isNull(serviceConfigOptions.apiProtocol) &&
      serviceConfigOptions.apiProtocol !== undefined
    ) {
      serviceConfigItem_.apiProtocol = serviceConfigOptions.apiProtocol
    }
    if (
      !isNull(serviceConfigOptions.apiHTTPQueryBuilder) &&
      serviceConfigOptions.apiHTTPQueryBuilder !== undefined
    ) {
      serviceConfigItem_.apiHTTPQueryBuilder = serviceConfigOptions.apiHTTPQueryBuilder
    }
    if (
      !isNull(serviceConfigOptions.apiEndPoint) &&
      serviceConfigOptions.apiEndPoint !== undefined
    ) {
      serviceConfigItem_.apiEndPoint = serviceConfigOptions.apiEndPoint
    }
    if (
      !isNull(serviceConfigOptions.externalEntityId) &&
      serviceConfigOptions.externalEntityId !== undefined
    ) {
      serviceConfigItem_.externalEntityId = serviceConfigOptions.externalEntityId
    }
    srvConfigData.configurationItems.push(serviceConfigItem_)
    return srvConfigData
  } else {
    // an update
    let serviceConfigItem_ = serviceConfigItem
    if (!isNull(serviceConfigOptions.apiHost) && serviceConfigOptions.apiHost !== undefined) {
      serviceConfigItem_.apiHost = serviceConfigOptions.apiHost
    }
    if (!isNull(serviceConfigOptions.apiPort) && serviceConfigOptions.apiPort !== undefined) {
      serviceConfigItem_.apiPort = serviceConfigOptions.apiPort
    }
    if (
      !isNull(serviceConfigOptions.apiProtocol) &&
      serviceConfigOptions.apiProtocol !== undefined
    ) {
      serviceConfigItem_.apiProtocol = serviceConfigOptions.apiProtocol
    }
    if (
      !isNull(serviceConfigOptions.apiHTTPQueryBuilder) &&
      serviceConfigOptions.apiHTTPQueryBuilder !== undefined
    ) {
      serviceConfigItem_.apiHTTPQueryBuilder = serviceConfigOptions.apiHTTPQueryBuilder
    }
    if (
      !isNull(serviceConfigOptions.apiEndPoint) &&
      serviceConfigOptions.apiEndPoint !== undefined
    ) {
      serviceConfigItem_.apiEndPoint = serviceConfigOptions.apiEndPoint
    }
    if (
      !isNull(serviceConfigOptions.externalEntityId) &&
      serviceConfigOptions.externalEntityId !== undefined
    ) {
      serviceConfigItem_.externalEntityId = serviceConfigOptions.externalEntityId
    }

    srvConfigData.configurationItems.splice(
      srvConfigData.configurationItems.indexOf(serviceConfigItem),
      1,
    )
    srvConfigData.configurationItems.push(serviceConfigItem_)
    return srvConfigData
  }
}

function isNull(object: any) {
  if (
    object === null ||
    object === undefined ||
    (object instanceof Array && (object as []).length === 0) ||
    (typeof object === 'string' && object.trim() === '') ||
    (typeof object === 'number' && object === 0)
  ) {
    return true
  } else {
    return false
  }
}
