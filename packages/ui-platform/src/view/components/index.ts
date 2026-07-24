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

import { AverosMenuComponent } from './menu/averos-menu/averos-menu.component'
import { AverosMenuHeaderComponent } from './menu/averos-menu-header/averos-menu-header.component'
import { AverosMenuBodyComponent } from './menu/averos-menu-body/averos-menu-body.component'
import { AverosMenuFooterComponent } from './menu/averos-menu-footer/averos-menu-footer.component'
import { AnimatedIconComponent } from './view-components/animated-icon/animated-icon.component'
import { AverosMenuItemComponent } from './menu/averos-menu-item/averos-menu-item.component'
import { AverosSearchInputTextFieldComponent } from './view-components/averos-search-input-text-field/averos-search-input-text-field.component'
import { AverosSearchInputDateFieldComponent } from './view-components/averos-search-input-date-field/averos-search-input-date-field.component'
import { AverosViewEditInputFieldComponent } from './view-components/averos-view-edit-input-field/averos-view-edit-input-field.component'
import {
  AverosDynamicTableComponent,
  BottomSheetDataExportFormatComponent,
} from './view-components/averos-dynamic-table/index'
import { AverosViewEntityDialogComponent } from './view-components/dialog/averos-view-entity-dialog/averos-view-entity-dialog.component'
import { AverosCreateEntityDialogComponent } from './view-components/dialog/averos-create-entity-dialog/averos-create-entity-dialog.component'
import { AverosViewEntityComponent } from './view-components/averos-view-entity/averos-view-entity.component'
import { AverosEditEntityComponent } from './view-components/averos-edit-entity/averos-edit-entity.component'
import { AverosCreateEntityComponent } from './view-components/averos-create-entity/averos-create-entity.component'
import { AverosSettingsComponent } from './menu/averos-settings/averos-settings.component'
import { BrandComponent } from './menu/averos-menu-header/widgets/brand/brand.component'
import { GithubComponent } from './menu/averos-menu-header/widgets/github/github.component'
import { NotifierComponent } from './menu/averos-menu-header/widgets/notifier/notifier.component'
import { TranslatorComponent } from './menu/averos-menu-header/widgets/translator/translator.component'
import { UserComponent } from './menu/averos-menu-header/widgets/user/user.component'
import { AverosSidemenuComponent } from './menu/averos-sidemenu/averos-sidemenu.component'
import { AverosSidemenuUserpanelComponent } from './menu/averos-sidemenu-userpanel/averos-sidemenu-userpanel.component'
import { AverosSidemenuMenuComponent } from './menu/averos-sidemenu-menu/averos-sidemenu-menu.component'
import {
  AverosAppNotificationComponent,
  AverosMessageDialogComponent,
} from './averos-app-notification/index'
import { AverosDynamicSimpleViewComponent } from './view-components/averos-dynamic-simple-view'
import { AverosDynamicCompositeViewComponent } from './view-components/averos-dynamic-composite-view/averos-dynamic-composite-view.component'
import { AverosEditEntityDialogComponent } from './view-components/dialog/averos-edit-entity-dialog/averos-edit-entity-dialog.component'
import { AverosDynamicStepperComponent } from './view-components/averos-dynamic-stepper/averos-dynamic-stepper.component'
import { AverosSearchEntityComponent } from './view-components/averos-search-entity/averos-search-entity.component'
import { AverosSearchInputFieldComponent } from './view-components/averos-search-input-field/averos-search-input-field.component'
import { AverosSearchComponent } from './menu/averos-menu-header/widgets/averos-search/averos-search.component'
import { AverosDynamicDialogComponent } from './view-components/averos-dynamic-dialog/averos-dynamic-dialog.component'
import { AverosViewEditEntityComponent } from './view-components/averos-view-edit-entity/averos-view-edit-entity.component'
import { AverosSearchResultComponent } from './view-components/averos-search-result/averos-search-result.component'
import { AverosAvatarSelectionDialogComponent } from './view-components/averos-avatar-selection-dialog/averos-avatar-selection-dialog.component'
import { AverosSettingsPanelComponent } from './menu/averos-settings-panel/averos-settings-panel.component'
import { AboutComponent } from './menu/averos-menu-header/widgets/about/about.component'
import { DashboardCardComponent } from './view-components/averos-dashboard/dashboard-card/dashboard-card.component'
import { IconThemeComponent } from './menu/averos-menu-header/widgets/icon-theme/icon-theme.component'

import { LoginComponent } from './auth/login'
import { PasswordResetComponent } from './auth/password-reset/password-reset.component'
import { RegisterComponent } from './auth/register'
import { RequestPasswordResetComponent } from './auth/request-password-reset/request-password-reset.component'
import { UserDashboardComponent } from './auth/user-dashboard/user-dashboard.component'
import { ValidateAccountComponent } from './auth/validate-account/validate-account.component'

export const viewComponents: any[] = [
  AverosMenuComponent,
  AverosMenuHeaderComponent,
  AverosMenuBodyComponent,
  AverosMenuFooterComponent,
  AnimatedIconComponent,
  AverosMenuItemComponent,
  AverosAppNotificationComponent,
  AverosMessageDialogComponent,
  AverosSearchInputTextFieldComponent,
  AverosSearchInputDateFieldComponent,
  AverosDynamicTableComponent,
  BottomSheetDataExportFormatComponent,
  AverosViewEntityDialogComponent,
  AverosCreateEntityDialogComponent,
  AverosEditEntityDialogComponent,
  AverosViewEntityComponent,
  AverosEditEntityComponent,
  AverosCreateEntityComponent,
  AverosSettingsComponent,
  BrandComponent,
  GithubComponent,
  NotifierComponent,
  TranslatorComponent,
  AverosSearchComponent,
  UserComponent,
  AverosSidemenuComponent,
  AverosSidemenuUserpanelComponent,
  AverosSidemenuMenuComponent,
  AverosViewEditInputFieldComponent,
  AverosDynamicSimpleViewComponent,
  AverosDynamicCompositeViewComponent,
  AverosDynamicStepperComponent,
  AverosSearchEntityComponent,
  AverosSearchInputFieldComponent,
  AverosDynamicDialogComponent,
  AverosViewEditEntityComponent,
  AverosSearchResultComponent,
  AverosAvatarSelectionDialogComponent,
  AverosSettingsPanelComponent,
  AboutComponent,
  DashboardCardComponent,
  IconThemeComponent,

  LoginComponent,
  PasswordResetComponent,
  RegisterComponent,
  RequestPasswordResetComponent,
  UserDashboardComponent,
  ValidateAccountComponent,
]

export * from '../components/menu/averos-menu/averos-menu.component'
export * from '../components/menu/averos-menu-header/averos-menu-header.component'
export * from '../components/menu/averos-menu-body/averos-menu-body.component'
export * from '../components/menu/averos-sidemenu/averos-sidemenu.component'
export * from '../components/menu/averos-sidemenu-userpanel/averos-sidemenu-userpanel.component'
export * from '../components/menu/averos-sidemenu-menu/averos-sidemenu-menu.component'
export * from '../components/menu/averos-menu-footer/averos-menu-footer.component'
export * from '../components/menu/averos-menu-item/averos-menu-item.component'
export * from '../components/menu/averos-settings/averos-settings.component'
export * from '../components/menu/averos-settings-panel/averos-settings-panel.component'
export * from '../components/menu/averos-menu-header/widgets/index'

export * from '../components/averos-app-notification/index'

export * from '../components/view-components/animated-icon/animated-icon.component'
export * from '../components/view-components/averos-search-input-text-field/averos-search-input-text-field.component'
export * from '../components/view-components/averos-search-input-date-field/averos-search-input-date-field.component'
export * from '../components/view-components/averos-search-input-field/averos-search-input-field.component'
export * from '../components/view-components/averos-view-edit-input-field/averos-view-edit-input-field.component'
export * from '../components/view-components/averos-dynamic-table/index'
export * from '../components/view-components/averos-create-entity/averos-create-entity.component'
export * from '../components/view-components/averos-edit-entity/averos-edit-entity.component'
export * from '../components/view-components/averos-view-entity/averos-view-entity.component'
export * from '../components/view-components/averos-view-edit-entity/averos-view-edit-entity.component'
export * from '../components/view-components/averos-search-entity/averos-search-entity.component'
export * from '../components/view-components/averos-search-result/averos-search-result.component'
export * from '../components/view-components/dialog/averos-view-entity-dialog/averos-view-entity-dialog.component'
export * from '../components/view-components/dialog/averos-create-entity-dialog/averos-create-entity-dialog.component'
export * from '../components/view-components/dialog/averos-edit-entity-dialog/averos-edit-entity-dialog.component'

export * from '../components/view-components/averos-dynamic-simple-view/averos-dynamic-simple-view.component'
export * from './view-components/averos-dynamic-composite-view/averos-dynamic-composite-view.component'
export * from '../components/view-components/averos-dynamic-stepper/averos-dynamic-stepper.component'
export * from '../components/view-components/averos-dynamic-dialog/averos-dynamic-dialog.component'
export * from '../components/view-components/averos-avatar-selection-dialog/averos-avatar-selection-dialog.component'
export * from '../components/view-components/averos-dashboard/dashboard-card/dashboard-card.component'

export * from './auth/login/login.component'
export * from './auth/password-reset/password-reset.component'
export * from './auth/register/register.component'
export * from './auth/request-password-reset/request-password-reset.component'
export * from './auth/validate-account/validate-account.component'
