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
  Input,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  untracked,
  signal,
} from '@angular/core'
import { ThemePalette } from '@angular/material/core'
import { MatDialog, MatDialogRef } from '@angular/material/dialog'
import { AverosMessageDialogComponent } from './averos-message-dialog/averos-message-dialog.component'
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'
import { map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { ProgressSpinnerMode } from '@angular/material/progress-spinner'
import { AlertService, ApplicationSharedService } from '@averos/core'

// Define possible roles for the component instance
type NotificationRole = 'GlobalLoading' | 'GlobalAlerts' | 'LocalInline'

/**
 * AverosAppNotificationComponent
 *
 * Unified notification component that displays various types of alerts and loading indicators:
 * - Full-screen loading (progress bar or spinner based on device)
 * - Inline loading (spinner or progress bar for embedded components)
 * - Alert messages (success, error, warning) shown in dialogs
 *
 * This component automatically subscribes to the AlertService and displays
 * the appropriate UI based on the current alert state.
 *
 * @example
 * ```html
 * <averos-app-notification></averos-app-notification>
 * ```
 */
@Component({
  selector: 'averos-app-notification',
  templateUrl: './averos-app-notification.component.html',
  styleUrls: ['./averos-app-notification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AverosAppNotificationComponent {
  // ============================================================================
  // Injected Services
  // ============================================================================

  private readonly dialog = inject(MatDialog)
  private readonly alertService = inject(AlertService)
  private readonly breakpointObserver = inject(BreakpointObserver)
  private readonly appSharedService = inject(ApplicationSharedService)

  /**
   * Indicates if the device is a handset (mobile)
   * Used to determine responsive UI behavior
   */
  protected readonly isHandset = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset]).pipe(map((result) => result.matches)),
    { initialValue: false },
  )

  /**
   * Defines the specific responsibility of this component instance.
   * - 'GlobalLoading': Handles only full-screen progress (e.g., in the header).
   * - 'GlobalAlerts': Handles only dialog messages (e.g., in the body).
   * - 'LocalInline': Handles only local inline loading (e.g., tables/fields).
   * @default 'GlobalLoading'
   */
  @Input({ required: true }) role!: NotificationRole

  /**
   * If true, this component is used for local inline loading (Field Spinner or Grid Progress).
   * If false, this component is used for global Full-Screen Loading or Alert Dialogs.
   */
  @Input() isLocal = false

  private _isInlineLoadingOverride = signal(false)

  /**
   * Used exclusively when role is 'LocalInline' to provide the loading state.
   * @default false
   */
  @Input() set isInlineLoadingOverride(value: boolean) {
    this._isInlineLoadingOverride.set(value)
  }

  // ============================================================================
  // Optional Inputs - Styling Configuration
  // ============================================================================

  /**
   * Material theme color for progress indicators
   * @default 'primary'
   */
  @Input() color: ThemePalette = 'primary'

  /**
   * Progress bar/spinner mode
   * @default 'indeterminate'
   */
  @Input() mode: ProgressSpinnerMode = 'indeterminate'

  /**
   * Diameter of the spinner (in pixels)
   * @default 24
   */
  @Input() diameter = 24

  /**
   * Indicates if the inline loader is shown within a grid/table
   * When true, uses progress bar instead of spinner for inline loading
   * @default false
   */
  @Input() grid = false

  // ============================================================================
  // Protected State - Derived from AlertService
  // ============================================================================

  /**
   * Current alert message from the service
   */
  protected readonly message = this.alertService.alert

  /**
   * Computed: Is the current message an event message (success/error/warning)?
   */
  protected readonly isEventMessage = computed(() => {
    // Only the Body component (role='GlobalAlerts') cares about alert messages.
    if (this.role !== 'GlobalAlerts') {
      return false
    }
    const msg = this.message()
    return (
      msg &&
      (msg.type === AlertService.SUCCESS ||
        msg.type === AlertService.ERROR ||
        msg.type === AlertService.WARNING)
    )
  })

  /**
   * Computed: Is full-screen loading active?
   */
  protected readonly isFullScreenLoading = computed(() => {
    // Only the Header component (role='GlobalLoading') cares about the LOADING state.
    if (this.role !== 'GlobalLoading') {
      return false
    }
    const msg = this.message()
    return msg?.type === AlertService.LOADING
  })

  /**
   * Computed: Is inline loading active?
   */
  protected readonly isInlineLoading = computed(() => {
    if (this.isLocal) {
      // Local components (grid/spinner) use their own override input
      return this._isInlineLoadingOverride()
    }
    // The global instances should not display inline loading.
    return false
  })

  /**
   * Static reference to AlertService for template usage
   */
  protected readonly AlertService = AlertService

  // ============================================================================
  // Private State - Dialog Management
  // ============================================================================

  private currentDialogRef: MatDialogRef<AverosMessageDialogComponent> | null = null
  private lastProcessedMessage: any = null

  // ============================================================================
  // Constructor & Effects
  // ============================================================================

  constructor() {
    this.initializeAlertMessageEffect()
  }

  get darkThemeActivated() {
    return this.appSharedService.darkThemeActivated
  }
  /**
   * Initialize effect to automatically open dialogs for alert messages
   */
  private initializeAlertMessageEffect(): void {
    effect(() => {
      const msg = this.message()
      const isEvent = this.isEventMessage()

      // Only process if it's a new message (prevent duplicate dialogs)
      if (isEvent && msg && msg !== this.lastProcessedMessage) {
        untracked(() => {
          // Close existing dialog if any
          if (this.currentDialogRef) {
            this.currentDialogRef.close()
            this.currentDialogRef = null
          }

          // Open new dialog and track the message
          this.lastProcessedMessage = msg
          this.raiseNotificationMessage(msg)
        })
      } else if (!msg) {
        // Clear tracking when message is cleared
        untracked(() => {
          this.lastProcessedMessage = null
        })
      }
    })
  }

  // ============================================================================
  // Private Methods - Dialog Management
  // ============================================================================

  /**
   * Opens a dialog to display the notification message
   * @param message - The alert message to display
   */
  private raiseNotificationMessage(message: any): void {
    const responsiveWidth = this.isHandset() ? '90%' : '30%'

    this.currentDialogRef = this.dialog.open(AverosMessageDialogComponent, {
      width: responsiveWidth,
      data: { message },
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
    })

    // Clear the reference when dialog is closed
    this.currentDialogRef.afterClosed().subscribe(() => {
      this.currentDialogRef = null
    })
  }
}
