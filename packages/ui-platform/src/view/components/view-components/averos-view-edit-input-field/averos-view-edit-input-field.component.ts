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

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  forwardRef,
  Input,
  Injector,
  ViewChild,
  Output,
  EventEmitter,
  signal,
  inject,
} from '@angular/core'
import { NG_VALUE_ACCESSOR, NgControl, ControlValueAccessor } from '@angular/forms'
import { MatInput } from '@angular/material/input'
import { Observable, of } from 'rxjs'
import { map, shareReplay } from 'rxjs/operators'
import { AverosAppNotificationComponent } from '../../averos-app-notification'

import { LiveAnnouncer } from '@angular/cdk/a11y'

import { MatFormFieldAppearance } from '@angular/material/form-field'
import {
  AlertService,
  ComponentRegistrationHandler,
  DomainEntry,
  FieldType,
  SearchInputCriteria,
  TargetDomainField,
  TypeScriptTypeMetaDatatHandler,
  UseCaseAction,
} from '@averos/core'

@Component({
  selector: 'averos-view-edit-input-field',
  templateUrl: './averos-view-edit-input-field.component.html',
  styleUrls: ['./averos-view-edit-input-field.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AverosViewEditInputFieldComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosViewEditInputFieldComponent implements OnInit, ControlValueAccessor {
  readonly compositeEntity = signal<string>('')
  readonly announcer = inject(LiveAnnouncer)

  FieldType = FieldType // exposed FieldType enum to the template

  @ViewChild('matInputComponent') matInputComponent!: MatInput

  @ViewChild('appNotif', { static: true }) public appNotif!: AverosAppNotificationComponent

  @Input() editModeActivated = false
  @Input() controlErrorDescription!: string

  /**
   * This field holds the composite value to be displayed in case
   * The displayed value is the evaluation of compositeEntity.targetKeyForCompositeEntity.
   *
   **/
  @Input() targetKeyForCompositeEntity!: string

  // @Input()
  targetFieldDomain$!: Observable<any[]> // the target domain values - combo and multiple values

  @Input() targetFieldDomain!: TargetDomainField
  /*
   * default iconLayout is "component" (aligned with the component)
   * options includes : * "component" : icon aligned with the component
   *                    * "label" : icon aligned with label
   */
  @Input() iconLayout = 'component'

  /*
   * default component appearance is "outline"
   * options includes :  'fill' | 'outline'
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
  required = false

  // @Input() readOnly = false;

  @Input() type!: FieldType // the input type (number/text/date/collection....)

  @Input() icon

  /**
   * default icon orientation is RIGHT (SUFFIX) for edit usecase
   * and LEFT (PREFIX) for View usecase
   */
  @Input() iconOrientation = 'SUFFIX'

  // unsubscribeValueChanges$: Subject<void> = new Subject<void>();

  // this parameter holds the composite entity value accessor key (one of the composite entity attributes (either Id or businessName))
  @Input() compositeEntityAccessorKey: string | undefined

  // this parameter holds one of the main entty attributes accessor key.
  @Input() entityAccessorKey!: string

  private value_: any
  // this parameter holds the value of the formControl field
  @Input() set value(value: any) {
    this.value_ = value
    if (this.type === FieldType.composite) {
      value =
        !!value &&
        !!this.compositeEntityAccessorKey &&
        !TypeScriptTypeMetaDatatHandler.instance.isSimpleType(value)
          ? value[this.compositeEntityAccessorKey]
          : value
      this.updateCompositeRelation(value)
    }
    if (this.type === FieldType.combo) {
      this.triggerOpened() /// new: force domain controller execution
    }
  }

  get value() {
    return this.value_
  }
  @Output() componentValueChanged: EventEmitter<any> = new EventEmitter<any>()
  @Output() onCompositeRelationActionEvent: EventEmitter<any> = new EventEmitter<any>()
  // @Output() onCompositeRelationDeleteClickedEvent: EventEmitter<any> = new EventEmitter<any>();
  // @Output() onCompositeRelationAddClickedEvent: EventEmitter<any> = new EventEmitter<any>();

  isHandset$: Observable<boolean> = this.breakpointObserver
    // .observe(['(max-width: 350px)', '(max-width: 450px)'])
    // .observe('(max-width: 350px)')
    .observe(Breakpoints.Handset)
    .pipe(
      map((result) => result.matches),
      shareReplay(),
    )
  currentElementFocused = false
  startDate = new Date()

  formControlName!: NgControl

  onChange!: (_: any) => void
  onTouched!: () => void

  constructor(
    private injector: Injector,
    private breakpointObserver: BreakpointObserver,
    private alertService: AlertService,
    /*,private cd: ChangeDetectorRef*/
  ) {}

  ngOnInit(): void {
    this.targetFieldDomain$ = this.getFieldDomain(this.targetFieldDomain)

    this.formControlName = this.injector.get(NgControl)
    if (this.matInputComponent) {
      this.matInputComponent.required = this.required
    }

    // this.formControlName?.valueChanges
    // ?.pipe(
    //   debounceTime(50), // wait 0.05sec for the user to finish entering info before applying filter
    //   distinctUntilChanged(), // only apply the filter if the entered value is distinct
    //   takeUntil(this.unsubscribeValueChanges$) // once unsubscribe is applied, stop the listener
    // ).subscribe(
    //   (value: any) => {
    //     this.componentValueChanged.emit(value);
    //   },
    //   err => {
    //     console.error(err);
    //   }
    // );
  }

  triggerOpened() {
    this.targetFieldDomain$ = this.getFieldDomain(this.targetFieldDomain)
  }

  get alertservice() {
    return AlertService
  }
  get notificationService() {
    return this.alertService
  }

  displayValue(maxLength?: number): any {
    if (this.value === null || this.value === undefined) {
      return '- - -'
    }
    if (this.value instanceof Date) {
      return new Date(this.value).getFullYear()
    }
    /// default is String
    if (maxLength) {
      return (this.value as String).length > 10
        ? (this.value as String).substring(
            (this.value as String).length - maxLength,
            (this.value as String).length,
          )
        : this.value
    } else {
      return this.value
    }
  }

  get isDate(): boolean {
    return this.type && this.type === 'date' ? true : false
  }
  /*
   * This method is going to set the value, coming from the component/form
   * that is hosting this component, to the current component value
   * method inherited from ControlValueAccessor interface
   */
  writeValue(value: any): void {
    this.value = value !== undefined && value !== null ? value : null
  }

  changeInputValue(parentHostInputValue: string) {
    this.value = parentHostInputValue
    // this.onChange(this.value);
    // this.onTouched();
  }

  onCheckBoxChange(value: any) {
    // this.value = value;
    this.formControlName?.control?.patchValue(value, { emitEvent: false })
    this.componentValueChanged.emit({
      controlKey: this.formControlName.name,
      controlNewValue: value,
    })
  }

  onValueChange(value: any) {
    this.triggerOpened() /// new: force domain controller execution
    this.formControlName?.control?.patchValue(value, { emitEvent: false })
    this.componentValueChanged.emit({
      controlKey: this.formControlName.name,
      controlNewValue: value,
    })
  }

  // onFocus(event: any){
  //     this.currentElementFocused = true;
  // }

  getIndeterminate(value: any) {
    return value === undefined || value === null ? true : false
  }
  // onBlur(event: any ) {
  //   this.formControlName.control.setValue(event, {emitModelToViewChange: false});
  //   this.componentValueChanged.emit({controlKey: this.formControlName.name, controlNewValue: event});
  // }

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
    if (this.matInputComponent) {
      this.matInputComponent.disabled = isDisabled
    }
  }

  getFieldDomain(targetFieldDomain: TargetDomainField): Observable<DomainEntry[]> {
    if (!targetFieldDomain) {
      return of([])
    }
    if (targetFieldDomain.domainServiceRepository) {
      const domainController = ComponentRegistrationHandler.instance.getDomainController(
        targetFieldDomain.domainServiceRepository.domainControllerType,
      )
      const params = targetFieldDomain.domainServiceRepository.parameters
      return params
        ? domainController[targetFieldDomain.domainServiceRepository.domainControllerMethod](
            new SearchInputCriteria(params),
          )
        : domainController[targetFieldDomain.domainServiceRepository.domainControllerMethod](null)
    } else if (targetFieldDomain.defaultDomain) {
      return of(this.targetFieldDomain?.defaultDomain ?? [])
    } else {
      return of([])
    }
  }

  onCompositeRelationViewClicked(value: any) {
    this.onCompositeRelationActionEvent.emit({ action: UseCaseAction.VIEW, value: value })
  }

  onCompositeRelationAddClicked(value: any) {
    this.onCompositeRelationActionEvent.emit({ action: UseCaseAction.ADD, value: value })
  }
  onCompositeRelationDeleteClicked(value: any) {
    // this.removeCompositeRelation();
    this.componentValueChanged.emit({
      controlKey: this.formControlName.name,
      controlNewValue: null,
    })
    this.onCompositeRelationActionEvent.emit({ action: UseCaseAction.DELETE, value: value })
  }

  // private removeCompositeRelation(){
  //   this.compositeEntity.update(relationId =>  {
  //     this.announcer.announce(`removed ${relationId} `);
  //     return '';
  //   });

  // }

  protected updateCompositeRelation(value: any) {
    this.compositeEntity.update((relationId) => value)
    this.announcer.announce(`added ${value}`)

    return value
  }
}
