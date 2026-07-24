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
import { GatewayConfigurationOption } from './schema'
import { ApiEndpoint, EnvironmentConfiguration, GatewayConfigurationItem } from '../util'

export default function (gatewayConfigOptions: GatewayConfigurationOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    if (!gatewayConfigOptions.type || gatewayConfigOptions.type.trim() === '') {
      throw new SchematicsException(`Configuration type is mandatory! Please provide one`)
    }
    const workspace = await getWorkspace(host)
    if (!gatewayConfigOptions.project) {
      gatewayConfigOptions.project = workspace.projects.keys().next().value

      if (!gatewayConfigOptions.project) {
        throw new SchematicsException(`❌ Cannot Retrieve the Project.`)
      }
    }
    context.logger.info(
      `🔍 Preparing to retrieve the project using: ${gatewayConfigOptions.project}`,
    )

    const project = workspace.projects.get(gatewayConfigOptions.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${gatewayConfigOptions.project}`)
    }
    gatewayConfigOptions.projectRootPath = `${project.root}/`
    if (gatewayConfigOptions.path === undefined) {
      gatewayConfigOptions.path = buildDefaultPath(project)
    }
    gatewayConfigOptions.id = 'APIServiceGateway'

    return chain([createApiGatewayConfiguration(gatewayConfigOptions)])
  }
}

export function createApiGatewayConfiguration(
  gatewayConfigOptions: GatewayConfigurationOption,
): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let environmentConfigurationLocation = normalize(
      join(normalize(gatewayConfigOptions.projectRootPath as string), `src/assets/environment/`),
    )

    let dirEntry: DirEntry = host.getDir(environmentConfigurationLocation)

    let envConfigurationFileDirEntry = dirEntry.subfiles.find((e) => e === `env-config.json`)
    let gatewayConfigurationFile
    if (!envConfigurationFileDirEntry) {
      gatewayConfigurationFile = normalize(join(normalize(dirEntry.path), `env-config.json`))
    } else {
      gatewayConfigurationFile = normalize(
        join(normalize(dirEntry.path), envConfigurationFileDirEntry),
      )
    }
    if (!host.exists(gatewayConfigurationFile)) {
      /// create the file if it does not exist
      let envConfig = new EnvironmentConfiguration()
      host.create(gatewayConfigurationFile, JSON.stringify(envConfig))
    }
    let gatewayConfigurationContent = host.read(gatewayConfigurationFile)

    if (!gatewayConfigurationContent) {
      throw new Error(`❌ No gateway configuration found for your application!`)
    }
    let gatewayConfigData: EnvironmentConfiguration = JSON.parse(
      gatewayConfigurationContent.toString(),
    )
    updateGatewayConfiguration(gatewayConfigData, gatewayConfigOptions)
    host.overwrite(gatewayConfigurationFile, JSON.stringify(gatewayConfigData))
    context.logger.info(`✅ The requested configuration entry has been added/updated successfully!`)
  }
}

function updateGatewayConfiguration(
  gatewayConfigData: EnvironmentConfiguration,
  gatewayConfigOptions: GatewayConfigurationOption,
) {
  let gatewayConfigItem: GatewayConfigurationItem = gatewayConfigData.configurationItems.find(
    (e) => e.type === 'gateway' && e.id === gatewayConfigOptions.id,
  ) as GatewayConfigurationItem
  if (isNull(gatewayConfigItem)) {
    // a new entry
    let gatewayConfigItem_ = new GatewayConfigurationItem()
    gatewayConfigItem_.id = gatewayConfigOptions.id
    gatewayConfigItem_.type = 'gateway'

    if (
      !isNull(gatewayConfigOptions.gatewayHost) &&
      gatewayConfigOptions.gatewayHost !== undefined
    ) {
      gatewayConfigItem_.gatewayHost = gatewayConfigOptions.gatewayHost
    }
    if (
      !isNull(gatewayConfigOptions.gatewayPort) &&
      gatewayConfigOptions.gatewayPort !== undefined
    ) {
      gatewayConfigItem_.gatewayPort = gatewayConfigOptions.gatewayPort
    }
    if (
      !isNull(gatewayConfigOptions.gatewayProtocol) &&
      gatewayConfigOptions.gatewayProtocol !== undefined
    ) {
      gatewayConfigItem_.gatewayProtocol = gatewayConfigOptions.gatewayProtocol
    }

    if (
      !isNull(gatewayConfigOptions.endpoint) &&
      gatewayConfigOptions.endpoint !== undefined &&
      !isNull(gatewayConfigOptions.endpointId) &&
      gatewayConfigOptions.endpointId !== undefined
    ) {
      let apiEndPointItem = new ApiEndpoint()
      apiEndPointItem.endpoint = gatewayConfigOptions.endpoint
      apiEndPointItem.id = gatewayConfigOptions.endpointId
      if (
        !isNull(gatewayConfigOptions.queryBuilder) &&
        gatewayConfigOptions.queryBuilder !== undefined
      ) {
        apiEndPointItem.queryBuilder = gatewayConfigOptions.queryBuilder
      }
      if (
        !isNull(gatewayConfigOptions.externalEntityId) &&
        gatewayConfigOptions.externalEntityId !== undefined
      ) {
        apiEndPointItem.externalEntityId = gatewayConfigOptions.externalEntityId
      }

      gatewayConfigItem_.apiEndpoints.push(apiEndPointItem)
    }

    gatewayConfigData.configurationItems.push(gatewayConfigItem_)
    return gatewayConfigData
  } else {
    // an update
    let gatewayConfigItem_ = gatewayConfigItem
    if (
      !isNull(gatewayConfigOptions.gatewayHost) &&
      gatewayConfigOptions.gatewayHost !== undefined
    ) {
      gatewayConfigItem_.gatewayHost = gatewayConfigOptions.gatewayHost
    }
    if (
      !isNull(gatewayConfigOptions.gatewayPort) &&
      gatewayConfigOptions.gatewayPort !== undefined
    ) {
      gatewayConfigItem_.gatewayPort = gatewayConfigOptions.gatewayPort
    }
    if (
      !isNull(gatewayConfigOptions.gatewayProtocol) &&
      gatewayConfigOptions.gatewayProtocol !== undefined
    ) {
      gatewayConfigItem_.gatewayProtocol = gatewayConfigOptions.gatewayProtocol
    }
    if (
      !isNull(gatewayConfigOptions.endpoint) &&
      gatewayConfigOptions.endpoint !== undefined &&
      !isNull(gatewayConfigOptions.endpointId) &&
      gatewayConfigOptions.endpointId !== undefined
    ) {
      let apiEndpoint = gatewayConfigItem_.apiEndpoints.find(
        (e) => e.id === gatewayConfigOptions.endpointId,
      )
      let apiEndPointItem = new ApiEndpoint()
      apiEndPointItem.endpoint = gatewayConfigOptions.endpoint
      apiEndPointItem.id = gatewayConfigOptions.endpointId
      if (
        !isNull(gatewayConfigOptions.queryBuilder) &&
        gatewayConfigOptions.queryBuilder !== undefined
      ) {
        apiEndPointItem.queryBuilder = gatewayConfigOptions.queryBuilder
      }
      if (
        !isNull(gatewayConfigOptions.externalEntityId) &&
        gatewayConfigOptions.externalEntityId !== undefined
      ) {
        apiEndPointItem.externalEntityId = gatewayConfigOptions.externalEntityId
      }

      if (!isNull(apiEndpoint) && apiEndpoint !== undefined) {
        /// update the related endpoint url
        gatewayConfigItem_.apiEndpoints.splice(
          gatewayConfigItem_?.apiEndpoints.indexOf(apiEndpoint),
          1,
        )
        gatewayConfigItem_.apiEndpoints.push(apiEndPointItem)
      } else {
        //create a new endpoint item
        gatewayConfigItem_.apiEndpoints.push(apiEndPointItem)
      }
    }
    gatewayConfigData.configurationItems.splice(
      gatewayConfigData.configurationItems.indexOf(gatewayConfigItem),
      1,
    )
    gatewayConfigData.configurationItems.push(gatewayConfigItem_)
    return gatewayConfigData
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
