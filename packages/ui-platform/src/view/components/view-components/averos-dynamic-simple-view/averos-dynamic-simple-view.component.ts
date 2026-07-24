/**
 * @license
 * SPDX-License-Identifier: MIT
 *
 * Copyright (c) 2020-2026 Houssemeddine LAOUITI (Wiforge)
 * https://www.wiforge.com
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root of this repository.
 *
 */

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core'
import { FormControl, FormGroup } from '@angular/forms'
import {
  EntityAlteredRelationEventData,
  FieldType,
  FieldValidator,
  FormControlService,
  getCompositeFieldGroupName,
  getCompositeFieldsArrayKeysLenght,
  getCompositeFormControlName,
  Indexable,
  TypeScriptTypeMetaDatatHandler,
  UseCaseAction,
  UseCaseConfig,
  UseCaseViewLayout,
  FieldViewLayout,
} from '@averos/core'
import { Observable } from 'rxjs'

@Component({
  selector: 'averos-dynamic-simple-view',
  templateUrl: './averos-dynamic-simple-view.component.html',
  styleUrls: ['./averos-dynamic-simple-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosDynamicSimpleViewComponent<T extends Indexable> implements OnInit {
  @Input() useCaseConfig!: UseCaseConfig<T>
  @Input() entityUseCaseViewLayout$!: Observable<UseCaseViewLayout<T> | null>
  @Input() editModeActivated
  @Output() isFormModified: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() onCompositeRelationActionEvent: EventEmitter<any> = new EventEmitter<any>()

  @Input() set reactiveForm(reactiveForm: FormGroup) {
    // child view
    if (this.useCaseConfig.isRelationView || this.useCaseConfig.asyncRetrieval) {
      if (!this.internalReactiveForm) {
        this.internalReactiveForm = reactiveForm
      } else if (this.useCaseConfig.asyncRetrieval) {
        this.internalReactiveForm.reset(reactiveForm.value)
      }
      this.formModified = false
    }
    //parent view
    else {
      this.internalReactiveForm = reactiveForm
      this.formModified = false
      this.initializeFormValues()
    }
  }

  get reactiveForm() {
    return this.internalReactiveForm
  }

  internalReactiveForm!: FormGroup
  formModified = false
  private formInitialValue: any | null = null

  constructor(private formControlService: FormControlService) {}

  ngOnInit(): void {
    /// initialize values only for composite child relation view or asynchronous value retrieval
    if (this.useCaseConfig.isRelationView || this.useCaseConfig.asyncRetrieval) {
      this.initializeFormValues()
    }
  }

  initializeFormValues() {
    if (
      (this.useCaseConfig.isRelationView || this.useCaseConfig.asyncRetrieval) &&
      this.useCaseConfig?.onLoadCallback
    ) {
      let entityID = this.useCaseConfig.entity
      if (!entityID) {
        return
      }
      if (typeof this.useCaseConfig.entity !== 'string') {
        entityID =
          this.useCaseConfig.entity?.[
            TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
          ]
      }
      this.useCaseConfig
        ?.onLoadCallback(entityID) /// this.useCaseConfig.entity holds the composite child entity ID
        .subscribe({
          next: (loadedEntity: any) => {
            this.internalReactiveForm.reset(loadedEntity)
            this.formInitialValue = this.internalReactiveForm.getRawValue()
          },
          error: (err: Error) => {
            console.log(err)
          },
        })
    } else if (typeof this.useCaseConfig.entity !== 'string') {
      if (
        this.useCaseConfig.entity &&
        this.useCaseConfig.entity?.[
          TypeScriptTypeMetaDatatHandler.instance.getIdName(this.useCaseConfig.entityType)
        ] !== null
      ) {
        this.internalReactiveForm.patchValue(this.useCaseConfig.entity, { emitEvent: false })
        this.formInitialValue = this.internalReactiveForm.getRawValue()
      }
    }
  }

  getValidationMessage(
    form: FormGroup,
    fieldKey?: string,
    fieldValidator?: FieldValidator,
  ): string {
    if (
      this.useCaseConfig.getValidationMessage === null ||
      this.useCaseConfig.getValidationMessage === undefined
    ) {
      return this.formControlService.getValidationMessage(form, fieldKey ?? '', fieldValidator)
    }
    return this.useCaseConfig.getValidationMessage(form, fieldKey)
  }

  // Evaluate the related element parameter against the key
  evaluateExpression(element: T, key): any {
    return TypeScriptTypeMetaDatatHandler.instance.evaluateExpression(element, key)
  }

  isCompositeNavigationKey(entityFieldName: string) {
    if (entityFieldName === null || entityFieldName === undefined) {
      return false
    }
    return entityFieldName.split('.').length > 1
  }

  getCompositeEntityAccessorKey(fieldViewLayout: FieldViewLayout): string {
    if (!this.useCaseConfig.entityType) {
      return ''
    }
    if (
      fieldViewLayout.type === FieldType.composite &&
      !this.isCompositeNavigationKey(fieldViewLayout.entityFieldName)
    ) {
      let childEntityType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
        this.useCaseConfig.entityType,
        fieldViewLayout.entityFieldName,
      )
      if (childEntityType) {
        let businessName =
          TypeScriptTypeMetaDatatHandler.instance.getBusinessIdName(childEntityType)
        return businessName
      }
      return ''
    } else {
      return ''
    }
  }

  getFieldValue(entityFieldName: string) {
    let parameterValue: any
    const compositeKeys: Array<string> = entityFieldName.split('.')
    if (compositeKeys.length > 1) {
      parameterValue = this.internalReactiveForm
      for (const el of compositeKeys) {
        parameterValue = parameterValue.get(el)
      }
      return parameterValue?.value
    } else {
      // return this.internalReactiveForm.get(entityFieldName)?.value;
      //Check wether the fieldName is a composite field
      let control = this.internalReactiveForm.get(entityFieldName)
      if (control instanceof FormGroup) {
        let formGroup: FormGroup = control
        // return formGroup?.get(entityFieldName)?.value;
        return this.internalReactiveForm.get(entityFieldName)?.value
      } else if (control instanceof FormControl) {
        // Simple Field
        let fieldValue = this.internalReactiveForm.get(entityFieldName)?.value
        if (TypeScriptTypeMetaDatatHandler.instance.isSimpleType(fieldValue)) {
          return fieldValue
        } else {
          // the value is a composite entity such as {"_id": 123, "name": "CompEntity"...}
          return fieldValue
        }
      } else {
        return undefined
      }
    }
  }

  getCompositeFieldGroupName(compositeKey: string) {
    return getCompositeFieldGroupName(compositeKey)
  }

  getCompositeFormControlName(fieldName: string) {
    return getCompositeFormControlName(fieldName)
  }

  getCompositeFieldsArrayKeysLenght(compositeFieldName: string) {
    return getCompositeFieldsArrayKeysLenght(compositeFieldName)
  }

  onValueChange(emittedValue: any) {
    // let newValue: any;

    // if (emittedValue.controlNewValue instanceof MatSelectChange){
    //   newValue = emittedValue.controlNewValue.value;
    // } else if (emittedValue.controlNewValue instanceof Date){
    //   newValue = new Date(emittedValue.controlNewValue);
    // } else {
    //   newValue = emittedValue.controlNewValue;
    // }
    // const eValue = {
    //                 controlKey: emittedValue.controlKey,
    //                 controlNewValue: emittedValue.controlNewValue
    //               };

    // this.formModified = !this.deepEqual(this.internalReactiveForm.value, this.formInitialValue);
    this.formModified = !this.deepEqual(
      this.internalReactiveForm.getRawValue(),
      this.formInitialValue,
    )
    this.isFormModified.emit(this.formModified)
  }

  deepEqual(object1, object2): boolean {
    if (object2 === null || object2 === undefined) {
      if (object1 !== null) {
        return false
      }
    }
    const keys1 = Object.keys(object1)
    const keys2 = Object.keys(object2)

    if (keys1.length !== keys2.length) {
      return false
    }

    for (const key of keys1) {
      const val1 = object1[key]
      const val2 = object2[key]
      const areObjects = this.isObject(val1) && this.isObject(val2)
      // date comparaison
      if (val1 instanceof Date) {
        const d1 = new Date(val1)
        const d2 = new Date(val2)
        return (
          d1.getDay() === d2.getDay() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getFullYear() === d2.getFullYear()
        )
      }

      /**
       * -  composite types comparaison
       * -  simple types : if val1 == null or undefined and val2 == null or undefined then values are equals
       */
      if (
        (val1 === null || val1 === undefined || val1 === '') &&
        (val2 === null || val2 === undefined || val2 === '')
      ) {
        continue
      }
      if ((areObjects && !this.deepEqual(val1, val2)) || (!areObjects && val1 !== val2)) {
        return false
      }
    }

    return true
  }

  onCompositeRelationAction(emittedValue: any, fieldName: string) {
    switch (emittedValue.action) {
      case UseCaseAction.DELETE:
        this.onDeleteCompositeRelation(emittedValue, fieldName)
        break
      case UseCaseAction.ADD:
        this.onAddCompositeRelation(emittedValue, fieldName)
        break
      case UseCaseAction.VIEW:
        this.onViewCompositeRelation(emittedValue, fieldName)
        break
      default:
        break
    }
  }

  private onDeleteCompositeRelation(emittedValue: any, fieldName: string) {
    let childEntityType = TypeScriptTypeMetaDatatHandler.instance.getMemberType(
      this.useCaseConfig.entityType,
      fieldName,
    )
    if (childEntityType) {
      let entityAlteredRelationEventData: EntityAlteredRelationEventData = {
        action: UseCaseAction.DELETE,
        actionEventData: {
          itemSubjectToAction: emittedValue.value,
          relationName: fieldName,
          // formattedIdsSubjectToAction: this.transformToTargetIds([deleteRelationCollectionEventData.itemSubjectToAction[id_name]],id_name)
        },
        // resultingItemIdsCollection: resultingItemIdsForUpdate //as {_entityId: string}[],
      } as EntityAlteredRelationEventData

      this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
      this.isFormModified.emit(true)
    }
  }

  private onAddCompositeRelation(emittedValue: any, fieldName: string) {
    let entityAlteredRelationEventData: EntityAlteredRelationEventData = {
      action: UseCaseAction.ADD,
      actionEventData: {
        relationName: fieldName,
      },
    } as EntityAlteredRelationEventData

    this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
  }

  private onViewCompositeRelation(emittedValue: any, fieldName: string) {
    let entityAlteredRelationEventData: EntityAlteredRelationEventData = {
      action: UseCaseAction.VIEW,
      actionEventData: {
        itemSubjectToAction: emittedValue.value,
        relationName: fieldName,
      },
    } as EntityAlteredRelationEventData

    this.onCompositeRelationActionEvent.emit(entityAlteredRelationEventData)
  }

  isObject(object) {
    return object != null && typeof object === 'object'
  }
}
