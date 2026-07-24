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
  SchematicContext,
  schematic,
  SchematicsException,
} from '@angular-devkit/schematics'
import { AverosValidatorOption } from '../../schema'
import {
  AVEROS_VALIDATOR_WORKFLOW,
  isNull,
  PREDEFINED_ACTION_PARAMETERS_WORKFLOW,
  PREDEFINED_VALIDATOR_WORKFLOW,
  PredefinedEntityValidators,
} from '../../../util'

export default function (options: AverosValidatorOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let predefinedValidator = options.name
    let predefinedValidationAction = options.validatorId
    let validationAction = PredefinedEntityValidators.getPredefinedValidationAction(
      predefinedValidator,
      predefinedValidationAction,
    )
    if (isNull(validationAction)) {
      throw new SchematicsException(
        `❌ The validation action ${predefinedValidationAction} was not found in the validator  ${predefinedValidator}`,
      )
    }
    options.validatorKey = validationAction.validationKey
    options.nature = validationAction.actionNature
    if (validationAction.hasParameters) {
      return schematic(PREDEFINED_ACTION_PARAMETERS_WORKFLOW, options)
    } else {
      options.previousSchematics = PREDEFINED_VALIDATOR_WORKFLOW
      return schematic(AVEROS_VALIDATOR_WORKFLOW, options)
    }
  }
}
