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
  ViewChild,
  Input,
  forwardRef,
  Injector,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms'
import { MatSelect, MatSelectChange } from '@angular/material/select'
import { MatInput } from '@angular/material/input'
import { COMMA, SPACE } from '@angular/cdk/keycodes'
import { MatChipGrid, MatChipInputEvent } from '@angular/material/chips'
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'
import { MatFormFieldAppearance } from '@angular/material/form-field'
import { AverosCriteria, AverosSearchOperator } from '@averos/core'

export interface SearchChip {
  name: string
}

@Component({
  selector: 'averos-search-input-text-field',
  templateUrl: './averos-search-input-text-field.component.html',
  styleUrls: ['./averos-search-input-text-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AverosSearchInputTextFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchInputTextFieldComponent implements OnInit, ControlValueAccessor {
  // ########################### Chips attributes ##################
  visible = true
  selectable = true
  removable = true
  addOnBlur = true
  readonly separatorKeysCodes: number[] = [SPACE, COMMA]

  searchChip: SearchChip[] = []

  /*
   * default component appearance is "outline"
   * options includes : 'legacy' | 'standard' | 'fill' | 'outline'
   */
  @Input()
  appearance: MatFormFieldAppearance = 'outline'

  @Input()
  public label!: string

  @Input()
  public labelTranslationID!: string

  @Input()
  public placeholder!: string

  @Input()
  public placeholderTranslationID!: string

  @Input()
  public disabled = false

  @Input()
  public maxLength = 200

  @Input()
  required = false

  formControlName!: NgControl

  // this parameter holds the entity accessor key (entity attributes)
  @Input() entityAccessorKey!: string

  // this parameter holds the value of the formControl field
  @Input() value: any

  @ViewChild('operationSelect', { static: true }) public operationSelect!: MatSelect

  @ViewChild('matInputComponent', { static: true }) public matInputComponent!: MatInput

  @ViewChild('matChipList', { static: true }) public matChipList!: MatChipGrid

  selectedOperator!: AverosSearchOperator // {symbol: string, name: string};
  // this composite parameter will hold the field input value as well as
  // the selected operator.
  // It will be passerd to the parent formGroup
  outputCriteria: AverosCriteria = new AverosCriteria()

  onChange!: (_: any) => void
  onTouched!: () => void

  operations = AverosSearchOperator.AVEROS_DEFAULT_SEARCH_OPERATIONS

  constructor(private injector: Injector) {}

  /*
   * This method is going to set the value, coming from the component/form
   * that is hosting this component, to the current component value
   * method inherited from ControlValueAccessor interface
   */
  writeValue(value: any): void {
    // if the parent value has a default value
    // exemple (the input will hold the userName formcontrol value in a form parent group searchInputFormGoup)
    // this formcontrol (userName for instance) has the default value of 'default user name':
    //
    // searchInputFormGoup: FormGroup = this.fb.group({
    //   userName: ['default user name', null],
    // });
    if (value && value instanceof AverosCriteria) {
      this.value = value.entityValue
    } else {
      this.value = value ? value : null
    }
  }

  changeInputValue(parentHostInputValue: string) {
    if (
      this.selectedOperator === AverosSearchOperator.OPER_IN_ELEMENTS ||
      this.selectedOperator === AverosSearchOperator.OPER_NOT_IN_ELEMENTS
    ) {
      this.value = null
    } else {
      this.value = parentHostInputValue
    }

    if (parentHostInputValue) {
      this.outputCriteria.entityAccessor = this.entityAccessorKey
      this.outputCriteria.entityValue = parentHostInputValue
      this.outputCriteria.operator = this.selectedOperator
    } else {
      this.outputCriteria.initialize()
    }
    this.onChange(this.outputCriteria)
    this.onTouched()
  }

  // this will update the selected operation
  // each time the combo selection is triggered
  operationChange(event: MatSelectChange) {
    // update the selected value (operator)
    this.selectedOperator = event.value
    // initialize the searchChip array
    this.searchChip = []

    // update the whole component value
    this.changeInputValue(
      this.value != null && this.value instanceof AverosCriteria
        ? this.value.entityValue
        : this.value,
    )
  }

  onValueChange(averosCriteria: AverosCriteria) {
    this.formControlName.control?.setValue(averosCriteria, { emitModelToViewChange: false })
  }

  /*
   * will be called once the input event triggered
   * hooked in the HTML component
   * methods inherited from ControlValueAccessor interface
   */
  registerOnChange(fn: any): void {
    this.onChange = this.onValueChange
  }
  /*
   * methods inherited from ControlValueAccessor interface
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
  /*
   * methods inherited from ControlValueAccessor interface
   */
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled
    this.operationSelect.disabled = isDisabled
  }

  ngOnInit(): void {
    this.formControlName = this.injector.get(NgControl)
    this.selectedOperator = AverosSearchOperator.OPER_EQ // {symbol: '==', name: 'eq'};
    if (this.matInputComponent) {
      this.matInputComponent.required = this.required
    }
  }

  // ##################### Chips methods #####################
  convertArrayToCommaSepValues(searchChip: SearchChip[]): string {
    let str = ''
    let i = 0
    searchChip.forEach((element) => {
      if (i > 0) {
        str = str.concat(',')
      }
      str = str.concat(element.name)
      i++
    })

    return str
  }

  add(event: MatChipInputEvent): void {
    const input = event.chipInput?.inputElement
    const value = event.value

    // Add a searchChip
    if ((value || '').trim()) {
      this.searchChip.push({ name: value.trim() })
    }

    // Reset the input value
    if (input) {
      input.value = ''
    }
    // update the formcontroller value
    this.changeInputValue(this.convertArrayToCommaSepValues(this.searchChip))
  }

  remove(searchChip: SearchChip): void {
    const index = this.searchChip.indexOf(searchChip)

    if (index >= 0) {
      this.searchChip.splice(index, 1)
    }
    // (this.value as AverosCriteria).entityValue = this.convertArrayToCommaSepValues(this.searchChip);
    // update the formcontroller value
    this.changeInputValue(this.convertArrayToCommaSepValues(this.searchChip))
  }

  drop(event: CdkDragDrop<SearchChip[]>) {
    moveItemInArray(this.searchChip, event.previousIndex, event.currentIndex)
  }
}
