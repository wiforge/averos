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

import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { LoginComponent } from '@averos/ui-platform/view/components/auth/login'
import { RegisterComponent } from '@averos/ui-platform/view/components/auth/register'
import { UserDashboardComponent } from '@averos/ui-platform/view/components/auth/user-dashboard/user-dashboard.component'

import { CreateToDoAreaComponent } from './view/to-do-area/create-to-do-area/create-to-do-area.component'
import { SearchToDoAreaComponent } from './view/to-do-area/search-to-do-area/search-to-do-area.component'
import { CreateToDoTaskComponent } from './view/to-do-task/create-to-do-task/create-to-do-task.component'
import { ToDoAreaDetailsComponent } from './view/to-do-area/to-do-area-details/to-do-area-details.component'
import { SearchToDoTaskComponent } from './view/to-do-task/search-to-do-task/search-to-do-task.component'
import { ToDoTaskDetailsComponent } from './view/to-do-task/to-do-task-details/to-do-task-details.component'
import { CreateCompositeTestEntityComponent } from './view/composite-test-entity/create-composite-test-entity/create-composite-test-entity.component'
import { SearchCompositeTestEntityComponent } from './view/composite-test-entity/search-composite-test-entity/search-composite-test-entity.component'
import { CompositeTestEntityDetailsComponent } from './view/composite-test-entity/composite-test-entity-details/composite-test-entity-details.component'

import { ValidateAccountComponent } from '@averos/ui-platform/view/components/auth/validate-account/validate-account.component'
import { PasswordResetComponent } from '@averos/ui-platform/view/components/auth/password-reset/password-reset.component'
import { RequestPasswordResetComponent } from '@averos/ui-platform/view/components/auth/request-password-reset/request-password-reset.component'
import {
  AccountVerifiedGuard,
  AuthenticationGuard,
  SelectivePreloadingStrategyService,
  UnauthenticatedSpaceGuard,
} from '@averos/core'

const routes: Routes = [
  // this router module should be imported at first place
  // before any other router for this line to work. Other wise redirection when default URL is sekected ('') will not work
  { path: '', redirectTo: 'public', pathMatch: 'full' },

  { path: 'account/vaccount', component: ValidateAccountComponent },
  { path: 'account/rp', component: PasswordResetComponent },
  { path: 'passwordreset', component: RequestPasswordResetComponent },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: UserDashboardComponent },

  {
    path: 'public',
    loadChildren: () =>
      import('@averos/ui-platform/public-space/public-space.module').then(
        (module) => module.PublicSpaceModule,
      ),
    canActivate: [UnauthenticatedSpaceGuard],
  },
  {
    path: 'referential',
    loadChildren: () =>
      import('@averos/ui-platform/referential/referential.module').then(
        (module) => module.ReferentialModule,
      ),
    canActivate: [AuthenticationGuard, AccountVerifiedGuard],
    data: { preload: true },
  },

  /** ToDoArea Routes */
  {
    path: 'todoareas/create',
    component: CreateToDoAreaComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todoareas/search',
    component: SearchToDoAreaComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todoareas/view/:id',
    pathMatch: 'full',
    component: ToDoAreaDetailsComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todoareas/edit/:id',
    pathMatch: 'full',
    component: ToDoAreaDetailsComponent,
    canActivate: [AuthenticationGuard],
  },
  /** ToDoTask Routes */
  {
    path: 'todotasks/create',
    component: CreateToDoTaskComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todotasks/search',
    component: SearchToDoTaskComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todotasks/view/:id',
    pathMatch: 'full',
    component: ToDoTaskDetailsComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'todotasks/edit/:id',
    pathMatch: 'full',
    component: ToDoTaskDetailsComponent,
    canActivate: [AuthenticationGuard],
  },

  // otherwise redirect to home
  {
    path: 'compositetestentitys/create',
    component: CreateCompositeTestEntityComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'compositetestentitys/search',
    component: SearchCompositeTestEntityComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'compositetestentitys/view/:id',
    component: CompositeTestEntityDetailsComponent,
    canActivate: [AuthenticationGuard],
  },
  {
    path: 'compositetestentitys/edit/:id',
    component: CompositeTestEntityDetailsComponent,
    canActivate: [AuthenticationGuard],
  },
  { path: '**', redirectTo: 'public' },
]

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      enableTracing: false,
      preloadingStrategy: SelectivePreloadingStrategyService,
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
