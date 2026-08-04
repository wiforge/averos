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

import { Component, OnDestroy, Inject, ViewEncapsulation, Optional, OnInit, Input, DOCUMENT, inject } from '@angular/core';
import { of, Subscription } from 'rxjs';
import { OverlayContainer } from '@angular/cdk/overlay';

import { NavigationStart, Router, Event } from '@angular/router';
import { Observable } from 'rxjs';
import { ApplicationSharedService, 
         AuthUser, 
         AVEROS_CONFIG, 
         AverosAuthService, 
         AverosConfig, 
         ProfileLanguage,
         isLanguageSupported } from '@averos/core';



@Component({
    selector: 'averos-application',
    templateUrl: './averos-application.component.html',
    encapsulation: ViewEncapsulation.None,
    standalone: false
})
export class AverosApplicationComponent implements OnDestroy, OnInit {

  private readonly averosConfig = inject(AVEROS_CONFIG);

  @Input() activateAverosSettingsWidget: boolean = false; /// default true (show settings)
  @Input() activateGlobalSearchWidget: boolean = false; /// default true (show search)
  @Input() activateDefaultGitWidget: boolean = false; /// default true (show git)
  
  protected enableAuthentication: boolean = false;

  currentUserProfile!: AuthUser;
  supportedLanguages!: Observable<ProfileLanguage[]>;
  authSubscription!: Subscription;
  routerSubscription!: Subscription;

  
  get darkThemeActivated(){
    return this.appSharedService.darkThemeActivated;
  }

  constructor(private authenticationService: AverosAuthService,
              private appSharedService: ApplicationSharedService,
              private overlayContainer: OverlayContainer,
              @Inject(DOCUMENT) private document: any,
              private router: Router) {  
    this.appSharedService.initializeCustomThemeActions(this.overlayContainer, this.document);  
    this.initializeAverosApplication(this.averosConfig);

  }

  initializeAverosApplication(averosConfig: AverosConfig){

    this.enableAuthentication = averosConfig.enableAuthentication!;
        // retrieving the user defined application supported languages
    this.supportedLanguages = of((averosConfig.supportedLanguages ?? []).filter(isLanguageSupported)
        .map(e => ({
                    code: e,
                    icon: e === 'en' ? 'gb' : e
                  } as ProfileLanguage)));

  }

  ngOnInit(): void {
    window.addEventListener("keyup", disableF5);
     window.addEventListener("keydown", disableF5);
     function disableF5(e) {
      if ((e.which || e.keyCode) == 116) e.preventDefault(); 
   };
  
   // Retrieving the current logged user name
   if (this.enableAuthentication){
    this.authSubscription = this.authenticationService.user$.subscribe(x => {
      this.currentUserProfile = x! ;
      this.appSharedService.currentUser = x!;
    });
  }
  }
  

  ngOnDestroy(): void {
    // Should be called when this.appSharedService.initializeCustomThemeActions() is called
    this.appSharedService.destroySubscriptions();

    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.routerSubscription?.unsubscribe();
  }

  get authService(): AverosAuthService {
    return this.authenticationService;
  }

}
