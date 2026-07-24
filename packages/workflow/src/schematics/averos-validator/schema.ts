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

export class AverosValidatorOption {
  // the action to follow: either choose a predefined validator or create/use an existing one
  type?: string
  // The Validator name
  name?: string
  // The target entity name
  entityName?: string

  // The entity field to be validated
  fieldName?: string

  // The nature of the validator: sync | async.
  nature?: string

  // The validator ID a.k.a the method name.
  validatorId?: string

  // The validation key
  validatorKey?: string

  // The validation parameters used with the validation method (comma-separated values).
  validationParameters?: string

  // The Validator Class Name
  classType?: string

  // The default validation message
  validationDefaultMessage?: string

  // The translation id of the validation message
  validationMessageTranslationId?: string

  previousSchematics?: string

  // The path to create the service.
  path?: string

  // The name of the project.
  project?: string
}
