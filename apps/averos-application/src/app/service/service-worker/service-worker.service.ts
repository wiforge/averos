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

import { ApplicationRef, Injectable } from '@angular/core'
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker'
import { AlertService } from '@averos/core'
import { concat, filter, first, interval, map } from 'rxjs'

@Injectable({
  providedIn: 'root',
})
export class ServiceWorkerService {
  constructor(
    private swUpdate: SwUpdate,
    private notificationService: AlertService,
    appRef: ApplicationRef,
  ) {
    if (this.swUpdate.isEnabled) {
      const updatesAvailable = swUpdate.versionUpdates.pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map((evt) => ({
          type: 'UPDATE_AVAILABLE',
          current: evt.currentVersion,
          available: evt.latestVersion,
        })),
      )

      updatesAvailable.subscribe((event) => {
        if (confirm(`A new update is available. Would you like to load the latest version?`)) {
          swUpdate.activateUpdate().then(() => document.location.reload())
        }
      })

      this.swUpdate.unrecoverable.subscribe((event) => {
        this.notificationService.error(
          'An error occurred that we cannot recover from:\n' +
            event.reason +
            '\n\nPlease reload the page.',
        )
      })

      // Allow the app to stabilize first, before starting
      // polling for updates with `interval()`.
      const appIsStable$ = appRef.isStable.pipe(first((isStable) => isStable === true))
      const everySixHours$ = interval(6 * 60 * 60 * 1000)
      const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$)

      everySixHoursOnceAppIsStable$.subscribe(() => this.swUpdate.checkForUpdate())
    }
  }
  checkForUpdates() {
    this.swUpdate.checkForUpdate()
  }
}
