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
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core'
import { Router } from '@angular/router'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'

import { Subject, takeUntil } from 'rxjs'
import { AverosAuthService, LoggerService, LogLevel, ProviderInfo } from '@averos/core'

/**
 * Dynamic login component supporting multiple authentication flows
 * Automatically adapts UI based on configured providers
 */

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class LoginComponent implements OnInit, OnDestroy {
  hidePassword = true
  loginForm!: FormGroup
  isLoading = false
  // errorMessage: string | null = null;

  // // Track which social provider is being used
  // currentProvider: 'firebase' | 'google' | 'github' | 'keycloak' | null = null;

  // Track which provider is being used
  currentProvider: string | null = null

  // Provider configuration
  hasCredentialsAuth = false
  hasDelegatedAuth = false
  delegatedProviders: ProviderInfo[] = []
  defaultProvider = ''

  private destroy$ = new Subject<void>()

  constructor(
    private averosAuth: AverosAuthService,
    private logger: LoggerService,
    private router: Router,
    private formBuilder: FormBuilder,
    private cdref: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // If already authenticated, redirect to home
    if (this.averosAuth.isAuthenticated()) {
      this.router.navigate(['/'])
      return
    }

    // Discover available providers and their flows
    this.discoverProviders()

    // Initialize login form only if credentials auth is available
    if (this.hasCredentialsAuth) {
      this.initializeForm()
    }

    // Subscribe to auth errors for user feedback
    this.subscribeToAuthErrors()

    // // Initialize login form
    // this.initializeForm();

    // Subscribe to auth errors for user feedback
    this.subscribeToAuthErrors()

    this.cdref.markForCheck()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  // ==========================================================
  // PROVIDER DISCOVERY
  // ==========================================================

  /**
   * Discover and categorize available authentication providers
   */
  private discoverProviders(): void {
    // Check what types of authentication flows are available
    this.hasCredentialsAuth = this.averosAuth.hasCredentialsProvider()
    this.hasDelegatedAuth = this.averosAuth.hasDelegatedProvider()

    // Get detailed info for delegated providers (social login buttons)
    this.delegatedProviders = this.averosAuth.getDelegatedProvidersInfo()

    // Get the default provider
    this.defaultProvider = this.averosAuth.getDefaultAuthProvider()

    this.logger.log('LoginComponent', LogLevel.DEBUG, 'Provider discovery:', {
      hasCredentialsAuth: this.hasCredentialsAuth,
      hasDelegatedAuth: this.hasDelegatedAuth,
      delegatedProviders: this.delegatedProviders.map((p) => p.name),
      defaultProvider: this.defaultProvider,
    })
  }

  // ==========================================================
  // FORM INITIALIZATION
  // ==========================================================

  private initializeForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required /*, Validators.email*/]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(32)]],
      rememberMeChecked: [false],
    })
  }

  get f() {
    return this.loginForm?.controls || {}
  }

  /**
   * Enable or disable all form controls
   */
  private setFormState(disabled: boolean): void {
    if (!this.loginForm) return

    if (disabled) {
      this.loginForm.disable()
    } else {
      this.loginForm.enable()
    }
  }

  // ==========================================================
  // DELEGATED AUTHENTICATION (Social/OAuth Providers)
  // ==========================================================

  /**
   * Handle delegated provider login (OAuth, SSO)
   * @param providerName The authentication provider to use
   */
  // async loginWithProvider(providerName: 'firebase' | 'google' | 'github' | 'keycloak'): Promise<void> {
  async loginWithProvider(providerName: string): Promise<void> {
    // Prevent multiple concurrent login attempts
    if (this.isLoading) {
      return
    }

    this.isLoading = true
    // this.errorMessage = null;
    this.currentProvider = providerName
    this.setFormState(true) // Disable form during social login

    try {
      this.logger.log('LoginComponent', LogLevel.DEBUG, `Initiating ${providerName} login`)

      // Switch to the requested provider
      await this.averosAuth.switchProvider(providerName)

      // For Keycloak, don't pass credentials - let it redirect
      // const loginOptions = providerName === 'keycloak'
      //   ? {} // No credentials for redirect flow
      //   : {
      //       provider: providerName,
      //       useRedirect: false // Use popup by default
      //     };

      const loginOptions = {} // no credentials for delegated flow

      // Trigger login (no credentials for delegated flow)
      const user = await this.averosAuth.login(loginOptions)

      if (user) {
        this.logger.log('LoginComponent', LogLevel.DEBUG, `${providerName} login successful:`, user)
        this.navigateAfterLogin()
      } else {
        this.logger.log(
          'LoginComponent',
          LogLevel.DEBUG,
          `${providerName} login was cancelled or returned no user`,
        )
        // this.router.navigate(['/login']);
        // User cancelled the login
        // this.errorMessage = 'Login was cancelled';
      }
    } catch (error: any) {
      this.logger.log('LoginComponent', LogLevel.ERROR, `${providerName} login failed:`, error)
      // this.handleLoginError(error, provider);
    } finally {
      this.isLoading = false
      this.currentProvider = null
      this.setFormState(false) // Re-enable form
    }
  }

  // ==========================================================
  // CREDENTIALS AUTHENTICATION (Form-based)
  // ==========================================================

  /**
   * Handle form submission for traditional username/password login
   */
  async onSubmit(): Promise<void> {
    // Validate form
    if (!this.loginForm || this.loginForm.invalid) {
      this.markFormAsTouched()
      return
    }

    // Prevent multiple concurrent submissions
    if (this.isLoading) {
      return
    }

    this.isLoading = true
    this.setFormState(true) // Disable form during submission
    this.currentProvider = 'credentials' /// TO-BE CHECKED!!!!!!!!
    // this.errorMessage = null;

    try {
      // Since this login page works with different provider a switchProvider is required
      // Switch to default provider (or first credentials provider)
      // switchProvider with no parameters will automatically select the default configured provider
      const credentialsProviders = this.averosAuth.getCredentialsProviders()
      const targetProvider = this.defaultProvider || credentialsProviders[0]

      this.logger.log(
        'LoginComponent',
        LogLevel.DEBUG,
        `Switching to credentials provider: ${targetProvider}`,
      )

      await this.averosAuth.switchProvider(targetProvider)

      // Perform login with form data
      await this.loginWithCredentials()
    } catch (error: any) {
      this.logger.log('LoginComponent', LogLevel.ERROR, 'Form login failed:', error)
      // this.handleLoginError(error, 'form');
    } finally {
      this.isLoading = false
      this.currentProvider = null
      this.setFormState(false) // Re-enable form
    }
  }

  /**
   * Execute login with form credentials
   */
  private async loginWithCredentials(): Promise<void> {
    const credentials = {
      username: this.f['username'].value,
      password: this.f['password'].value,
      // lastLoginIPAddress: this.applicationSharedService.currentIpAddress,
      rememberMe: this.f['rememberMeChecked'].value,
    }

    const user = await this.averosAuth.login(credentials)

    if (user) {
      this.logger.log('LoginComponent', LogLevel.DEBUG, 'Form login successful:', user)
      this.navigateAfterLogin()
    } else {
      this.logger.log('LoginComponent', LogLevel.DEBUG, 'Credentials login returned no user')
      // this.errorMessage = 'Login failed. Please check your credentials.';
    }
  }

  // ==========================================================
  // ERROR HANDLING
  // ==========================================================

  /**
   * Subscribe to authentication errors from the service
   */
  private subscribeToAuthErrors(): void {
    this.averosAuth.authError$.pipe(takeUntil(this.destroy$)).subscribe((error) => {
      if (error) {
        this.handleAuthError(error)
      }
    })
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): void {
    this.logger.log('LoginComponent', LogLevel.ERROR, 'Auth error received:', error)

    // Map error types to user-friendly messages
    // const errorMessages: Record<string, string> = {
    //   'INVALID_CREDENTIALS': 'Invalid username or password',
    //   'SESSION_EXPIRED': 'Your session has expired. Please log in again.',
    //   'NETWORK_ERROR': 'Network error. Please check your connection.',
    //   'UNAUTHORIZED': 'You are not authorized to access this resource.',
    //   'FORBIDDEN': 'Access forbidden.',
    //   'PROVIDER_ERROR': 'Authentication service error. Please try again.',
    // };

    // this.errorMessage = errorMessages[error.type] || error.message || 'An unexpected error occurred';
  }

  /**
   * Handle login errors with context
   */
  // private handleLoginError(error: any, context: string): void {
  //   // Check for user cancellation (not an error)
  //   if (error.code === 'auth/popup-closed-by-user' ||
  //       error.code === 'auth/cancelled-popup-request') {
  //     // this.errorMessage = null; // Don't show error for cancellation
  //     return;
  //   }

  //   // Handle specific error codes
  //   // const errorMap: Record<string, string> = {
  //   //   'auth/popup-blocked': 'Please allow popups for this site to sign in',
  //   //   'auth/network-request-failed': 'Network error. Please check your connection.',
  //   //   'auth/too-many-requests': 'Too many attempts. Please try again later.',
  //   //   'auth/user-disabled': 'This account has been disabled.',
  //   //   'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  //   // };

  //   // this.errorMessage = errorMap[error.code] ||
  //   //                     error.message ||
  //   //                     `${context} login failed. Please try again.`;
  // }

  // ==========================================================
  // NAVIGATION & UI HELPERS
  // ==========================================================

  /**
   * Navigate to home after successful login
   */
  private navigateAfterLogin(): void {
    // Could implement returnUrl logic here
    // const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.router.navigate(['/'])
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormAsTouched(): void {
    if (!this.loginForm) return
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched()
    })
  }

  /**
   * Check if a specific provider is currently loading
   */
  isProviderLoading(providerName: string): boolean {
    return this.isLoading && this.currentProvider === providerName
  }

  /**
   * Check if credentials form is currently loading
   */
  isCredentialsLoading(): boolean {
    return this.isLoading && this.currentProvider === 'credentials'
  }
  /**
   * Clear any displayed error messages
   */
  // clearError(): void {
  //   // this.errorMessage = null;
  // }
}
