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

import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import {
  AverosAuthService,
  AverosSearchOperator,
  EnvironmentConfiguratorService,
  SearchInputCriteria,
} from '@averos/core'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable({
  providedIn: 'root',
})
export class ReferentialService {
  public static readonly SERVICE_NAME = 'ReferentialService'

  constructor(
    private httpClient: HttpClient,
    private environmentConfiguratorService: EnvironmentConfiguratorService,
    private averosAuth: AverosAuthService,
  ) {}

  get apiURL(): string {
    return this.environmentConfiguratorService.getApiRoute(ReferentialService.SERVICE_NAME)
  }

  get apiHTTPQueryBuilder(): string {
    return this.environmentConfiguratorService.getApiHTTPQueryBuilder(
      ReferentialService.SERVICE_NAME,
    )
  }

  /**
   * role services
   */
  getAllRoles(): Observable<any[]> {
    // add inline-loading header in order to trigger inline loading spinning within html component
    const opts = {
      params: new HttpParams({
        fromString: 'compositekeys=users_details _entityCreatedBy _entityUpdatedBy',
      }),
      // params: new HttpParams({fromString: name }),
      // headers: {
      //   'inline-loading': 'true'
      // }
    }

    return this.httpClient
      .get<any[]>(this.apiURL, opts)
      .pipe(map((value: any) => value.returnedEntities as any[]))
  }

  getRolesByCriteria(
    criteria: SearchInputCriteria,
    inlineSearch: boolean = true,
  ): Observable<any> | Observable<never> {
    let query: string = ''

    if (criteria === undefined || criteria === null) {
      return of([])
    }
    query = criteria.toHttpQuery(this.apiHTTPQueryBuilder)

    const opts = inlineSearch
      ? {
          params: new HttpParams({
            fromString: `${query}&compositekeys=users_details _entityCreatedBy _entityUpdatedBy`,
          }),
          headers: { 'inline-loading': 'true' },
        }
      : {
          params: new HttpParams({
            fromString: `${query}&compositekeys=users_details _entityCreatedBy _entityUpdatedBy`,
          }),
        }

    return this.httpClient.get<any[]>(this.apiURL, opts).pipe(
      map(
        // eslint-disable-next-line arrow-body-style
        (value: any) => value.returnedEntities as any[],
      ),
    )
  }

  updateRole(id: any, role: any | Partial<any>): Observable<any> {
    role._entityUpdatedBy = this.averosAuth.user()
    return this.httpClient.put<any>(this.apiURL + id, role)
  }

  createRole(role: any): Observable<any> {
    role._entityCreatedBy = this.averosAuth.user()
    return this.httpClient.post<any>(this.apiURL, role)
  }

  deleteRole(id: any): Observable<any> {
    return this.httpClient.delete<any>(this.apiURL + id)
  }

  /**
   * Is mandatory and should be present in order to give the iplementation
   *  of the method "getEntitiesByIds" requested in the decorator "AverosEntity"
   * @param ids
   * @returns Role[]
   */
  getEntitiesByIds(ids: string[]): Observable<any> {
    const criteriaz = {
      _entityId: {
        entityAccessor: '_entityId',
        entityValue: ids,
        operator: AverosSearchOperator.OPER_IN_ELEMENTS,
      },
    }
    return this.getRolesByCriteria(new SearchInputCriteria(criteriaz), false)
  }

  /**
   * Is mandatory and should be present in order to give the iplementation
   *  of the method "getEntitiesByIds" requested in the decorator "AverosEntity"
   * @param ids
   * @returns Role[]
   */
  getEntityById(id: string | number): Observable<any> {
    return this.httpClient.get<any>(`${this.apiURL}${id}`)
  }

  /**
   * Is mandatory and should be present in order to give the iplementation
   *  of the method "getEntitiesByCriteria" requested in the decorator "AverosEntity"
   * @param criteria
   * @returns Role[]
   */
  getEntitiesByCriteria(criteria: SearchInputCriteria, inline: boolean = false): Observable<any> {
    return this.getRolesByCriteria(criteria, inline)
  }
}
