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
import { normalize, join, strings } from '@angular-devkit/core'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { EntityFieldMappingOption } from './schema'
import {
  EntityConfiguration,
  EntityConfigurationItem,
  EntityKeysMapping,
  toValidIdentifier,
} from '../util'

export function mapEntityFieldToExternalField(
  entityFieldMappingOption: EntityFieldMappingOption,
): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:map-entity-field"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(entityFieldMappingOption)}`)
    if (!entityFieldMappingOption.entityName || entityFieldMappingOption.entityName.trim() === '') {
      throw new SchematicsException(`Entity Name is mandatory! Please provide one`)
    }
    if (!entityFieldMappingOption.fieldKey || entityFieldMappingOption.fieldKey.trim() === '') {
      throw new SchematicsException(`Entity field key name is mandatory! Please provide one`)
    }
    if (
      !entityFieldMappingOption.externalKey ||
      entityFieldMappingOption.externalKey.trim() === ''
    ) {
      throw new SchematicsException(`External field key name is mandatory! Please provide one`)
    }
    const workspace = await getWorkspace(host)
    if (!entityFieldMappingOption.project) {
      entityFieldMappingOption.project = workspace.projects.keys().next().value

      if (!entityFieldMappingOption.project) {
        throw new SchematicsException(`❌ Cannot Retrieve the Project.`)
      }
    }
    context.logger.info(
      `🔍 Preparing to retrieve the project using: ${entityFieldMappingOption.project}`,
    )

    const project = workspace.projects.get(entityFieldMappingOption.project)
    if (!project) {
      throw new SchematicsException(`❌ Invalid project name: ${entityFieldMappingOption.project}`)
    }
    entityFieldMappingOption.projectRootPath = `${project.root}/`
    if (entityFieldMappingOption.path === undefined) {
      entityFieldMappingOption.path = buildDefaultPath(project)
    }
    return chain([createEntityFieldMapping(entityFieldMappingOption)])
  }
}

function createEntityFieldMapping(entityFieldMappingOption: EntityFieldMappingOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let environmentConfigurationLocation = normalize(
      join(normalize(entityFieldMappingOption.projectRootPath as string), `src/assets/entity/`),
    )

    let dirEntry: DirEntry = host.getDir(environmentConfigurationLocation)

    let entityConfigurationFileDirEntry = dirEntry.subfiles.find((e) => e === `entity-config.json`)
    let entityConfigurationFile

    if (!entityConfigurationFileDirEntry) {
      entityConfigurationFile = normalize(join(normalize(dirEntry.path), `entity-config.json`))
    } else {
      entityConfigurationFile = normalize(
        join(normalize(dirEntry.path), entityConfigurationFileDirEntry),
      )
    }
    if (!host.exists(entityConfigurationFile)) {
      let envConfig = new EntityConfiguration()
      host.create(entityConfigurationFile, JSON.stringify(envConfig))
    }

    let entityConfigurationContent = host.read(entityConfigurationFile)

    if (!entityConfigurationContent) {
      throw new Error(`❌ No entity configuration found for your application!`)
    }
    let entityConfigData: EntityConfiguration = JSON.parse(entityConfigurationContent.toString())

    entityConfigData = updateEntityConfiguration(
      entityConfigData,
      entityFieldMappingOption,
      context,
    )
    host.overwrite(entityConfigurationFile, JSON.stringify(entityConfigData))

    context.logger.info(
      `✅ The requested entity configuration entry has been added/updated successfully!`,
    )
  }
}

function updateEntityConfiguration(
  config: EntityConfiguration,
  mappingOption: EntityFieldMappingOption,
  context: SchematicContext,
): EntityConfiguration {
  const targetServicesArray = parseToArray(mappingOption.targetServices)
  const entityName = strings.classify(toValidIdentifier(mappingOption.entityName, 'class'))
  const fieldKey = mappingOption.fieldKey
  const externalKey = mappingOption.externalKey

  const updatedConfig = new EntityConfiguration()
  updatedConfig.globalAPICollectionResponseMappingLookup =
    config.globalAPICollectionResponseMappingLookup

  const originalEntityItem = config.configurationItems
    .map(EntityConfigurationItem.fromJSON)
    .find((e) => e.configurationId === entityName)

  updatedConfig.configurationItems = config.configurationItems
    .map(EntityConfigurationItem.fromJSON)
    .filter((item) => item.configurationId !== entityName)
    .map((item) => item.clone())

  if (isNull(originalEntityItem)) {
    const newItem = new EntityConfigurationItem(
      entityName,
      entityName,
      `${mappingOption.entityName.toLowerCase()}_lifecycle`,
    )
    newItem.externalKeysMapping.push(
      new EntityKeysMapping(targetServicesArray, { [fieldKey]: externalKey }),
    )
    updatedConfig.configurationItems.push(newItem)
    return updatedConfig
  }

  const updatedItem = originalEntityItem.clone()

  // Flatten to a per-service map ────────────────────────────────────
  // Each service gets its own independent keysMapping copy
  const perServiceMap = new Map<string, Record<string, string | number>>()

  for (const ekm of updatedItem.externalKeysMapping) {
    for (const service of ekm.targetServices) {
      if (perServiceMap.has(service)) {
        context.logger.warn(
          `⚠️ Duplicate mapping found for service: {${service}} !\n Updating the current existing mapping record...\n`,
        )
        // Merge keys into the existing entry (last-write wins per key)
        Object.assign(perServiceMap.get(service)!, ekm.keysMapping)
      } else {
        perServiceMap.set(service, { ...ekm.keysMapping })
      }
    }
  }

  // Apply the update to targeted services ───────────────────────────
  for (const service of targetServicesArray) {
    if (perServiceMap.has(service)) {
      // Update the specific field on this service's mapping
      perServiceMap.get(service)![fieldKey] = externalKey
    } else {
      // New service — start with just this key
      perServiceMap.set(service, { [fieldKey]: externalKey })
    }
  }

  // Re-group services with identical kesMappings ───────────────────
  // Use a stable JSON key so order doesn't matter
  const groupedMap = new Map<
    string,
    { services: string[]; keysMapping: Record<string, string | number> }
  >()

  for (const [service, keysMapping] of perServiceMap.entries()) {
    const groupKey = stableStringify(keysMapping)
    if (groupedMap.has(groupKey)) {
      groupedMap.get(groupKey)!.services.push(service)
    } else {
      groupedMap.set(groupKey, { services: [service], keysMapping: { ...keysMapping } })
    }
  }

  // Build final EntityKeysMapping list ──────────────────────────────
  updatedItem.externalKeysMapping = Array.from(groupedMap.values()).map(
    ({ services, keysMapping }) => new EntityKeysMapping([...services].sort(), keysMapping),
  )

  updatedConfig.configurationItems.push(updatedItem)
  return updatedConfig
}

// Stable stringify: sorts keys so {a:1, b:2} and {b:2, a:1} produce the same string
function stableStringify(obj: Record<string, string | number>): string {
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .reduce((acc, k) => ({ ...acc, [k]: obj[k] }), {} as Record<string, string | number>),
  )
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

function parseToArray(input: string | null | undefined): string[] {
  if (!input) {
    return ['*']
  }
  return input.split(',').map((item) => item.trim())
}
