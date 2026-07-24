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


import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AlertService, ApplicationMenuService, ApplicationNavigationItem, ApplicationSharedService, ProfileLanguage, ViewEventHandlerService } from '@averos/core';


/// ###################### Application Settings ####################
export interface AppSettings {
  navPos?: 'side' | 'top';
  dir?: 'ltr' | 'rtl';
  theme?: 'light' | 'dark';
  showHeader?: boolean;
  headerPos?: 'fixed' | 'static' | 'above';
  showUserPanel?: boolean;
  sidenavOpened?: boolean;
  sidenavCollapsed?: boolean;
  language?: string;
}

export const defaultOptions: AppSettings = {
  navPos: 'side',
  dir: 'ltr',
  theme: 'light',
  showHeader: true,
  headerPos: 'fixed',
  showUserPanel: true,
  sidenavOpened: true,
  sidenavCollapsed: false,
  language: 'en-US',
};




@Component({
    selector: 'averos-menu',
    templateUrl: './averos-menu.component.html',
    styleUrls: ['./averos-menu.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AverosMenuComponent implements OnInit {

  @Input() openDesigner = false;
  @Input() logged;
  @Input() currentLoggedUserProfile;
  @Input() languageProfileSet$!: Observable<ProfileLanguage[]>;
  @Input() activateAverosSettingsWidget!: boolean;
  @Input() activateGlobalSearchWidget!: boolean;
  @Input() activateDefaultGitWidget!: boolean;
  @Input() activateAverosDesigner!: boolean;
  @Input() enableAuthentication!: boolean;
  rightSideNavOpened = false;

  isHandset$: Observable<boolean> = this.breakpointObserver
  .observe(Breakpoints.Handset)
  .pipe(
    map(result => result.matches),
    shareReplay()
  );

  options: AppSettings = {
    navPos: 'side',
    dir: 'ltr',
    theme: 'light',
    showHeader: true,
    headerPos: 'fixed',
    showUserPanel: true,
    sidenavOpened: true,
    sidenavCollapsed: false,
    language: 'en-US',
  };


  toolBarNavigationItems$!: Observable<ApplicationNavigationItem[]>;
  sideNavNavigationItems$!: Observable<ApplicationNavigationItem[]>;

  constructor(private breakpointObserver: BreakpointObserver,
              private appSharedService: ApplicationSharedService,
              private viewEventHandlerService: ViewEventHandlerService,
              private applicationMenuService: ApplicationMenuService,
              private alertService: AlertService) { }

  ngOnInit(): void {
    this.buildNavigationItems();
  }

  get alertservice() {
    return AlertService;
  }


  handleEvent(eventAction) {/// OnThemeChange
    this.viewEventHandlerService.handleEvent(eventAction);
  }

  get appSharedSrv(): ApplicationSharedService {
    return this.appSharedService;
  }

  buildNavigationItems() {
    this.toolBarNavigationItems$  = this.applicationMenuService.getTopMenu();
    this.sideNavNavigationItems$ = this.applicationMenuService.getSideMenu();
  }

  get notificationService(){
    return this.alertService;
  }

  openRightSideNav(event: boolean){
    this.rightSideNavOpened = !this.rightSideNavOpened;
  }

  showSettingsWidget(): boolean{
    return (this.logged || !this.enableAuthentication) && this.activateAverosSettingsWidget;
  }
  
  showMenuFooter(): boolean{
    return this.logged || !this.enableAuthentication;
  }

}
