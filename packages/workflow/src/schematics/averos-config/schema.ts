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

export interface AverosConfigOption {
  // The type of the configuration
  type: string

  // The identifier of the configuration.
  id?: string

  // the api host/server
  host?: string

  // the api port
  port?: number

  //the api protocol
  protocol?: string

  //the api endpoint
  endPoint?: string

  //the related averos service name : : only mandatory for service type gateway
  endPointId?: string

  // The identifier that is used by the backend to identify the entity (_id is the default value)
  externalEntityId?: string

  //the http query builder
  httpQueryBuilder?: string

  // The path to create the service.
  path?: string

  // The name of the project.
  project?: string
}

export class ServiceConfigurationOption {
  // The identifier of the configuration.
  id: string

  // The type of the configuration
  type: string

  // the api host/server
  apiHost?: string

  // the api port
  apiPort?: number

  //the api protocol
  apiProtocol?: string

  // the HTTP query builder
  apiHTTPQueryBuilder?: string

  //the api endpoint
  apiEndPoint?: string

  // The identifier that is used by the backend to identify the entity.
  externalEntityId?: string

  // The path to the sources.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}

export class GatewayConfigurationOption {
  // The identifier of the configuration.
  id: string

  // The type of the configuration
  type: string

  // the gateway host/server
  gatewayHost?: string

  // the gateway port
  gatewayPort?: number

  //the gateway protocol
  gatewayProtocol?: string

  endpoint?: string
  endpointId?: string
  queryBuilder?: string
  // The identifier that is used by the backend to identify the entity.
  externalEntityId?: string

  // The path to the sources.
  path?: string

  // The name of the project.
  project?: string

  // the project root path
  projectRootPath?: string
}
