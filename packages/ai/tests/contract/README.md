# Contract Tests

## Purpose

Verify that a real LLM respects the contract expected by @averos/ai.

These tests are not trying to build complete applications.

They verify:

- returns JSON
- returns Manifest
- obeys schema
- can repair invalid output
- supports incremental updates