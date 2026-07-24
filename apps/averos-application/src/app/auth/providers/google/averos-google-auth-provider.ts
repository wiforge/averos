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
 
import { Injectable } from '@angular/core'
import { AuthError, AuthUser, AverosAuthProvider } from '@averos/core'

import { BehaviorSubject, Subject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class AverosGoogleAuthProvider extends AverosAuthProvider {
  static override readonly typeName = 'AverosGoogleAuthProvider'

  private readonly _authState$ = new BehaviorSubject<AuthUser | null>(null)
  private readonly _authError$ = new Subject<AuthError>()

  readonly authState$ = this._authState$.asObservable()
  readonly authError$ = this._authError$.asObservable()

  private clientId!: string
  private decodedToken: any = null
  private rawToken: string | null = null

  async initialize(config: any): Promise<AuthUser | null> {
    this.clientId = config.googleClientId

    return new Promise((resolve) => {
      // @ts-ignore (Google GIS Global)
      google.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: any) => this.handleCredentialResponse(response, resolve),
      })

      // Optional: Auto-show One Tap
      // google.accounts.id.prompt();

      resolve(null)
    })
  }

  async login(): Promise<AuthUser | null> {
    // For Google native, we usually trigger the login button or the popup
    // @ts-ignore
    google.accounts.id.requestCode()
    return null // Logic continues in the callback
  }

  private handleCredentialResponse(response: any, resolve?: Function) {
    this.rawToken = response.credential
    this.decodedToken = this.decodeJwt(response.credential)
    const user = this.mapToAverosUser(this.decodedToken)
    this._authState$.next(user)
    if (resolve) resolve(user)
  }

  async logout(): Promise<void> {
    // @ts-ignore
    google.accounts.id.disableAutoSelect()
    this.rawToken = null
    this._authState$.next(null)
  }

  getToken(): string | null {
    return this.rawToken
  }

  async refreshToken(): Promise<AuthUser | null> {
    // Google GIS handles silent refresh if auto-select is enabled
    return this._authState$.value
  }

  getTokenExpiration(): string | null {
    return this.decodedToken ? new Date(this.decodedToken.exp * 1000).toISOString() : null
  }

  getTokenIssuedAt(): string | null {
    return this.decodedToken ? new Date(this.decodedToken.iat * 1000).toISOString() : null
  }

  // Simplified RBAC/ABAC for the showcase
  hasRole(role: string | string[]): boolean {
    return true
  }
  hasPermission(perm: string | string[]): boolean {
    return true
  }
  canAccess(res: string, act: string): boolean {
    return true
  }
  getRoles() {
    return []
  }
  getPermissions() {
    return []
  }
  async isSessionValid() {
    return !!this.rawToken
  }

  private decodeJwt(token: string) {
    return JSON.parse(atob(token.split('.')[1]))
  }

  private mapToAverosUser(decoded: any): AuthUser {
    return {
      id: decoded.sub,
      username: decoded.email,
      displayName: decoded.name,
      email: decoded.email,
      roles: ['user'],
      permissions: ['*'],
    }
  }
}
