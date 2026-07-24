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
  apply,
  url,
  applyTemplates,
  move,
  chain,
  mergeWith,
  SchematicContext,
  noop,
  schematic,
} from '@angular-devkit/schematics'
import { strings, normalize, join, getSystemPath, relative, Path } from '@angular-devkit/core'
import { getWorkspace, buildDefaultPath } from '@schematics/angular/utility/workspace'
import { AverosValidatorOption } from './schema'
import {
  findClassImplementationFilePath,
  readIntoSourceFile,
  PredefinedEntityValidators,
  PREDEFINED_VALIDATOR_WORKFLOW,
  findAnnotatedClassImplementationFilePath,
  CUSTOM_VALIDATOR_WORKFLOW,
  AVEROS_VALIDATOR_WORKFLOW,
  isNull,
  EntityViewLayout,
  findEntityViewLayoutFilePath,
  ValidatorMetaData,
  addAverosCoreModuleToApplicationModuleImport,
  insertImport,
  removeTsExtension,
  addClassToApplicationMainModuleProviders,
  toValidIdentifier,
  classifyPreserveTrailingIndex,
} from '../util'
import * as ts from 'typescript'
import {
  applyToUpdateRecorder,
  Change,
  InsertChange,
  NoopChange,
} from '@schematics/angular/utility/change'
import { findNodes } from '@schematics/angular/utility/ast-utils'
 
export default function (options: AverosValidatorOption): Rule {
  return async (host: Tree, context: SchematicContext) => {
    context.logger.info(`📦 Running "ng g @averos/workflow:averos-validator"...`)
    context.logger.info(`🔧 Using options: ${JSON.stringify(options)}`)
    options.name = toValidIdentifier(options.name, 'class')
  
    let validatorAlreadyExist = false
    let predefinedValidator = PredefinedEntityValidators.isStandardValidator(options.name)
    let customValidationMethodExist = false
    options.type = predefinedValidator ? 'predefined' : 'custom'

    /// Check if the validator already exists
    context.logger.info(`🔍 Looking for a validator with name ${options.name}...`)
    const validatorFilePath = findClassImplementationFilePath(host, options.name)

    if (
      options.type === 'predefined' &&
      options.previousSchematics !== PREDEFINED_VALIDATOR_WORKFLOW
    ) {
      return schematic(PREDEFINED_VALIDATOR_WORKFLOW, options)
    }

    if (options.type === 'custom' && options.previousSchematics !== CUSTOM_VALIDATOR_WORKFLOW) {
      return schematic(CUSTOM_VALIDATOR_WORKFLOW, options)
    }

    if (!options.name || options.name.trim() === '') {
      throw new SchematicsException(`Validator Name is mandatory! Please provide one`)
    }
    options.classType = options.name
    if (!checkEntityAndEntityField(options.entityName, options.fieldName, host)) {
      return host
    }

    if (validatorFilePath) {
      context.logger.info(
        `☑️ Found the Validator ${options.name} in the following location ${validatorFilePath}`,
      )
      validatorAlreadyExist = true

      if (predefinedValidator && options.previousSchematics !== PREDEFINED_VALIDATOR_WORKFLOW) {
        return schematic(PREDEFINED_VALIDATOR_WORKFLOW, options)
      } else if (!predefinedValidator && options.previousSchematics !== CUSTOM_VALIDATOR_WORKFLOW) {
        return schematic(CUSTOM_VALIDATOR_WORKFLOW, options)
      } else if (!predefinedValidator && options.previousSchematics !== CUSTOM_VALIDATOR_WORKFLOW) {
        customValidationMethodExist = isMethodImplemented(
          host,
          validatorFilePath,
          options.validatorId,
        )
      }
    } else {
      context.logger.info(`☑️ Validator with name ${options.name} will be added...`)
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

    const templatesPath = normalize(join(normalize(options.path), 'validators') + '/')
    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        classifyPreserveTrailingIndex,
        getRelatedEntityPath,
        toLowerCase,
        ...options,
      }),
      move(getSystemPath(templatesPath)),
    ])

    return chain([
      /**
       * 1- if validator Name already exists => Check wether one of the predefined validators
       * 1-a- if predefined validator: then add the required entries to the view layout
       * 1-b- if not predefined entry then:
       *    - create a new validator with an empty validation method
       *    - update the entity view layout field validator with the new entry
       */

      !validatorAlreadyExist && !predefinedValidator ? mergeWith(templateSource) : noop(),
      !predefinedValidator ? registerCustomValidator(options) : noop(),
      !predefinedValidator && !customValidationMethodExist ? updateValidationMethodInCustomValidator(options) : noop(),
      assignValidatorToEntityFieldViewLayout(options),
    ])
  }
}

function getRelatedEntityPath(path: string): string {
  return join(normalize('../'), 'model')
}

function toLowerCase(str: string): string {
  return str ? str.toLowerCase() : ''
}

function assignValidatorToEntityFieldViewLayout(options: AverosValidatorOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    const entityVLFile = findEntityViewLayoutFilePath(host, options.entityName);
    if (!host.exists(entityVLFile)) {
      throw new Error(
        `❌ The requested entity view layout config related to the entity <<${options.entityName}>>does not exist!\n Is the entity provided an averos entity?`,
      )
    }

    let vlContent = host.read(entityVLFile)
    if (!vlContent) {
      return
    }
    let entityViewLayout: EntityViewLayout = JSON.parse(vlContent.toString())
    updateEntityViewLayout(entityViewLayout, options)
    host.overwrite(entityVLFile, JSON.stringify(entityViewLayout))
    context.logger.info(`✅ Validator successfully added to the view layout!`)
  }
}

/**
 * Updates the validator class by adding the requested validation method blueprint if it does not already exists
 *
 * @param options
 * @returns
 */
function updateValidationMethodInCustomValidator(options: AverosValidatorOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    const validatorFilePath = findClassImplementationFilePath(host, options.name)
    if (!validatorFilePath) {
      throw new Error(`❌ Unable to find the custom Validator: ${options.name}`)
    }

    let source = readIntoSourceFile(host, validatorFilePath)
    const updateModuleLanguage = createValidationMethodInClass(source, validatorFilePath, options)
    const changes = [updateModuleLanguage]
    applyChanges(host, validatorFilePath, changes)
    context.logger.info(
      `✅ The validator has been successfully registered in the main application module!`,
    )
  }
}

function registerCustomValidator(options: AverosValidatorOption): Rule {
  return (host: Tree, context: SchematicContext) => {
    if (options.path === null || options.path === undefined) {
      throw new Error(`❌ Cannot retrieve the project source path.`)
    }
    // let modulePath = normalize(join(normalize(options.path as string), 'app-module.ts'))
    let modulePath = findClassImplementationFilePath(host, 'AppModule');
    if (!host.exists(modulePath)) {
      throw new Error(
        `❌ Unable to find the main application module in the following location: ${modulePath}`,
      )
    }

    const validatorFilePath = findClassImplementationFilePath(host, options.name)
    if (!validatorFilePath) {
      throw new Error(`❌ Unable to find the custom Validator: ${options.name}`)
    }
    let validatorImportPath_ = `./${relative(options.path as Path, validatorFilePath as Path)}`
    let validatorImportPath = removeTsExtension(validatorImportPath_)

    let source = readIntoSourceFile(host, modulePath)
    const updateModuleLanguage = registerCustomValidatorInMainApplicationModule(
      source,
      modulePath,
      options,
      context,
      validatorImportPath,
    )
    const changes = updateModuleLanguage
    applyChanges(host, modulePath, changes)
    context.logger.info(
      `✅ The validator has been successfully registered in the main application module!`,
    )
  }
}

// Utility to apply changes to a file
function applyChanges(tree: Tree, filePath: string, changes: Change[]) {
  const recorder = tree.beginUpdate(filePath)

  for (const change of changes) {
    // if (change instanceof ReplaceChange) {
    applyToUpdateRecorder(recorder, [change])
    // } else {
    //   recorder.insertLeft(change.pos, change.toAdd);
    // }
  }

  tree.commitUpdate(recorder)
}

/**
 * Check wether the entity class name and the entity field exist
 * @param entityName
 * @param fieldName
 * @param host
 * @returns true | SchematicException
 */
function checkEntityAndEntityField(entityName: string, fieldName: string, host: Tree): boolean {
  if (entityName === null || entityName === undefined) {
    throw new SchematicsException(`Entity Name is mandatory! Please provide one`)
  }
  if (fieldName === null || fieldName === undefined) {
    throw new SchematicsException(`Entity Field Name is mandatory! Please provide one`)
  }

  // Check entity
  const entityFilePath = findClassImplementationFilePath(host, entityName)
  if (!entityFilePath) {
    // Entity does not exist
    throw new Error(`❌ Entity << ${entityName} >> does not exist!`)
  }
  // Check Member
  let source = readIntoSourceFile(host, entityFilePath)
  const propertiesDeclarationNodes__ = findNodes(
    source as any,
    ts.SyntaxKind.PropertyDeclaration,
  ) as unknown as ts.DeclarationStatement[]
  const memberDeclaration = propertiesDeclarationNodes__?.find(
    (n: ts.DeclarationStatement) => n.name?.text === fieldName,
  )
  if (!memberDeclaration) {
    // Member is not declared in the entity
    throw new Error(
      `❌ Member << ${fieldName} >> does not exist in the entity << ${entityName} >>!`,
    )
  }
  return true
}

/**
 * Checks whether a specified method is implemented in a class within a given file in the project tree.
 *
 * This function inspects the provided class file located in the project's virtual file tree
 * to determine if the specified method is implemented. It is commonly used in code generation,
 * schematics, or project analysis workflows.
 *
 * @param host - The `Tree` object representing the virtual file system of the project.
 *               This is typically used in Angular schematics or similar contexts.
 * @param classFilePath - The file path to the class file within the project tree.
 *                        The path should be relative to the root of the tree.
 * @param methodName - The name of the method to check for implementation within the class.
 * @returns `true` if the method is implemented in the specified class, `false` otherwise.
 *
 */
function isMethodImplemented(host: Tree, classFilePath: string, methodName: string): boolean {
  if (isNull(host) || isNull(classFilePath) || isNull(methodName)) {
    return false
  }
  let source = readIntoSourceFile(host, classFilePath)
  if (isNull(source)) {
    return false
  }
  const classDeclarationNode = source.statements.find(
    (n) => n.kind == ts.SyntaxKind.ClassDeclaration,
  )
  if (!classDeclarationNode) {
    // no entity class declaration found
    throw new Error(`❌ No Class Declaration Found!`)
  }
  const methodDeclarationNodes__ = findNodes(
    source as any,
    ts.SyntaxKind.MethodDeclaration,
  ) as unknown as ts.DeclarationStatement[]
  const methodDeclaration = methodDeclarationNodes__?.find(
    (n: ts.DeclarationStatement) => n.name?.text === methodName,
  )
  if (!methodDeclaration) {
    // no entity class declaration found
    return false
  } else {
    return true
  }
}

function createValidationMethodInClass(
  source: ts.SourceFile,
  classFilePath: string,
  options: AverosValidatorOption,
): Change {
  if (!source || !classFilePath) {
    return new NoopChange()
  }

  let methodName = toValidIdentifier(options.validatorId)

  const classDeclaration = source.statements.find(
    (node): node is ts.ClassDeclaration => ts.isClassDeclaration(node) && !!node.name,
  )

  if (!classDeclaration) {
    throw new Error(`Class not found in file: ${classFilePath}`)
  }

  const methodExists = classDeclaration.members.some(
    (member) => ts.isMethodDeclaration(member) && member.name.getText() === methodName,
  )

  if (methodExists) {
    /**
     * method already declared => do nothing
     *
     * TODO: in case the validation method is (synchronous and  without parameters)
     *  1- introduce a validation simple logic in the validation json configuration
     *  2- retrieve the validation logic (example #value > 10 which means 'the field value is invalid if its value is > 10)
     *  3- update the validation logic in the method
     *
     */
    console.log(`Method '${methodName}' already exists in the class.`)
    return new NoopChange()
  } else {
    // no method declaration found in the class
    // add the new member declaration to the entity
    // Find the closing brace of the class
    const classEnd = classDeclaration.getEnd()
    // Create the method implementation
    const methodImplementation = getValidationMethodImplementation(options)
    const change = new InsertChange(classFilePath, classEnd - 1, methodImplementation)
    return change
  }
}

function updateEntityViewLayout(
  viewLayoutContent: EntityViewLayout,
  options: AverosValidatorOption,
) {
  updateValidatorsInViewLayoutEntry(viewLayoutContent, 'createUCViewLayout', options)
  updateValidatorsInViewLayoutEntry(viewLayoutContent, 'editUCViewLayout', options)
  updateValidatorsInViewLayoutEntry(viewLayoutContent, 'viewUCViewLayout', options)
  return viewLayoutContent
}

function updateValidatorsInViewLayoutEntry(
  viewLayoutContent: EntityViewLayout,
  viewLayoutType: keyof EntityViewLayout,
  options: AverosValidatorOption,
) {
  let validatorEntry: ValidatorMetaData = {
    validatorID: `${toValidIdentifier(options.validatorId)}`, // Methods name are subject to conventions
    validatorKey: `${options.validatorKey}`,
    type: `${options.classType}`,
    nature: `${options.nature}`,
    validationDefaultMessage: `${options.validationDefaultMessage}`,
    validationMessageTranslationId: `${options.validationMessageTranslationId}`,
  }
  if (options.validationParameters && options.validationParameters !== 'none') {
    validatorEntry.parameters = parseValidationParameters(options.validationParameters)
  }

  let fvl = viewLayoutContent[viewLayoutType].ucViewLayout.find(
    (e) => e.entityFieldName === options.fieldName,
  )
  if (fvl) {
    if (!fvl.validators) {
      if (validatorEntry.nature === 'sync') {
        fvl['validators'] = {
          syncValidators: [validatorEntry],
        }
      }
      if (validatorEntry.nature === 'async') {
        fvl['validators'] = {
          syncValidators: [validatorEntry],
          updateOn: 'blur',
        }
      }
    } else {
      if (validatorEntry.nature === 'sync') {
        if (fvl.validators.syncValidators) {
          if (
            fvl.validators.syncValidators.findIndex(
              (e) => e.validatorID === validatorEntry.validatorID,
            ) < 0
          ) {
            fvl.validators.syncValidators.push(validatorEntry)
          }
        } else {
          fvl.validators = {
            syncValidators: [validatorEntry],
          }
        }
      }
      if (validatorEntry.nature === 'async') {
        if (fvl.validators.asyncValidators) {
          if (
            fvl.validators.asyncValidators.findIndex(
              (e) => e.validatorID === validatorEntry.validatorID,
            ) < 0
          ) {
            fvl.validators.asyncValidators.push(validatorEntry)
          }
          fvl.validators.updateOn = 'blur'
        } else {
          fvl.validators = {
            asyncValidators: [validatorEntry],
          }
        }
      }
    }
    // replace the old view layout with the new one
    let vlIndex = viewLayoutContent[viewLayoutType].ucViewLayout.findIndex(
      (e) => e.entityFieldName === options.fieldName,
    )
    viewLayoutContent[viewLayoutType].ucViewLayout.splice(vlIndex, 1)
    viewLayoutContent[viewLayoutType].ucViewLayout.push(fvl)
  }
}

/**
 * Parses a comma-separated string into an array of strings.
 *
 * This method takes a string with values separated by commas and splits it
 * into an array of individual strings. Empty entries are ignored, and leading
 * or trailing whitespace in each value is trimmed.
 *
 * Examples:
 * - Input: `"value1,value2,value3"`
 *   Output: `["value1", "value2", "value3"]`
 * - Input: `"value,"`
 *   Output: `["value"]`
 * - Input: `""`
 *   Output: `[]`
 *
 * @param input - A comma-separated string to be parsed. It may contain
 *                empty values or whitespace around entries.
 * @returns An array of strings, where each element corresponds to a trimmed
 *          non-empty value from the input string.
 */
function parseValidationParameters(input: string): string[] {
  return input
    .split(',') // Split the string by commas
    .map((value) => value.trim()) // Trim leading and trailing whitespace
    .filter((value) => value) // Remove empty strings
}

function registerCustomValidatorInMainApplicationModule(
  source: ts.SourceFile,
  modulePath: string,
  options: AverosValidatorOption,
  context: SchematicContext,
  validatorImportPath: string,
): Change[] {
  if (!source || !modulePath) {
    return [new NoopChange()]
  }
  const providerChanges = addClassToApplicationMainModuleProviders(
    source,
    modulePath,
    options.name,
    validatorImportPath,
  )
  return providerChanges
}

function getValidationMethodImplementation(options: AverosValidatorOption): string {
  if (options.nature === 'sync') {
    return getSyncValidationImplementation(options)
  } else if (options.nature === 'async') {
    return getAsyncValidationImplementation(options)
  } else {
    // By default 'sync'
    return getSyncValidationImplementation(options)
  }
}

function getSyncValidationImplementation(options: AverosValidatorOption): string {
  let methodName = toValidIdentifier(options.validatorId)
  let methodReturns = 'ValidatorFn'

  const methodImplementation = `\n  /**
  * The synchronous validator method  ${methodName} was generated by averos code generation workflow.
  * 
  * You may enhance this validation method bluprint with your own custom validation logic.
  *  
  * The following validation identifiers are used for this validator:
  *  - validatorID = ${methodName}
  *  - validatorKey = ${options.validatorKey}
  */
   ${methodName}(): ${methodReturns} {
     return (control: AbstractControl): ValidationErrors | null => {
       if (!control.value) {
         return null;
       }
       // implement your validation logic here 
       const valid = false; // not valid
       return valid ? null : { ${options.validatorKey}: true };
     };
   }`
  return methodImplementation
}

function getAsyncValidationImplementation(options: AverosValidatorOption): string {
  let methodName = toValidIdentifier(options.validatorId)
  let methodReturns = 'AsyncValidatorFn'

  const methodImplementation = `\n  /**
  * The asynchronous validator method  ${methodName} was generated by averos code generation workflow.
  * 
  * You may enhance this validation method bluprint with your own custom validation logic.
  *  
  * The following validation identifiers are used for this validator:
  *  - validatorID = ${methodName}
  *  - validatorKey = ${options.validatorKey}
  */
   ${methodName}(): ${methodReturns} {
     return (control: AbstractControl): Observable<ValidationErrors | null> => {

      // This is the input value subject to your validation
      let valueSubjectToValidation = control.value;

      /**
       * 
       * Depending on your asynchronous logic, replace the of(valueSubjectToValidation) 
       *  with a method that returns Observable (an api call for example).
       * 
       * Then upon returnedObject implement your validation logic 
       * (Here if returnedObject exist then the field value is invalid)
       * 
       * 
       **/
      return of(valueSubjectToValidation)
      .pipe(map(returnedObject => !!returnedObject ? { asyncValidatorNotValid: true } : null)
      , catchError(err =>  of({asyncValidatorNotValid: true})));
    };
   }`
  return methodImplementation
}

/**
 *
 * @param options
 * Inter field validation code gen is not yet supported.
 * To be supported in later phases
 * @returns
 */
function getInterFieldValidationImplementation(options: AverosValidatorOption): string {
  let methodName = toValidIdentifier(options.validatorId)
  let methodReturns = 'AsyncValidatorFn'

  const methodImplementation = `\n  /**
  * ${methodName} is an example of a synchronous validator with no parameters.
  * 
  * You may use this method template 
  *  to create your own synchronous validators along with your specific validatorID and validatorKey
  * 
  * The example below uses the following identifiers:
  *  - validatorID = syncValidationExample
  *  - validatorKey = syncValidationExampleNotValid
  */
   ${methodName}(): ${methodReturns} {
     return (control: AbstractControl): ValidationErrors | null => {
       if (!control.value) {
         return null;
       }
       // implement your validation logic here 
       const valid = false; // not valid
       return valid ? null : { syncValidationExampleNotValid: true };
     };
   }`
  return methodImplementation
}
