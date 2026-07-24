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

import { BrowserModule } from '@angular/platform-browser'
import { NgModule, inject, provideAppInitializer } from '@angular/core'
import { AppRoutingModule } from './app-routing-module'
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http'
import { AverosCoreModule } from '@averos/ui-platform/core/averos-core.module'

import { ApplicationInitializerService } from './service/application-initializer.service'
import { CreateToDoAreaComponent } from './view/to-do-area/create-to-do-area/create-to-do-area.component'
import { SearchToDoAreaComponent } from './view/to-do-area/search-to-do-area/search-to-do-area.component'
import { CreateToDoTaskComponent } from './view/to-do-task/create-to-do-task/create-to-do-task.component'
import { SearchToDoTaskComponent } from './view/to-do-task/search-to-do-task/search-to-do-task.component'
import { ToDoAreaDetailsComponent } from './view/to-do-area/to-do-area-details/to-do-area-details.component'
import { ToDoTaskDetailsComponent } from './view/to-do-task/to-do-task-details/to-do-task-details.component'
import { CustomFieldValidatorService } from './validators/custom-field-validator.service'
import { CustomFieldDomainControllerService } from './domain-controllers/custom-field-domain-controller.service'
import { ServiceWorkerModule } from '@angular/service-worker'
import { ServiceWorkerService } from './service/service-worker/service-worker.service'
import { CreateCompositeTestEntityComponent } from './view/composite-test-entity/create-composite-test-entity/create-composite-test-entity.component'
import { CompositeTestEntityDetailsComponent } from './view/composite-test-entity/composite-test-entity-details/composite-test-entity-details.component'
import { SearchCompositeTestEntityComponent } from './view/composite-test-entity/search-composite-test-entity/search-composite-test-entity.component'

import { App } from './app'
import { AverosGithubAuthProvider } from './auth/providers/github/averos-github-auth-provider'
import { FIREBASE_CONFIG } from './auth/providers/firebase/config/firebase-config'
import {
  AVEROS_AUTH_FLOWS,
  AverosDummyAuthProvider,
  AverosFirebaseAuthProvider,
  AverosKeycloakAuthProvider,
  UserCustomValidationService,
} from '@averos/core'

// ******************* Custom application initializer loader ***/
export function applicationInitializer(
  applicationInitializerService: ApplicationInitializerService,
): () => Promise<any> {
  return () => applicationInitializerService.initialize()
}

@NgModule({
  declarations: [
    App,
    CreateToDoAreaComponent,
    SearchToDoAreaComponent,
    CreateToDoTaskComponent,
    SearchToDoTaskComponent,
    ToDoAreaDetailsComponent,
    ToDoTaskDetailsComponent,
    CreateCompositeTestEntityComponent,
    CompositeTestEntityDetailsComponent,
    SearchCompositeTestEntityComponent,
  ],
  bootstrap: [App],
  imports: [
    // WITH AUTH
    AverosCoreModule.forRoot({
      enableAuthentication: true,
      enableExternalEntityMapping: true,
      debug: true, // activate logging
      logLevel: 'DEBUG', // logging level
      supportedLanguages: ['en', 'fr', 'de', 'es', 'nl', 'se', 'no', 'ar', 'cn', 'jp', 'ru'],

      httpAuthConfig: {
        tokenHeader: 'Authorization',
        tokenPrefix: 'Bearer',
        publicRoutes: ['/public/*', '/health', '/api/version'],
        unauthorizedRedirect: '/login',
        withCredentials: true,
        maxRefreshRetries: 2,
      },

      // AUTH PROVIDER CONFIG 1 - SINGLE PROVIDER: DUMMY
      // authProvidersConfig: {
      //   name: 'dummy',
      //   provider: AverosDummyAuthProvider,
      //   config: {
      //     networkDelay: 0,       // Instant (for testing)
      //     autoLoginAs: 'ADMIN',  // Auto-login
      //     persistState: true,     // Survive refresh
      //     authFlow: 'credentials'
      //     // sessionDuration: 1440
      //   }
      // },

      // AUTH PROVIDER CONFIG 2 - SINGLE PROVIDER: KEYCLOAK
      // authProvidersConfig: {
      //   name: 'keycloak',
      //   provider: AverosKeycloakAuthProvider,
      //   config: {
      //         url: 'https://keycloak.example.com',
      //         realm: 'my-application-realm',
      //         clientId: 'angular-client',

      //         // Optional configurations
      //         enablePkce: true,
      //         enableTokenRefresh: true,
      //         minValidity: 70,
      //         checkLoginIframe: true,
      //         checkLoginIframeInterval: 5,

      //         redirectUri: window.location.origin,
      //         postLogoutRedirectUri: window.location.origin + '/login',

      //         scope: 'openid profile email roles',
      //         debug: true,
      //         loadUserProfileOnInit: true,

      //         // Averos config
      //         // selfManaged: true,
      //         persistState: true,     // Survive refresh,
      //         persistActiveProvider: true
      //     },
      // },

      // AUTH PROVIDER CONFIG 3 - SINGLE PROVIDER: FIREBASE
      // authProvidersConfig: {
      //   name: 'firebase',
      //   provider: AverosFirebaseAuthProvider,
      //   config: {
      //                   firebaseConfig: FIREBASE_CONFIG,
      //                   defaultProvider: 'google',
      //                   enablePopupFallback: true,
      //                   persistTokens: true,
      //                   debug: true,
      //                   defaultScopes: {
      //                     google: ['profile', 'email'],
      //                     github: ['user:email', 'read:user'],
      //                     facebook: ['email', 'public_profile']
      //                   },
      //                   selfManaged: true,
      //                   authFlow: AverosAuthFlow.DELEGATED
      //         }
      // },

      // AUTH PROVIDER CONFIG 4 - MULTIPLE PROVIDERS
      authProvidersConfig: {
        defaultProvider: 'dummy', // default provider is dummy : Check DUMMY_TEST_USERS for login credentials
        providers: [
          // DUMMY AUTH PROVIDER
          {
            name: 'dummy',
            provider: AverosDummyAuthProvider,
            config: {
              networkDelay: 0, // Instant (for testing)
              // autoLoginAs: 'ADMIN',  // Auto-login
              persistState: true,
              defaultTokenLifetimeMinutes: 5, // minute,
              authFlow: AVEROS_AUTH_FLOWS.CREDENTIALS,
            },
          },

          // KEYCLOAK
          {
            name: 'keycloak',
            provider: AverosKeycloakAuthProvider,
            config: {
              url: 'http://192.168.219.1:8080',
              // the keycloak REALM_NAME
              realm: 'averos-realm',
              // the the keycloak CLIENT_ID
              clientId: 'angular-client',
              // Security best practices
              enablePkce: true,
              flow: 'standard', // Authorization Code Flow

              // Token management
              enableTokenRefresh: true,
              minValidity: 70,

              // Set to false when working with different IPs/Domains to avoid 3rd party cookie issues
              checkLoginIframe: false,
              // Redirect URIs: The browser needs to know where the Angular app is
              redirectUri: 'http://192.168.219.128:4200',
              postLogoutRedirectUri: 'http://192.168.219.128:4200/login',
              scope: 'openid profile email roles',
              debug: true,
              loadUserProfileOnInit: true,
            },
          },
          // FIREBASE
          {
            name: 'firebase',
            provider: AverosFirebaseAuthProvider,
            config: {
              firebaseConfig: FIREBASE_CONFIG,
              defaultProvider: 'google',
              enablePopupFallback: true,
              persistTokens: true,
              defaultScopes: {
                google: ['profile', 'email'],
                github: ['user:email', 'read:user'],
                facebook: ['email', 'public_profile'],
              },
              selfManaged: true,
            },
          },

          // Google as separate firebase provider
          {
            name: 'google',
            provider: AverosFirebaseAuthProvider,
            config: {
              firebaseConfig: FIREBASE_CONFIG,
              defaultProvider: 'google',
            },
          },
          {
            name: 'github',
            provider: AverosGithubAuthProvider,
          },

          // GitHub as separate firebase provider
          {
            name: 'github',
            provider: AverosFirebaseAuthProvider,
            config: {
              firebaseConfig: FIREBASE_CONFIG,
              defaultProvider: 'github',
            },
          },
        ],
        // config: {
        //   // Scenario 1: Full Persistence (Default)
        //   persistState: true,           // Persist user state (default value = true)
        //   persistActiveProvider: true   // Persist provider selection (default value = true)

        //   //OR: Scenario 2: No User State, But Remember Provider Choice
        //   // persistState: false,          // Don't persist user (high security)
        //   // persistActiveProvider: true   // But remember which provider they used

        //   // OR: Scenario 3: Completely Stateless (Maximum Security)
        //   // persistState: false,          // No user persistence
        //   // persistActiveProvider: false  // Always start with default provider

        //   // OR: Scenario 4: Self-Managed Provider (ex. Firebase)
        //   // selfManaged: true,

        //   // sessionDuration: 1440
        // }
      },
    }),

    // Averos Without AUTH Config
    // AverosCoreModule.forRoot({
    //   enableAuthentication: false,
    //   enableExternalEntityMapping: true,
    //   debug: true,
    //   logLevel: LogLevel.DEBUG,
    //   supportedLanguages: ["ar","cn","en","es","fr","de","jp","nl","no","ru","se"]
    // }),

    BrowserModule,
    AppRoutingModule,
    //// added by @angular/pwa schematics
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    CustomFieldValidatorService,
    UserCustomValidationService,
    CustomFieldDomainControllerService,
    ServiceWorkerService,
    provideAppInitializer(() => {
      const initializerFn = applicationInitializer(inject(ApplicationInitializerService))
      return initializerFn()
    }),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
  ],
})
export class AppModule {}
