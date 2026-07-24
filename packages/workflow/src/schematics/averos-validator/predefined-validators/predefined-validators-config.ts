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

import { Rule, Tree, SchematicContext, noop, schematic } from '@angular-devkit/schematics'
import { AverosValidatorOption } from '../schema'
import {
  PREDEFINED_ACTION_GLOBAL_CUSTOM_VALIDATOR_WORKFLOW,
  PREDEFINED_ACTION_VALIDATORS_WORKFLOW,
  PREDEFINED_VALIDATOR_WORKFLOW,
} from '../../util'

export default function (options: AverosValidatorOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    let predefinedValidator = options.name
    options.previousSchematics = PREDEFINED_VALIDATOR_WORKFLOW

    switch (predefinedValidator) {
      case 'Validators':
        return schematic(PREDEFINED_ACTION_VALIDATORS_WORKFLOW, options)
      case 'GlobalCustomValidationService':
        return schematic(PREDEFINED_ACTION_GLOBAL_CUSTOM_VALIDATOR_WORKFLOW, options)
      default:
        return noop()
    }
  }
}
