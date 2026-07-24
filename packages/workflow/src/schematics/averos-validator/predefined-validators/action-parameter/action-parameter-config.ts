/**
 * @license
 * Copyright (c) 2026 Wiforge.
 *
 * Licensed under the MIT License.
 * See the LICENSE file in the project root for license information.
 */

import { Rule, Tree, SchematicContext, schematic } from '@angular-devkit/schematics'
import { AverosValidatorOption } from '../../schema'
import { AVEROS_VALIDATOR_WORKFLOW, PREDEFINED_VALIDATOR_WORKFLOW } from '../../../util'

export default function (options: AverosValidatorOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    options.previousSchematics = PREDEFINED_VALIDATOR_WORKFLOW
    return schematic(AVEROS_VALIDATOR_WORKFLOW, options)
  }
}
