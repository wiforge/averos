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

/*
 * Public API Surface of averos
 */

/**
 * AVEROS-CORE MODULE
 */
export * from './averos-core/averos-core.module';
export * from './averos-core/provide-averos-core';
export * from './averos-core/averos-application.component';



/// Code Gen entities ////


/*** added after IVY was complaining */
export * from './averos-core/material-module';




/**
 * VIEW MODULE
 */
export * from './view/view.module';
export * from './view/components/menu/averos-menu/averos-menu.component';
export * from './view/components/menu/averos-menu-header/averos-menu-header.component';
export * from './view/components/menu/averos-menu-body/averos-menu-body.component';
export * from './view/components/menu/averos-sidemenu/averos-sidemenu.component';
export * from './view/components/menu/averos-sidemenu-userpanel/averos-sidemenu-userpanel.component';
export * from './view/components/menu/averos-sidemenu-menu/averos-sidemenu-menu.component';
export * from './view/components/menu/averos-menu-footer/averos-menu-footer.component';
export * from './view/components/menu/averos-menu-item/averos-menu-item.component';
export * from './view/components/menu/averos-settings/averos-settings.component';
export * from './view/components/menu/averos-menu-header/widgets/brand/brand.component';
export * from './view/components/menu/averos-menu-header/widgets/github/github.component';
export * from './view/components/menu/averos-menu-header/widgets/notifier/notifier.component';
export * from './view/components/menu/averos-menu-header/widgets/translator/translator.component';
export * from './view/components/menu/averos-menu-header/widgets/icon-theme/icon-theme.component';
export * from './view/components/menu/averos-menu-header/widgets/user/user.component';
export * from './view/components/menu/averos-menu-header/widgets/averos-search/averos-search.component';
export * from './view/components/menu/averos-menu-header/widgets/about/about.component';

export * from './view/components/averos-app-notification/averos-app-notification.component';
export * from './view/components/averos-app-notification/averos-message-dialog/averos-message-dialog.component';

export * from './view/components/view-components/animated-icon/animated-icon.component';
export * from './view/components/view-components/averos-search-input-text-field/averos-search-input-text-field.component';
export * from './view/components/view-components/averos-search-input-date-field/averos-search-input-date-field.component';
export * from './view/components/view-components/averos-search-input-field/averos-search-input-field.component';
export * from './view/components/view-components/averos-view-edit-input-field/averos-view-edit-input-field.component';
export * from './view/components/view-components/averos-view-edit-entity/averos-view-edit-entity.component';

export * from './view/components/view-components/averos-dynamic-table/averos-dynamic-table.component';
export * from './view/components/view-components/averos-dynamic-table/bottom-sheet-data-export-format/bottom-sheet-data-export-format.component';

export * from './view/components/view-components/averos-create-entity/averos-create-entity.component';
export * from './view/components/view-components/averos-edit-entity/averos-edit-entity.component';
export * from './view/components/view-components/averos-view-entity/averos-view-entity.component';
export * from './view/components/view-components/averos-search-entity/averos-search-entity.component';
export * from './view/components/view-components/averos-search-result/averos-search-result.component';
export * from './view/components/view-components/dialog/averos-view-entity-dialog/averos-view-entity-dialog.component';
export * from './view/components/view-components/dialog/averos-create-entity-dialog/averos-create-entity-dialog.component';
export * from './view/components/view-components/dialog/averos-edit-entity-dialog/averos-edit-entity-dialog.component';

export * from './view/components/view-components/averos-dynamic-simple-view/averos-dynamic-simple-view.component';
export * from './view/components/view-components/averos-dynamic-composite-view/averos-dynamic-composite-view.component';
export * from './view/components/view-components/averos-dynamic-stepper/averos-dynamic-stepper.component';
export * from './view/components/view-components/averos-dynamic-dialog/averos-dynamic-dialog.component';
export * from './view/components/view-components/averos-avatar-selection-dialog/averos-avatar-selection-dialog.component';
export * from './view/components/view-components/averos-dashboard/dashboard-card/dashboard-card.component';
export * from './view/components/menu/averos-settings-panel/averos-settings-panel.component';
export * from './view/components/auth/login/login.component';
export * from './view/components/auth/password-reset/password-reset.component';
export * from './view/components/auth/register/register.component';
export * from './view/components/auth/request-password-reset/request-password-reset.component';
export * from './view/components/auth/user-dashboard/user-dashboard.component';
export * from './view/components/auth/validate-account/validate-account.component';


/**
 * AVEROS-SHARED MODULE
 */
export * from './averos-shared/averos-shared.module';
export * from './averos-shared/_pipes/sort-collection-by.pipe';
export * from './averos-shared/_pipes/to-observable.pipe';
export * from './averos-shared/_pipes/to-view-layout.pipe';
export * from './averos-shared/_pipes/to-tabbed-view-layout.pipe';
export * from './averos-shared/_pipes/to-composite-view-layout.pipe';
export * from './averos-shared/_pipes/transform-view-layout.pipe';
export * from './averos-shared/_pipes/to-boolean.pipe';

export * from './averos-shared/_directives/safe-icon.directive';
export * from './averos-shared/_directives/material-elevation.directive';
export * from './averos-shared/_directives/accordion.directive';
export * from './averos-shared/_directives/accordion-anchor.directive';
export * from './averos-shared/_directives/accordion-link.directive';
export * from './averos-shared/_directives/data-export.directive';


/**
 * PUBLIC-SPACE MODULE
 */
export * from './public-space/public-space.module';
export * from './public-space/home/home.component';

/**
 * REFERENTIAL MODULE
 */
export * from './referential/referential.module';


