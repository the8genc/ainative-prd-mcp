# AINative PRD MCP Server — Stress Test Results

**Date:** 2026-06-08
**Version:** 1.0.0
**Environment:** Production (api.ainative.studio)
**Total:** 24/24 PASS in 18.5 seconds

## Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Platform Discovery | 8 | 8 | 0 |
| Template Management | 5 | 5 | 0 |
| Validation | 6 | 6 | 0 |
| Memory (ZeroDB Live) | 4 | 4 | 0 |
| Generation | 1 | 1 | 0 |
| **Total** | **24** | **24** | **0** |

## Test Details

### Platform Discovery (8 tests)

| Test | Status | Latency |
|------|--------|---------|
| `prd_list_services` — returns 22 products | PASS | <1ms |
| `prd_list_services` — filter by category "AI Inference" | PASS | <1ms |
| `prd_list_services` — verbose mode with features | PASS | <1ms |
| `prd_get_api_catalog` — ZeroDB catalog | PASS | <1ms |
| `prd_get_api_catalog` — ZeroMemory catalog | PASS | <1ms |
| `prd_get_api_catalog` — unknown service returns error | PASS | <1ms |
| `prd_suggest_stack` — memory + files -> ZeroDB + ZeroMemory | PASS | 4.8s |
| `prd_suggest_stack` — streaming -> Live Streaming detected | PASS | 3.4s |

### Template Management (5 tests)

| Test | Status | Latency |
|------|--------|---------|
| `prd_list_templates` — 3+ templates | PASS | 2.2s |
| `prd_get_template` — standard has placeholders | PASS | <1ms |
| `prd_get_template` — ainative-feature has compliance section | PASS | <1ms |
| `prd_get_template` — unknown template returns error | PASS | 3.3s |
| `prd_render_template` — variable substitution works | PASS | <1ms |

### Validation (6 tests)

| Test | Status | Latency |
|------|--------|---------|
| `prd_validate` — good PRD scores 80+ | PASS | 2ms |
| `prd_validate` — bad PRD scores <30 | PASS | 1ms |
| `prd_validate` — rejects Supabase reference | PASS | 1ms |
| `prd_score` — returns score + grade | PASS | <1ms |
| `prd_check_api_refs` — valid /api/v1/zerodb paths | PASS | 1ms |
| `prd_check_api_refs` — detects invalid paths | PASS | <1ms |

### Memory — ZeroDB Live (4 tests)

| Test | Status | Latency |
|------|--------|---------|
| `prd_save` — save PRD as plan artifact | PASS | 1.5s |
| `prd_load` — load by ID, verify title + content | PASS | 464ms |
| `prd_history` — version history returned | PASS | 695ms |
| `prd_search` — semantic search returns results | PASS | 2.1s |

### Generation (1 test)

| Test | Status | Latency |
|------|--------|---------|
| `prd_generate` — template fallback, correct substitution | PASS | 3ms |

## Bugs Found & Fixed During Testing

### Bug 1: Plan Artifacts Missing Namespace (Backend)
- **Issue:** AINative-Studio/core#3880
- **PR:** AINative-Studio/core#3881 (merged)
- **Root cause:** `plan_artifacts.py` called `memory.remember()` without `namespace` param (mandatory since #2960)
- **Fix:** Pass `namespace='global'` for cross-session artifacts, `session:<id>` when session provided
- **Impact:** Blocked all PRD/plan create and update operations

### Bug 2: Validation Regexes Don't Match Numbered Sections
- **Root cause:** Regex `^#{1,3}\s*(introduction|...)` doesn't match `## 1. Introduction`
- **Fix:** Updated all section-matching regexes to include optional `(\d+\.?\s*)?` prefix
- **Impact:** Good PRDs scored 67 instead of 80+

### Bug 3: Memory Client Sends Wrong Fields to /remember
- **Root cause:** Client sent `session_id` and `role` fields not in `RememberRequest` schema; missing required `namespace` field
- **Fix:** Updated `storeMemory()` to send `namespace`, `memory_type`, `importance` instead
- **Impact:** All `prd_save` calls returned 422

## Performance Notes

- Local tools (validation, templates, platform) execute in <5ms
- ZeroDB operations (save, load, search) take 0.5-2.5s (network round-trip to api.ainative.studio)
- Stack suggestion with AI takes 3-5s when authenticated (falls back to keyword matching without auth)
