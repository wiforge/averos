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
  Injector,
  ViewChild,
  Input,
  forwardRef,
} from '@angular/core'
import { ControlValueAccessor, NgControl, NG_VALUE_ACCESSOR } from '@angular/forms'
import { MatSelectChange, MatSelect } from '@angular/material/select'
import { MatInput } from '@angular/material/input'
import { Observable } from 'rxjs'
import { Breakpoints, BreakpointObserver } from '@angular/cdk/layout'
import { map, shareReplay } from 'rxjs/operators'
import { AverosCriteria, AverosSearchOperator } from '@averos/core'

@Component({
  selector: 'averos-search-input-date-field',
  templateUrl: './averos-search-input-date-field.component.html',
  styleUrls: ['./averos-search-input-date-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AverosSearchInputDateFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosSearchInputDateFieldComponent implements OnInit, ControlValueAccessor {
  /*
   * default component appearance is "outline"
   * options includes : 'fill' | 'outline'
   */
  @Input()
  appearance: string = 'outline'

  @Input()
  public label!: string | null

  @Input()
  public labelTranslationID!: string | null

  @Input()
  public placeholder!: string

  @Input()
  public placeholderTranslationID!: string

  /*
   * Dates Inputs are disabled by default (inserting texts are not allowed for date fields)
   */
  @Input()
  public dateInputDisabled = true

  @Input()
  required = false

  // this parameter holds the entity accessor key (entity attributes)
  @Input() entityAccessorKey!: string

  // this parameter holds the value of the formControl field
  @Input() value!: string | null

  @ViewChild('operationSelect', { static: true }) public operationSelect!: MatSelect

  @ViewChild('matInputComponent', { static: true }) public matInputComponent!: MatInput

  selectedOperator!: AverosSearchOperator // {symbol: string, name: string};
  // this composite parameter will hold the field input value as well as
  // the selected operator.
  // It will be passerd to the parent formGroup
  outputCriteria: AverosCriteria = new AverosCriteria()

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay(),
  )
  public pickerDisabled = false
  formControlName!: NgControl

  onChange!: (_: any) => void
  onTouched!: () => void

  operations = AverosSearchOperator.AVEROS_DATE_SEARCH_OPERATIONS

  constructor(
    private injector: Injector,
    private breakpointObserver: BreakpointObserver,
  ) {}

  /*
   * This method is going to set the value, coming from the component/form
   * that is hosting this component, to the current component value
   */
  writeValue(value: string): void {
    this.value = value ? value : null
  }

  changeInputValue(parentHostInputValue: string) {
    this.value = parentHostInputValue
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

    // update the whole component value
    this.changeInputValue(this.value!)
  }

  /*
   * will be called once the input event triggered
   * hooked in the HTML component
   */
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
  setDisabledState?(isDisabled: boolean): void {
    this.dateInputDisabled = isDisabled
    this.pickerDisabled = isDisabled
    this.operationSelect.disabled = isDisabled
  }

  ngOnInit(): void {
    this.formControlName = this.injector.get(NgControl)
    this.selectedOperator = AverosSearchOperator.OPER_EQ
    this.matInputComponent.required = this.required
  }
}
