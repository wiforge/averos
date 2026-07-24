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

import { CompositeTestEntity } from '../model/composite-test-entity'
import {
  ApplicationSharedService,
  AvCrudService,
  EntityConfigurationManagerService,
  EnvironmentConfiguratorService,
  PaginatedData,
  SearchInputCriteria,
} from '@averos/core'

@Injectable({
  providedIn: 'root',
})
export class CompositeTestEntityService extends AvCrudService<CompositeTestEntity> {
  override get SERVICE_NAME(): string {
    return 'CompositeTestEntityService'
  }

  get MANAGED_ENTITY(): CompositeTestEntity {
    return CompositeTestEntity.instanceMetadata()
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

  override createEntity(value: CompositeTestEntity): Observable<CompositeTestEntity | null> {
    /**
     * You may override the default create entity logic (defaultCreateEntity())
     *  by returning your own implementation logic.
     *
     * Note: defaultCreateEntity() returns 'this.httpClient.post(this.apiURL, value)'
     *
     * If you want to update your entity with additional fields then
     * you may use the following logic:
     *
     * const data = { ...value }
     *
     * Update your entity with any additional fields.
     * example:
     * data._entityUpdatedBy =  user;
     * data._entityUpdatedAt = new Date();
     */
    return this.defaultCreateEntity(value)
  }

  override updateEntity(
    entityTopdate: CompositeTestEntity | Partial<CompositeTestEntity>,
  ): Observable<CompositeTestEntity | null> {
    /**
     * You may override the default update entity logic (defaultUpdateEntity())
     *  by returning your own implementation logic.
     *
     * Note: defaultUpdateEntity() implements the following logic:
     *
     *  // get the entity id managed bu your application (as designed in your entity)
     *  let entityIDName = TypeScriptTypeMetaDatatHandler.instance.getIdName(entityclass)
     *  // get the value of the entoty identifier
     *  let entityID = entityTopdate[entityIDName];
     *  // update the entity using the its related identifier value
     *   return this.httpClient.patch<T>(`${this.apiURL}/${entityID}`, entityTopdate);
     *
     * If you want to update your entity with additional fields then
     * you may use the following logic:
     *
     * const data = { ...value }
     *
     * Update your entity with any additional fields.
     * example:
     * data._entityUpdatedBy =  user;
     * data._entityUpdatedAt = new Date();
     */
    return this.defaultUpdateEntity(entityTopdate)
  }

  override deleteEntity(
    parent: CompositeTestEntity | Partial<CompositeTestEntity> | string,
  ): Observable<CompositeTestEntity | null> {
    /**
     * You may override the default delete entity logic (defaultDeleteEntity())
     *  by returning your own implementation logic.
     *
     * 'parent' parametdeleteEntityer could either be a single instance or a collection of type CompositeTestEntityService or be of type 'string' in case it is equal to the entity identifier value.
     *
     * defaultDeleteEntity() manages all possible parent types and values:
     * if 'parent' corresponds to the identifier value (string) then return this.httpClient.delete<T>(`${this.apiURL}/${parent}`)
     * if 'parent' corresponds to the an instance of CompositeTestEntityService then retrieve the entity identifier value then call the backend api using the following logic:
     *      // retrieve the entity id name
     *      let entityIDName = TypeScriptTypeMetaDatatHandler.instance.getIdName(entityclass)
     *      // retrieve the entity id value
     *      let entityID = entity[entityIDName];
     *      this.httpClient.delete<T>(`${this.apiURL}/${entityID}`)
     *
     *
     * IMPORTANT NOTE:
     * defaultDeleteEntity() logic implements 'deleteStrategy' entity relation features
     *  according to the entity relation configuration. If a 'OneToOne' or 'OneToMany' relationship
     *  is declared as 'delete-cascade' then when the 'parent' is deleted, all children
     *  and subsequent children should be deleted as well.
     *  deleteStrategy is equal to 'custom' which leaves the delete entity logic to be implemented
     *  by the user.
     *
     *
     *
     */
    return this.defaultDeleteEntity(parent)
  }

  override deleteMany(
    entityCollection: CompositeTestEntity[] | Partial<CompositeTestEntity>[],
  ): Observable<CompositeTestEntity[] | null> {
    /**
     * You may override the default deleteMany() logic
     *  by returning your own implementation logic.
     *
     * The default implementation calls 'deleteEntity(entity)' for each entity in entity collection
     * using a 'forkJoin(delete_operations)'
     */
    return this.defaultDeleteMany(entityCollection)
  }

  /**
   * Retrieve all entities.
   *
   */
  override getAllEntities(): Observable<
    CompositeTestEntity[] | PaginatedData<CompositeTestEntity> | null
  > {
    /**
     * Retrieve all entities.
     * Backend should specify a threshold for the number of elements that can be retrieved in one shot
     *
     * return the default implementation of get all entities (defaultGetAllEntities()).
     *
     * defaultGetAllEntities() returns this.httpClient.get(this.apiURL)
     */
    return this.defaultGetAllEntities()
  }

  /**
   * Retrieve the entity with a specific id
   */
  override getEntityById(
    id: string,
    criteria?: SearchInputCriteria,
  ): Observable<CompositeTestEntity | null> {
    /**
     * You may override the default getEntityById() logic (defaultGetEntityById)
     *  by returning your own implementation logic
     *
     * 'defaultGetEntityById()' returns this.httpClient.get(`${this.apiURL}/${id}`)
     */
    return this.defaultGetEntityById(id, criteria)
  }

  /**
   * Retrieve multiple elements according to the given ids collection
   */
  override getEntitiesByIds(ids: string[], criteria?: SearchInputCriteria): Observable<any | null> {
    /**
     * You may override the default getEntitiesByIds() logic (defaultGetEntitiesByIds())
     *  by returning your own implementation logic
     *
     * defaultGetEntitiesByIds(): builds a SearchInputCriteria and call getEntitiesByCriteria().
     *
     * The default entity id that is generated for your managed entity is '_entityId'
     * unless you have overriden this value using the @ID() member annotation when you defined your entity.
     *
     * The current configured entity id is retrived using : TypeScriptTypeMetaDatatHandler.instance.getIdName(EntityClass)
     *
     *       const criteriaz =
     *                         {id:
     *                           {
     *                             entityAccessor: TypeScriptTypeMetaDatatHandler.instance.getIdName(this.MANAGED_ENTITY),
     *                             entityValue: ids,
     *                             operator: AverosSearchOperator.OPER_IN_ELEMENTS
     *                           }
     *                        };
     *        return this.getEntitiesByCriteria(new SearchInputCriteria(criteriaz));
     *
     *
     */
    return this.defaultGetEntitiesByIds(ids, criteria)
  }

  override getEntitiesByCriteria(
    criteria: SearchInputCriteria,
    inline: boolean = false,
  ): Observable<CompositeTestEntity[] | PaginatedData<CompositeTestEntity> | null> {
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
     *              params: new HttpParams({fromString: query}),
     *               headers: {
     *                 'inline-loading': `${inline}`
     *               }
     *              };
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
    return this.defaultGetEntitiesByCriteria(criteria, inline)
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
   *                              + "some__entity_Id" ==> cids: {some__entity_Id: string}[]
   *                              + ...ect...
   */
  override deleteRelationCollection(
    parentId: any,
    parent: CompositeTestEntity | Partial<CompositeTestEntity>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<CompositeTestEntity | null> {
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
    parentId: any,
    parent: CompositeTestEntity | Partial<CompositeTestEntity>,
    relationName: string,
    cids: { id: string }[],
  ): Observable<CompositeTestEntity | null> {
    /**
     * Update your entity with any additional fields.
     * example:
     * const data: any = {};
     * data['_entityUpdatedBy'] =  user;
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
     * any
     */

    /**
     * You may override the default addRelationCollection() logic
     *  by returning your own implementation logic
     */
    return this.defaultAddRelationCollection(parentId, parent, relationName, cids)
  }
}
