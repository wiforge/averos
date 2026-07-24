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
import { BehaviorSubject, Subject } from 'rxjs'
import { AuthError, AuthErrorType, AuthUser, AverosAuthProvider } from '@averos/core'

@Injectable({ providedIn: 'root' })
export class AverosGithubAuthProvider extends AverosAuthProvider {
  static override readonly typeName = 'AverosGithubAuthProvider'

  private readonly _authState$ = new BehaviorSubject<AuthUser | null>(null)
  private readonly _authError$ = new Subject<AuthError>()

  readonly authState$ = this._authState$.asObservable()
  readonly authError$ = this._authError$.asObservable()

  private userToken: string | null = null

  async initialize(config: any): Promise<AuthUser | null> {
    // Logic: Check if we are returning from GitHub with a ?code=
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      // Remove code from URL for cleanliness
      window.history.replaceState({}, document.title, window.location.pathname)
      return await this.exchangeCodeForToken(code, config.exchangeEndpoint)
    }
    return null
  }

  async login(config: any): Promise<AuthUser | null> {
    const rootUrl = 'https://github.com/login/oauth/authorize'
    const options = {
      client_id: config.githubClientId,
      redirect_uri: window.location.origin,
      scope: 'read:user user:email',
      state: 'some_random_state',
    }
    const qs = new URLSearchParams(options).toString()
    window.location.href = `${rootUrl}?${qs}`
    return null
  }

  private async exchangeCodeForToken(code: string, endpoint: string): Promise<AuthUser | null> {
    try {
      // IMPORTANT: You must have a backend endpoint to exchange this code
      // GitHub does not allow browser-based (CORS) token exchange for security.
      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      const data = await response.json()
      this.userToken = data.access_token

      const user = { id: data.id, username: data.login, roles: ['dev'], permissions: [] }
      this._authState$.next(user as any)
      return user as any
    } catch (e) {
      this._authError$.next({
        type: AuthErrorType.PROVIDER_ERROR,
        message: 'GitHub Exchange Failed',
      })
      return null
    }
  }

  // Satisfy remaining abstract methods with standard logic...
  async logout() {
    this.userToken = null
    this._authState$.next(null)
  }
  getToken() {
    return this.userToken
  }
  async refreshToken() {
    return null
  }
  async isSessionValid() {
    return !!this.userToken
  }
  getTokenExpiration() {
    return null
  } // GitHub tokens are often permanent until revoked
  getTokenIssuedAt() {
    return new Date().toISOString()
  }
  hasRole(r: any) {
    return true
  }
  hasPermission(p: any) {
    return true
  }
  canAccess(res: string, act: string) {
    return true
  }
  getRoles() {
    return []
  }
  getPermissions() {
    return []
  }
}
