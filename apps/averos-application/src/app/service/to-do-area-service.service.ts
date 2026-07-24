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

import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'

import { ToDoArea } from '../model/to-do-area'
import {
  ApplicationSharedService,
  AvCrudService,
  EntityConfigurationManagerService,
  EnvironmentConfiguratorService,
  IndexableType,
  PaginatedData,
  SearchInputCriteria,
} from '@averos/core'

@Injectable({
  providedIn: 'root',
})
export class ToDoAreaService extends AvCrudService<ToDoArea> {
  override get SERVICE_NAME(): string {
    return 'ToDoAreaService'
  }

  override get MANAGED_ENTITY(): IndexableType<ToDoArea> {
    return ToDoArea.instanceMetadata()
  }

  constructor(
    protected override httpClient: HttpClient,
    protected override applicationSharedService: ApplicationSharedService,
    protected override environmentConfiguratorService: EnvironmentConfiguratorService,
    protected override entityConfigurationManagerService: EntityConfigurationManagerService,
  ) {
    super(
      httpClient,
      applicationSharedService,
      environmentConfiguratorService,
      entityConfigurationManagerService,
    )
  }

  override createEntity(
    value: ToDoArea,
    criteria?: SearchInputCriteria,
  ): Observable<ToDoArea | null> {
    /**
     * You may override the default create entity logic (defaultCreateEntity())
     *  by returning your own implementation logic.
     *
     * Note: defaultCreateEntity() returns 'this.httpClient.post<T>(this.apiURL, value)'
     */
    let criteria_ = new SearchInputCriteria()
    if (criteria) {
      criteria_ = criteria
    }

    criteria_.addHttpQueryParameters([{ key: 'compositekeys', value: 'compositeTestEntity' }])
    return this.defaultCreateEntity(value, criteria_)
  }

  override updateEntity(
    entityTopdate: ToDoArea | Partial<ToDoArea>,
    criteria?: SearchInputCriteria,
  ): Observable<ToDoArea | null> {
    /**
     * You may override the default updateEntity() logic
     *  by returning your own implementation logic
     */
    let criteria_ = new SearchInputCriteria()
    if (criteria) {
      criteria_ = criteria
    }

    criteria_.addHttpQueryParameters([{ key: 'compositekeys', value: 'compositeTestEntity' }])
    return this.defaultUpdateEntity(entityTopdate, criteria_)
  }

  override deleteEntity(parent: ToDoArea | Partial<ToDoArea> | string): Observable<any> {
    /**
     * You may override the default deleteEntity() logic
     *  by returning your own implementation logic
     */
    return this.defaultDeleteEntity(parent)
  }

  override deleteMany(entityCollection: ToDoArea[] | Partial<ToDoArea>[]): Observable<any> {
    /**
     * You may override the default deleteMany() logic
     *  by returning your own implementation logic
     */
    return this.defaultDeleteMany(entityCollection)
  }

  /**
   * Retrieve all entities.
   * Backend should specify a threshold for the number of elements that can be retrieved in one shot
   */
  override getAllEntities(): Observable<ToDoArea[] | PaginatedData<ToDoArea> | null> {
    return this.defaultGetAllEntities()
  }

  /**
   * Retrieve the entity with a specific id
   */
  override getEntityById(id: string, criteria?: SearchInputCriteria): Observable<ToDoArea | null> {
    /**
     * You may override the default getEntityById() logic
     *  by returning your own implementation logic
     */
    let criteria_ = new SearchInputCriteria()
    if (criteria) {
      criteria_ = criteria
    }

    criteria_.addHttpQueryParameters([{ key: 'compositekeys', value: 'compositeTestEntity' }])
    return this.defaultGetEntityById(id, criteria_)
  }

  /**
   * Retrieve multiple elements according to the given ids collection
   */
  override getEntitiesByIds(
    ids: string[],
    criteria?: SearchInputCriteria,
  ): Observable<ToDoArea[] | PaginatedData<ToDoArea> | null> {
    /**
     * You may override the default getEntitiesByIds() logic
     *  by returning your own implementation logic
     */

    let criteria_ = new SearchInputCriteria()
    if (criteria) {
      criteria_ = criteria
    }
    criteria_.addHttpQueryParameters([{ key: 'compositekeys', value: 'compositeTestEntity' }])
    return this.defaultGetEntitiesByIds(ids, criteria_)
  }

  override getEntitiesByCriteria(
    criteria: SearchInputCriteria,
    inline: boolean = false,
  ): Observable<ToDoArea[] | PaginatedData<ToDoArea> | null> {
    /**
      * ---------- inline-loading -----------
      * 
      * Whenever a backend API is requested the application will display a loading progress component untill a response is got.
      * Using 'inline-loading': true as displayed below, would display a the loading indicator inside the most inner html component (freezes only the current component).
      * If you rather wish to use the the global application loading component (freezes the whole UI while waiting for a response)
      *  then remove this parameter from the http query or set it to false ('inline-loading': false)
      * 
      * inline-loading is false by default
      * example:
      * const opts =  {
                    params: new HttpParams({fromString: query}),
                    headers: {
                      'inline-loading': `${inline}`
                    }
                   };
    */

    /**
     * You may override the default getEntitiesByCriteria() logic
     *  by returning your own implementation logic.
     *
     * Below is an example:
     *
     * let query: string = criteria.toHttpQuery(this.apiHTTPQueryBuilder);
     * query =
     * const opts =  {
     *                params: new HttpParams({fromString: query}),
     *                headers: {
     *                 'inline-loading': `${inline}`
     *                }
     *                 };
     * return this.httpClient.get<T[]>(this.apiURL, opts);
     */

    // criteria.addHttpQueryParameters([{key: "page", value: "0"},{key: "pagesize", value: "20"}]);
    let criteria_ = new SearchInputCriteria()
    if (criteria) {
      criteria_ = criteria
    }

    /**
     *
     * You may want to include additional http query parameters. Please use : addHttpQueryParameters()
     *
     * criteria_.addHttpQueryParameters([{key: "myParameterkey", value: "myParameterValue"}]);
     */

    criteria_.addHttpQueryParameters([{ key: 'compositekeys', value: 'compositeTestEntity' }])

    return this.defaultGetEntitiesByCriteria(criteria_, inline)
  }

  /**
   *
   * @param id the parent entity id
   * @param relationName : The collection relation Name
   * @param cids : the ids of the collection to be removed from the parent entity
   * @returns
   *
   * N.B: cids: {id: string}[]) : cids structure depends on the identifier name of the entity:
   * ex: id entity'identifier ==
   *                              + "_entityId" ==> cids: {_entityId: string}[]
   *                              + "_entityId" ==> cids: {_entityId: string}[]
   *                              + "identifier" ==> cids: {identifier: string}[]
   *                              + "some__entityId" ==> cids: {some__entityId: string}[]
   *                              + ...ect...
   */
  override deleteRelationCollection(
    parentId: any,
    parent: ToDoArea | Partial<ToDoArea>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<ToDoArea | null> {
    return this.defaultDeleteRelationCollection(parentId, parent, relationName, cids)
  }

  /**
   *
   * @param parentId the parent entity id
   * @param relationName : The collection relation Name
   * @param cids : the ids of the collection to be added from the parent entity
   * @returns
   */
  override addRelationCollection(
    parentId: string,
    parent: ToDoArea | Partial<ToDoArea>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<ToDoArea | null> {
    /**
     * Update your entity with any additional fields.
     * example:
     * const data: any = {};
     * data['_entityUpdatedBy'] =  this.applicationSharedService.getLoggedUser();
     * data['_entityUpdatedAt'] = new Date();
     *
     */

    /**
     * If you are implementing your own logic you ay want to normalize the ids with respect to the external ids.
     * Below an example:
     *
     * data[relationName] = normalizeWithExternalEntityId(this.EXTERNAL_ENTITY_IDENTIFIER, cids);
     *
     * 'normalizeWithExternalEntityId' transforms the cids collection ([{entity_id: '12345'}, {entity_id: '54321'}])
     * into a collaction that uses the API identifier ([{_id: '12345'}, {_id: '54321'}]).
     *
     * The API identifier is usually the unique entity identifier that is used in the called backend API to manage its entities.
     *
     * This could be the datasource entity identifier such as a primary key for example,
     * or simply the identifier that the called api uses to handle its entities.
     *
     *
     *
     */

    /**
     * You may override the default addRelationCollection() logic
     *  by returning your own implementation logic
     */
    return this.defaultAddRelationCollection(parentId, parent, relationName, cids)
  }
}
