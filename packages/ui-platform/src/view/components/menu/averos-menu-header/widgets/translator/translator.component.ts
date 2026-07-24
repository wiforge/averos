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

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { MatSelect } from '@angular/material/select'
import { getDefaultUserProfileLanguage, ProfileLanguage } from '@averos/core'

@Component({
  selector: 'averos-translator',
  templateUrl: './translator.component.html',
  styleUrls: ['./translator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TranslatorComponent implements OnInit {
  @Output() changeLanguage: EventEmitter<any> = new EventEmitter<any>()

  @Input() languageProfileSet$!: Observable<ProfileLanguage[]>

  @ViewChild(MatSelect) mselect!: MatSelect

  constructor() {}

  ngOnInit(): void {}

  onChangeLanguage(event: any) {
    this.changeLanguage.emit(event)
  }

  getCurrentProfileSVGIcon() {
    const currentUserProfileLang = getDefaultUserProfileLanguage()

    return this.languageProfileSet$.pipe(
      map((profiles: ProfileLanguage[]) => {
        if (profiles.length === 0) {
          /// if no additional languages are configured add it to the profile then return it
          profiles.push({ code: currentUserProfileLang, icon: `${currentUserProfileLang}` })
        }
        let col = profiles.filter((profile) => profile.code === currentUserProfileLang)
        if (col.length > 0) {
          /// if the default language is already configured (exists in the list of supported languages) :
          /// then do not add it to the list
          /// and just return the first language from the list
          return col.map((e) => e.icon)
        } else {
          return profiles.map((e) => e.icon)
        }
      }),
      map((e) => e[0]),
    )
  }

  openLanguageSelection() {
    if (this.mselect) {
      this.mselect.open()
    }
  }
}
