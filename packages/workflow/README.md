# @averos/workflow

> Workflow runtime and Angular Schematics adapter for the Averos execution platform.

`@averos/workflow` provides a concrete workflow execution adapter implementation used by the Averos execution engine. It bridges the generic execution model defined by the Averos DAG engine with Angular DevKit Schematics, enabling deterministic generation, transformation, and evolution of applications from execution plans.

The package contains the complete library of Averos custom schematics responsible for generating and updating application artifacts throughout the software lifecycle.

---

## Overview

The Averos platform separates **planning** from **execution**.

- **Planning** produces an execution graph describing the work to perform.
- **Execution** orchestrates the graph independently of any implementation technology.
- **Workflow** provides the concrete implementation that performs the work.

This package supplies the Angular-based execution runtime through the `AngularSchematicsAdapter`, which integrates with the Averos Executor and delegates each workflow step to the appropriate custom schematic.

```
             +----------------------+
             |   Averos Planner     |
             +----------+-----------+
                        |
                        v
             +----------------------+
             |      DAG Engine      |
             +----------+-----------+
                        |
                        v
             +----------------------+
             |       Executor       |
             +----------+-----------+
                        |
              ExecutionAdapter
                        |
                        v
      +----------------------------------+
      | AngularSchematicsAdapter         |
      | (@averos/workflow)               |
      +----------------+-----------------+
                       |
        +--------------+--------------+
        |                             |
        v                             v
  Custom Schematic A           Custom Schematic B
```

---

## Responsibilities

`@averos/workflow` is responsible for:

- Implementing the `AngularSchematicsAdapter`
- Providing the concrete execution runtime for Angular-based workflows
- Registering and exposing all Averos custom schematics
- Translating execution requests into Angular DevKit schematic executions
- Creating and updating application artifacts
- Performing project transformations in a deterministic manner
- Encapsulating framework-specific implementation details from the execution engine

---

## Architecture

The package follows the Adapter pattern.

The Averos Executor interacts exclusively with the abstract `ExecutionAdapter` contract. The `AngularSchematicsAdapter` provides the Angular-specific implementation while keeping the executor independent of any generation technology.

This separation enables:

- pluggable execution backends
- framework-independent orchestration
- future workflow implementations for other ecosystems
- isolated evolution of workflow technologies

---

## Custom Schematics

This package contains the complete library of Averos schematics responsible for generating and evolving application assets.

Typical responsibilities include:

- Workspace creation
- Project initialization
- Domain generation
- Feature generation
- UI generation
- Service generation
- Configuration creation and updates
- Project migrations
- Incremental project evolution

Each schematic performs a single, well-defined transformation and is designed to be deterministic, composable, and idempotent whenever applicable.

---

## Integration

The execution flow is:

1. An execution plan is produced by the Averos DAG Engine.
2. The Executor traverses the execution graph.
3. The Executor invokes the configured `ExecutionAdapter`.
4. `AngularSchematicsAdapter` resolves the requested workflow.
5. The corresponding Angular schematic executes.
6. Generated artifacts are written to the target workspace.

---

## Design Principles

The workflow runtime is designed around the following principles:

- **Deterministic** — identical inputs produce identical outputs.
- **Composable** — workflows are assembled from small, focused schematics.
- **Extensible** — additional adapters can support new execution technologies.
- **Framework Isolation** — Angular-specific concerns remain isolated from the executor.
- **Reusable** — schematics are designed to be reusable across products and solutions.
- **Maintainable** — generation logic is centralized and versioned.

---

## Package Structure

A typical organization includes:

```
src/
└─ schematics/
   ├── averos-config/
   ├── averos-entity/
   ├── create-application/
   ├── averos-service/
   ├── averos-auth/
   └── ...

```

The exact structure may evolve as additional workflow capabilities are introduced.

---

## Relationship to Other Averos Packages

| Package | Responsibility |
|---------|----------------|
| `@averos/dag-engine` | Defines execution graphs and orchestration model |
| `@averos/executor` | Executes DAGs using an `ExecutionAdapter` |
| `@averos/workflow` | Implements the Angular execution adapter custom schematics |
| `@averos/mcp` | Exposes Averos capabilities through the Model Context Protocol |

---

## Extensibility

Although this package currently targets Angular DevKit Schematics, the execution architecture is intentionally adapter-based.

Future implementations may provide adapters for additional workflow technologies while preserving the same execution model exposed by the Averos Executor.

---

## License

Copyright © 2020-2026 Houssemeddine LAOUITI (Wiforge).

Released under the [MIT LICENSE](../../LICENSE).

---

<p align="center">
  Built with ❤️ by the <a href="https://github.com/wiforge">Wiforge</a> team · Part of the <a href="https://github.com/wiforge/averos">Averos Platform</a>
</p>