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
} from '@angular-devkit/schematics'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import {
  AverosConfigOption,
  GatewayConfigurationOption,
  ServiceConfigurationOption,
} from './schema'

export default function (options: AverosConfigOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-config"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    if (!options.id || options.id.trim() === '') {
      if (options.type === 'gateway') {
        options.id = 'APIServiceGateway'
      } else {
        throw new SchematicsException(`Configuration ID is mandatory! Please provide one`)
      }
    }
    if (!options.type || options.type.trim() === '') {
      throw new SchematicsException(`Configuration type is mandatory! Please provide one`)
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

    if (options.path === undefined) {
      options.path = buildDefaultPath(project)
    }

    return chain([
      options.type === 'service'
        ? schematic('service-config', getServiceConfigurationOptions(options))
        : noop(),
      options.type === 'gateway'
        ? schematic('gateway-config', getGatewayConfigurationOptions(options))
        : noop(),
    ])
  }
}
function getServiceConfigurationOptions(options: AverosConfigOption): ServiceConfigurationOption {
  let serviceConfigOptions = new ServiceConfigurationOption()
  serviceConfigOptions.type = options.type
  if (isNotNull(options.id)) {
    serviceConfigOptions.id = options.id as string
  }
  if (isNotNull(options.host)) {
    serviceConfigOptions.apiHost = options.host
  }
  if (isNotNull(options.port)) {
    serviceConfigOptions.apiPort = options.port
  }
  if (isNotNull(options.protocol)) {
    serviceConfigOptions.apiProtocol = options.protocol
  }
  if (isNotNull(options.endPoint)) {
    serviceConfigOptions.apiEndPoint = options.endPoint
  }
  if (isNotNull(options.httpQueryBuilder)) {
    serviceConfigOptions.apiHTTPQueryBuilder = options.httpQueryBuilder
  }
  if (isNotNull(options.externalEntityId)) {
    serviceConfigOptions.externalEntityId = options.externalEntityId
  }
  return serviceConfigOptions
}

function getGatewayConfigurationOptions(options: AverosConfigOption): GatewayConfigurationOption {
  let gatewayConfigOptions = new GatewayConfigurationOption()
  gatewayConfigOptions.type = options.type
  if (isNotNull(options.id)) {
    gatewayConfigOptions.id = options.id as string
  }
  if (isNotNull(options.host)) {
    gatewayConfigOptions.gatewayHost = options.host
  }
  if (isNotNull(options.port)) {
    gatewayConfigOptions.gatewayPort = options.port
  }
  if (isNotNull(options.protocol)) {
    gatewayConfigOptions.gatewayProtocol = options.protocol
  }

  if (isNotNull(options.protocol)) {
    gatewayConfigOptions.gatewayProtocol = options.protocol
  }

  if (isNotNull(options.endPoint) && isNotNull(options.endPoint)) {
    gatewayConfigOptions.endpoint = options.endPoint
    gatewayConfigOptions.endpointId = options.endPointId
    if (isNotNull(options.httpQueryBuilder) && isNotNull(options.httpQueryBuilder)) {
      gatewayConfigOptions.queryBuilder = options.httpQueryBuilder
    }
    if (isNotNull(options.externalEntityId) && isNotNull(options.externalEntityId)) {
      gatewayConfigOptions.externalEntityId = options.externalEntityId
    }
  }
  return gatewayConfigOptions
}

function isNotNull(option: any) {
  if (typeof option === 'number') {
    return option !== 0
  } else if (typeof option === 'string') {
    return option !== null && option.trim() !== ''
  } else {
    return option !== null
  }
}
