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

// =============================================================================
//
// Few-shot examples for manifest generation.
//
// Purpose:
//   Concrete input/output pairs that demonstrate the expected Manifest
//   structure to the LLM. Few-shot examples dramatically improve:
//     - Schema compliance on first attempt
//     - Field naming conventions (camelCase, PascalCase)
//     - Relationship modeling (composite fields)
//     - Auth provider configuration patterns
//
// Usage:
//   Appended to the system prompt when the task is complex or
//   when a previous attempt failed.
//
// Maintenance:
//   Keep examples minimal — one complete example is better than three
//   partial ones. The LLM should learn the pattern, not memorize specific apps.
// =============================================================================

// ─── Example 1: Minimal app (no auth, single entity) ─────────────────────────

export const MINIMAL_EXAMPLE = {
  intent: 'A simple note-taking app with a Note entity having a title and body.',

  manifest: {
    applicationName:             'NoteApp',
    defaultLanguageCode:         'en',
    enableAuthentication:        false,
    enableExternalEntityMapping: true,

    entities: [
      {
        name:    'Note',
        sname:   'NoteService',
        members: [
          {
            memberNature: 'simple',
            ename:        'Note',
            mname:        'note_id',
            memberType:   'string',
            memberTag:    'ID',
          },
          {
            memberNature: 'simple',
            ename:        'Note',
            mname:        'title',
            memberType:   'string',
            memberTag:    'BusinessID',
          },
          {
            memberNature: 'simple',
            ename:        'Note',
            mname:        'body',
            memberType:   'textarea',
          },
          {
            memberNature: 'simple',
            ename:        'Note',
            mname:        'createdDate',
            memberType:   'date',
          },
        ],
      },
    ],

    serviceConfigurations: [
      {
        id:                  'NoteService',
        apiHost:             'localhost',
        apiPort:             3000,
        apiProtocol:         'http',
        apiEndPoint:         '/api/notes',
        apiHTTPQueryBuilder: 'mongodb',
      },
    ],

    fieldMappings: [
      {
        ename:   'Note',
        name:    'NoteMapping',
        mapping: [
          { fieldKey: 'note_id',           mapTo: '_id'       },
          { fieldKey: '_entityCreatedAt',  mapTo: 'createdAt' },
        ],
      },
    ],

    useCases: [
      { name: 'NoteCRUD',   ename: 'Note', useCaseType: 'CRUD'          },
      { name: 'SearchNote', ename: 'Note', useCaseType: 'Search_Entity' },
    ],

    languages: [
      {
        languageCode: 'en',
        translationEntries: [
          { localeID: 'note.title',        localeValue: 'Title'         },
          { localeID: 'note.body',         localeValue: 'Body'          },
          { localeID: 'note.createddate',  localeValue: 'Created'       },
          { localeID: 'menu.note',         localeValue: 'Notes'         },
          { localeID: 'menu.note.add',     localeValue: 'New Note'      },
          { localeID: 'menu.note.search',  localeValue: 'Search Notes'  },
        ],
      },
    ],
  },
} as const

// ─── Example 2: App with auth and relationships ────────────────────────────────

export const AUTH_WITH_RELATIONSHIPS_EXAMPLE = {
  intent: 'A project management app with Projects and Tasks. Projects have many Tasks. Secure with keycloak.',

  manifest: {
    applicationName:                'ProjectApp',
    defaultLanguageCode:            'en',
    enableAuthentication:           true,
    enableExternalEntityMapping:    true,
    defaultAuthenticationProvider: 'keycloak',

    entities: [
      {
        name:    'Project',
        sname:   'ProjectService',
        members: [
          {
            memberNature: 'composite',
            ename:        'Project',
            fename:       'Task',
            memberName:   'tasks',
            fieldRelationType: 'OneToMany',
            deleteStrategy:    'DELETE_CHILDREN',
          },
          {
            memberNature: 'simple',
            ename:        'Project',
            mname:        'project_id',
            memberType:   'string',
            memberTag:    'ID',
          },
          {
            memberNature: 'simple',
            ename:        'Project',
            mname:        'projectName',
            memberType:   'string',
            memberTag:    'BusinessID',
          },
          {
            memberNature: 'simple',
            ename:        'Project',
            mname:        'status',
            memberType:   'enumeration',
            listOfEnumValues: 'Active,Archived,Draft',
          },
        ],
      },
      {
        name:    'Task',
        sname:   'TaskService',
        members: [
          {
            memberNature: 'simple',
            ename:        'Task',
            mname:        'task_id',
            memberType:   'string',
            memberTag:    'ID',
          },
          {
            memberNature: 'simple',
            ename:        'Task',
            mname:        'taskName',
            memberType:   'string',
            memberTag:    'BusinessID',
          },
          {
            memberNature: 'simple',
            ename:        'Task',
            mname:        'priority',
            memberType:   'number',
          },
          {
            memberNature: 'simple',
            ename:        'Task',
            mname:        'completed',
            memberType:   'boolean',
          },
        ],
      },
    ],

    serviceConfigurations: [
      {
        id:                  'ProjectService',
        apiHost:             'localhost',
        apiPort:             3000,
        apiProtocol:         'http',
        apiEndPoint:         '/api/projects',
        apiHTTPQueryBuilder: 'mongodb',
      },
      {
        id:                  'TaskService',
        apiHost:             'localhost',
        apiPort:             3000,
        apiProtocol:         'http',
        apiEndPoint:         '/api/tasks',
        apiHTTPQueryBuilder: 'mongodb',
      },
    ],

    fieldMappings: [
      {
        ename:   'Project',
        name:    'ProjectMapping',
        mapping: [
          { fieldKey: 'project_id',        mapTo: '_id'       },
          { fieldKey: '_entityCreatedAt',  mapTo: 'createdAt' },
        ],
      },
      {
        ename:   'Task',
        name:    'TaskMapping',
        mapping: [
          { fieldKey: 'task_id',           mapTo: '_id'       },
          { fieldKey: '_entityCreatedAt',  mapTo: 'createdAt' },
        ],
      },
    ],

    useCases: [
      { name: 'ProjectCRUD',  ename: 'Project', useCaseType: 'CRUD'          },
      { name: 'TaskCRUD',     ename: 'Task',    useCaseType: 'CRUD'          },
      { name: 'CreateTask',   ename: 'Task',    useCaseType: 'Create_Entity' },
      { name: 'SearchTask',   ename: 'Task',    useCaseType: 'Search_Entity' },
    ],

    httpAuthConfig: {
      tokenHeader:          'Authorization',
      tokenPrefix:          'Bearer',
      unauthorizedRedirect: '/login',
      withCredentials:      true,
      maxRefreshRetries:    3,
    },

    authentication: [
      {
        providerType: 'keycloak',
        config: [
          { key: 'url',                     value: 'http://localhost:8080' },
          { key: 'realm',                   value: 'my-realm'             },
          { key: 'clientId',                value: 'project-client'       },
          { key: 'initOnLoad',              value: 'false'                },
          { key: 'checkLoginIframe',        value: 'false'                },
          { key: 'enablePkce',              value: 'true'                 },
          { key: 'flow',                    value: 'standard'             },
          { key: 'enableTokenRefresh',      value: 'true'                 },
          { key: 'redirectUri',             value: 'http://localhost:4200'},
          { key: 'postLogoutRedirectUri',   value: 'http://localhost:4200/login' },
        ],
      },
    ],

    languages: [
      {
        languageCode: 'en',
        translationEntries: [
          { localeID: 'project.projectname',   localeValue: 'Project Name'  },
          { localeID: 'project.status',        localeValue: 'Status'        },
          { localeID: 'project.tasks',         localeValue: 'Tasks'         },
          { localeID: 'task.taskname',         localeValue: 'Task Name'     },
          { localeID: 'task.priority',         localeValue: 'Priority'      },
          { localeID: 'task.completed',        localeValue: 'Completed'     },
          { localeID: 'menu.project',          localeValue: 'Projects'      },
          { localeID: 'menu.project.add',      localeValue: 'New Project'   },
          { localeID: 'menu.task',             localeValue: 'Tasks'         },
          { localeID: 'menu.task.add',         localeValue: 'New Task'      },
        ],
      },
    ],
  },
} as const

// ─── Prompt builder ───────────────────────────────────────────────────────────

/**
 * Selects the most relevant example(s) to include in the prompt based
 * on signals in the user's intent.
 *
 * Returns formatted example text to append to the system prompt.
 */
export function buildExamplesSection(userIntent: string): string {
  const lower = userIntent.toLowerCase()

  const includeAuth = lower.includes('auth') ||
                      lower.includes('login') ||
                      lower.includes('keycloak') ||
                      lower.includes('secure')

  const includeRelationship = lower.includes('relation') ||
                               lower.includes('belong') ||
                               lower.includes('has many') ||
                               lower.includes('one to') ||
                               lower.includes('parent') ||
                               lower.includes('child')

  const examples: Array<{ intent: string; manifest: object }> = []

  if (includeAuth || includeRelationship) {
    examples.push(AUTH_WITH_RELATIONSHIPS_EXAMPLE)
  } else {
    examples.push(MINIMAL_EXAMPLE)
  }

  const lines = [
    '',
    'EXAMPLE (input → expected output):',
    '',
  ]

  for (const ex of examples) {
    lines.push(`Intent: "${ex.intent}"`)
    lines.push('Output:')
    lines.push(JSON.stringify(ex.manifest, null, 2))
    lines.push('')
  }

  return lines.join('\n')
}