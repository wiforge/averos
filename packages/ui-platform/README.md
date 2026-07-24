# @averos/ui-platform

> Angular UI platform for the [Averos](https://github.com/wiforge/averos) execution runtime.

`@averos/ui-platform` delivers a comprehensive library of Angular Material components, dynamic form engines, reflective view builders, and entity use case scaffolding that serves as the **Angular adapter layer** for the Averos DAG-driven application generation pipeline.

It is the rendering and interaction surface of the Averos platform — the layer that turns a DAG execution plan into a fully functional, navigable Angular application.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Peer Dependencies](#peer-dependencies)
- [Usage](#usage)
- [Key Concepts](#key-concepts)
- [API Surface](#api-surface)
- [Theming](#theming)
- [Internationalization](#internationalization)
- [Authentication](#authentication)
- [Development](#development)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

`@averos/ui-platform` is the UI execution layer of the Averos platform. It bridges the gap between Averos's deterministic DAG execution engine and the end user — providing:

- **Dynamic form generation** from entity metadata, with full validation support
- **Reflective view builders** that render entity models without hand-written templates
- **CRUD use case scaffolding** — Create, Search, View, Edit, and Delete workflows out of the box
- **Material Design component library** tuned for enterprise-grade applications
- **Authentication adapter surface** for Keycloak, Firebase, and custom providers
- **Multilingual support** with runtime language switching via Angular's `@angular/localize`
- **Progressive Web App** support with Angular Service Worker integration

The library is designed to be consumed by applications generated or scaffolded by the Averos CLI and workflow engine, but is fully usable as a standalone Angular component library.

---

## Architecture

```
@averos/ui-platform
├── averos-core/           # Runtime services, DI tokens, auth adapters, environment config
├── averos-shared/         # Shared utilities, static variables, type helpers
├── averos-translation/    # i18n runtime, language management, translation entry points
├── public-space/          # Public-facing layout components and routing shells
├── referential/           # Referential data management and lookup services
├── styles/                # Global SCSS design tokens, Material theme overrides
└── view/                  # Dynamic view engine
    └── components/        # All renderable UI components (forms, tables, dialogs, menus)
```

The library follows a **partial compilation** model (`compilationMode: partial`) — enabling compatibility with any Angular 21+ consuming application without requiring recompilation of library internals.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | `>= 20.0.0` |
| Angular | `>= 21.2.0` |
| `@averos/core` | `>= 2.0.0` |

---

## Installation

```bash
# npm
npm install @averos/ui-platform

# pnpm
pnpm add @averos/ui-platform

# yarn
yarn add @averos/ui-platform
```

After installation, install the required peer dependencies (see below), then run the Averos schematic to initialize the platform in your Angular application:

```bash
ng add @averos/workflow
```

---

## Peer Dependencies

`@averos/ui-platform` requires the following peer dependencies to be installed in your consuming application:

```json
{
    "@angular/cdk":               ">=22.0.0 <23.0.0",
    "@angular/common":            ">=22.0.0 <23.0.0",
    "@angular/compiler":          ">=22.0.0 <23.0.0",
    "@angular/core":              ">=22.0.0 <23.0.0",
    "@angular/forms":             ">=22.0.0 <23.0.0",
    "@angular/localize":          ">=22.0.0 <23.0.0",
    "@angular/material":          ">=22.0.0 <23.0.0",
    "@angular/platform-browser":  ">=22.0.0 <23.0.0",
    "@angular/router":            ">=22.0.0 <23.0.0",
    "@angular/service-worker":    ">=22.0.0 <23.0.0",
    "file-saver":                 ">=2.0.5",
    "rxjs":                       ">=7.8.0 <8.0.0",
    "zone.js":                    ">=0.15.0 <1.0.0",
    "@averos/core":               ">=2.0.0",
    "rxjs":                       "~7.8.0",
    "zone.js":                    "^0.16.0",
    "file-saver":                 ">=2.0.5"
}
```

Optional peer dependencies (required only when using the corresponding auth provider):

```json
{
  "firebase":    ">=12.0.0",
  "keycloak-js": ">=26.0.0"
}
```

---

## Usage


### Bootstrap with the Averos schematic (recommended)

The recommended way to set up `@averos/ui-platform` in an Angular application is via the Averos workflow schematic:

```bash
ng add @averos/workflow
ng generate @averos/workflow:create-application --name=my-app
```

This configures routing, authentication, environment, theming, and i18n automatically.

### 3. Generate entity use cases

```bash
# Generate a full CRUD use case for an entity
ng generate @averos/workflow:averos-entity --name=Product

# Generate individual use cases
ng generate @averos/workflow:create-entity-uc --entity=Product
ng generate @averos/workflow:search-entity-uc --entity=Product
```

---

## Key Concepts

### Indexable Entity

All entities consumed by the platform's dynamic rendering engine must implement the `Indexable` interface, enabling runtime field resolution without breaking TypeScript's type system:

```typescript
import { Indexable } from '@averos/ui-platform';

export class Product implements Indexable {
  [key: string]: any;
  id: string;
  name: string;
  price: number;
}
```

### Use Case Configuration

The `UseCaseConfig<T>` interface is the central configuration contract for all entity use cases. It carries entity type metadata, view layout configuration, and runtime state:

```typescript
import { UseCaseConfig, UseCase } from '@averos/ui-platform';
import { Product } from './model/product';

const config: UseCaseConfig<Product> = {
  entityType: Product,
  entity: new Product(),
  useCase: UseCase.CREATE,
  componentAppearance: 'outline',
  iconLayout: 'component'
};
```

### Dynamic View Engine

The dynamic view engine renders entity forms, tables, and detail views from metadata — no hand-written templates required:

```html
<averos-dynamic-view
  [useCaseConfig]="useCaseConfig$"
  [entityUseCaseViewLayout$]="viewLayout$">
</averos-dynamic-view>
```

---

## API Surface

The full public API is exported from the main entry point:

```typescript
import {
  // Interfaces & types
  Indexable,
  IndexableType,
  UseCaseConfig,
  UseCaseViewLayout,
  EntityViewLayout,

  // Enums
  UseCase,
  ComponentAppearance,
  IconLayout,

  // Abstract use cases
  CreateViewEditUseCase,
  SearchUseCase,

  // Services
  ApplicationSharedService,
  EnvironmentConfiguratorService,
  EntityConfigurationManagerService,
  FormControlService,

  // Modules
  AverosCoreModule,
} from '@averos/ui-platform';
```

For deep sub-path imports (available in development mode via path aliases):

```typescript
import { CreateViewEditUseCase } from '@averos/ui-platform/view/_models/usecase/create-view-edit-usecase';
import { EntityViewLayout }      from '@averos/ui-platform/view/_models/entity-view-layout/entity-view-layout';
```



---

## Theming

`@averos/ui-platform` is built on Angular Material and supports full Material Design theming.

Add the prebuilt theme to your application's `styles` in `angular.json` or `project.json`:

```json
"styles": [
  "@angular/material/prebuilt-themes/indigo-pink.css",
  "src/styles.scss"
]
```

For custom theming, import Angular Material's SCSS API in your global stylesheet:

```scss
@use "@angular/material" as mat;

$primary: mat.m2-define-palette(mat.$indigo-palette);
$accent:  mat.m2-define-palette(mat.$pink-palette, A200, A100, A400);
$theme:   mat.m2-define-light-theme((
  color: (primary: $primary, accent: $accent)
));

@include mat.all-component-themes($theme);
```

---

## Internationalization

`@averos/ui-platform` supports runtime multilingual switching via Angular's `@angular/localize`.

Add a language to your application:

```bash
ng generate @averos/workflow:add-language --language=fr
```

Add translation entries:

```bash
ng generate @averos/workflow:add-translation-entry --key=app.title --value="Mon Application" --language=fr
```

---

## Authentication

The platform ships with adapter interfaces for the following authentication providers:

| Provider | Status |
|---|---|
| dummy | ✔ for test purposes |
| Keycloak | ✔ Supported (`keycloak-js >= 26.0.0`) |
| Firebase | ✔ Supported (`firebase >= 12.0.0`) |
| Custom | ✔ Implement `AverosAuthProvider` interface |

Configure an authentication provider:

```bash
ng generate @averos/workflow:averos-auth --provider=keycloak
ng generate @averos/workflow:averos-auth-config --provider=keycloak
```

---

## Development

This library is part of the [Averos monorepo](https://github.com/wiforge/averos). To develop locally:

```bash
# Clone the repository
git clone https://github.com/wiforge/averos.git
cd averos

# Install dependencies
pnpm install

# Build the library
pnpm run build:lib

# Serve the showcase application with live library source
pnpm run dev
```

For the full development guide, see [CONTRIBUTING.md](../../CONTRIBUTING.md).

### Build targets

| Command | Description |
|---|---|
| `pnpm run build:lib` | Build `@averos/ui-platform` |
| `pnpm run dev` | Serve showcase app with live library source (hot reload) |
| `pnpm run pack:lib` | Pack library into a `.tgz` artifact |
| `pnpm run publish:local` | Publish to local Verdaccio registry |
| `pnpm run publish:lib` | Publish to npm |

---

## Documentation

The full documentation is available under [Averos Documentation](https://www.wiforge.com/averos/documentation/). 


---

## License

Copyright © 2020-2026 Houssemeddine LAOUITI (Wiforge).

Released under the [MIT LICENSE](../../LICENSE).

---

<p align="center">
  Built with ❤️ by the <a href="https://github.com/wiforge">Wiforge</a> team · Part of the <a href="https://github.com/wiforge/averos">Averos Platform</a>
</p>