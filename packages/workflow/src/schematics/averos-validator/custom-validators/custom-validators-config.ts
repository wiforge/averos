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

import { Rule, Tree, SchematicContext, schematic } from '@angular-devkit/schematics'
import { AverosValidatorOption } from '../schema'
import { AVEROS_VALIDATOR_WORKFLOW, CUSTOM_VALIDATOR_WORKFLOW } from '../../util'

export default function (options: AverosValidatorOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    options.previousSchematics = CUSTOM_VALIDATOR_WORKFLOW

    return schematic(AVEROS_VALIDATOR_WORKFLOW, options)
  }
}
