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

import { Observable } from 'rxjs'
import { CompositeTestEntityService } from '../service/composite-test-entity-service.service'
import {
  AverosEntity,
  BusinessID,
  EntityViewLayout,
  getUseCaseViewLayout,
  ID,
  Indexable,
  UseCase,
  UseCaseViewLayout,
} from '@averos/core'

@AverosEntity(CompositeTestEntityService)
export class CompositeTestEntity implements Indexable {
  public static _entityViewLayout$: Observable<EntityViewLayout<CompositeTestEntity>>
  public static _entityViewLayout: EntityViewLayout<CompositeTestEntity>
  public static _entityName = 'CompositeTestEntity'
  private static _instance: CompositeTestEntity = new CompositeTestEntity()

  @ID()
  _entityId!: string
  _entityCreatedAt!: Date
  _entityUpdatedAt!: Date

  @BusinessID()
  name!: string

  static getEntityViewLayout(): Observable<EntityViewLayout<CompositeTestEntity>> {
    return CompositeTestEntity._entityViewLayout$
  }

  static getUseCaseViewLayout(
    useCase: UseCase,
  ): Observable<UseCaseViewLayout<CompositeTestEntity> | null> {
    return getUseCaseViewLayout(CompositeTestEntity, useCase)
  }

  static instanceMetadata() {
    if (!CompositeTestEntity._instance) {
      CompositeTestEntity._instance = new CompositeTestEntity()
    }
    return CompositeTestEntity._instance
  }

  /**
   * Add your custom implementation depending on your needs
   *
   */
}
