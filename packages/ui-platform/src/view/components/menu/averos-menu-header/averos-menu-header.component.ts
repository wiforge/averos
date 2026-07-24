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


import { Component, OnInit, Input, EventEmitter, Output, ChangeDetectionStrategy} from '@angular/core';
import { AlertService, ApplicationNavigationItem, AuthenticationService, AuthUser, getBooleanValue, ProfileLanguage } from '@averos/core';
import { Observable } from 'rxjs';


@Component({
    selector: 'averos-menu-header',
    templateUrl: './averos-menu-header.component.html',
    styleUrls: ['./averos-menu-header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class AverosMenuHeaderComponent implements OnInit {

  @Input() isHandset;
  @Input() logged;
  @Input() currentLoggedUserProfile?: AuthUser;
  @Input() isDarkThemeActive;
  @Input() navItems?: ApplicationNavigationItem[];
  @Input() languageProfileSet$?: Observable<ProfileLanguage[]>;
  @Input() activateGlobalSearchWidget?: boolean;
  @Input() activateDefaultGitWidget?: boolean;
  @Input() activateAverosDesigner?: boolean;
  @Input() enableAuthentication?: boolean;

  @Output() eventHandler: EventEmitter<any> = new EventEmitter<any>();
  currentDate = new Date().toISOString();


  constructor(private authenticationService: AuthenticationService,
              private alertService: AlertService) {}

  get authService() {
    return this.authenticationService;
  }

  get alertservice() {
    return AlertService;
  }

  get notificationService(){
    return this.alertService;
  }


  isLoggedSpace(logged: any): boolean{
   return getBooleanValue(logged);
  }

  ngOnInit(): void {
  }

  handleEvent(actionEvent) {
    this.eventHandler.emit(actionEvent);
  }

  /**
   * At least one child is in public space or root has no childs
   * @param navItem 
   * @returns 
   */
  atLeastOneChildIsInPublicSpace(navItem: ApplicationNavigationItem): boolean {
    // If the root menuitem should be in logged space then do not show any related child (even if the latter is in public space)
    if (getBooleanValue(navItem.loggedSpace)){
      return false;
    }
    let children = navItem.children;
    // if the menuitem does not have children then return true 
    if (!navItem.children || navItem.children === undefined || navItem.children.length === 0) {
      return true;
    } else {
      // if there are a childMenuItem that does is available in the anonymous space and which does not have a childitem then return true
      if (children?.find(e => (
                                e.loggedSpace===undefined || 
                                e.loggedSpace===null || 
                                !e.loggedSpace || 
                                (e.loggedSpace!==undefined && e.loggedSpace!==null && !getBooleanValue( e.loggedSpace))
                              ) && 
                             (e.children === null || e.children === undefined || e.children?.length ===0))){
        return true;
      } else {
        // get the list of childs that are available in anonymous space and check if they have any child that is available in anonymous space
        let childsInPublicSpace = children?.filter(e => (
                                                          e.loggedSpace===undefined || 
                                                          e.loggedSpace===null || 
                                                          !e.loggedSpace || 
                                                          (e.loggedSpace!==undefined && e.loggedSpace!==null && !getBooleanValue( e.loggedSpace))
                                                        ) && 
                                                        (e.children !== null && e.children !== undefined && e.children?.length > 0)) ?? [];
          if (childsInPublicSpace.length > 0){
            let itemHavingChilds = childsInPublicSpace.filter(e => e => e.children!== null && e.children!== undefined && e.children.length >0);
            if (itemHavingChilds.length > 0){

              return itemHavingChilds.reduce((p: boolean, c: ApplicationNavigationItem) =>{
                return (p && this.atLeastOneChildIsInPublicSpace(c));
              }, true);

            } else {
              return false;
            }
          }
        return false;
      }

    }
  }
}
