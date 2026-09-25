# Graph Report - Romy 0.1  (2026-09-25)

## Corpus Check
- 208 files · ~226,856 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 13, .toml 3, .example 1)

## Summary
- 1533 nodes · 2321 edges · 154 communities (84 shown, 70 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8bd4b915`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- step6-connections.tsx
- (tabs)/index.tsx
- dependencies
- collapsible.tsx
- ProximaViagemScreen.tsx
- expo
- expo-router
- ref_fs
- chat/[id].tsx
- communities.tsx
- package.json
- help-board.tsx
- app/_layout.tsx
- test_flight_verification.js
- theme/index.ts
- MatchingActionButton.tsx
- react
- What You Must Do When Invoked
- spacing
- Hardening Controls
- overrides
- scripts
- tsconfig.json
- supabase_schema.sql
- public.communities
- Code Review and Quality
- Test-Driven Development
- lucide-react-native
- eslint.config.js
- devDependencies
- react-native
- public.comments
- supabase_messenger.sql
- vercel.json
- Context Engineering
- external-link.tsx
- public.event_requests
- metro.config.js
- minor_age_restriction.sql
- public.help_replies
- supabase_discovery.sql
- public.is_conversation_member
- translate-message/index.ts
- searchArrays
- test_complete_flow.js
- test_gf_parser.js
- test_intl.js
- test_query_syntax.js
- test_routes.js
- test_trips.js
- public.connections
- imports
- public.is_conversation_member
- public.posts
- test_clean.js
- cities.ts
- public.conversations
- public.help_requests
- public.messages
- public.posts
- public.users
- public.users
- public.users
- public.comments
- public.communities
- public.community_members
- public.community_posts
- public.connections
- public.event_requests
- public.events
- public.local_events
- public.post_likes
- storage.objects
- public.messages
- public.conversation_participants
- public.messages
- public.users
- Git Workflow and Versioning
- Shipping and Launch
- API and Interface Design
- Browser Testing with DevTools
- Constraint-Driven Development
- Frontend UI Engineering
- Performance Optimization
- CI/CD and Automation
- CustomDatePicker.tsx
- Deprecation and Migration
- Incremental Implementation
- Code Simplification
- Debugging and Error Recovery
- reset-project.js
- graphify reference: extra exports and benchmark
- Documentation and ADRs
- @supabase/supabase-js
- Ponytail Help
- test_all_screens_authenticated.js
- Interview Me
- Planning and Task Breakdown
- test_headless_app.js
- ReOrder: Keep Your Regulars Ordering Direct
- Doubt-Driven Development
- graphify reference: query, path, explain
- Process
- Idea Refine
- Using Agent Skills
- Welcome to your Expo app 👋
- patch-image-size.js
- test_onboarding_e2e.js
- Integração de Ferramentas: Graphify, Ponytail & Agent Skills
- ponytail-audit/SKILL.md
- Ponytail Gain
- Spec-Driven Development
- supabase.ts
- Source-Driven Development
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- ponytail-debt/SKILL.md
- Refinement & Evaluation Criteria
- Ideation Frameworks Reference
- edit-profile.tsx
- idea-refine.sh
- make_compiled.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- rules/graphify.md
- ponytail.md
- extraction-spec.md
- workflows/graphify.md
- public.users

## God Nodes (most connected - your core abstractions)
1. `react-native` - 68 edges
2. `react` - 52 edges
3. `useTheme()` - 49 edges
4. `lucide-react-native` - 44 edges
5. `spacing` - 40 edges
6. `typography` - 38 edges
7. `expo-router` - 37 edges
8. `colors` - 29 edges
9. `supabase` - 24 edges
10. `Code Review and Quality` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Contract` --references--> `catch()`  [INFERRED]
  .agents/skills/constraint-driven-development/references/floor-guard.md → scratch/flight_service_compiled.js
- `Step 6: Guard the bar itself` --references--> `catch()`  [INFERRED]
  .agents/skills/constraint-driven-development/SKILL.md → scratch/flight_service_compiled.js
- `Boundaries` --references--> `assert()`  [INFERRED]
  .agents/skills/ponytail-review/SKILL.md → scratch/test_flight_verification.js
- `When NOT to be lazy` --references--> `assert()`  [INFERRED]
  .agents/skills/ponytail/SKILL.md → scratch/test_flight_verification.js
- `AudioPlayer()` --calls--> `useTheme()`  [EXTRACTED]
  app/chat/[id].tsx → src/theme/index.ts

## Import Cycles
- None detected.

## Communities (154 total, 70 thin omitted)

### Community 0 - "step6-connections.tsx"
Cohesion: 0.12
Nodes (21): Step1PersonalScreen(), Step2TripScreen(), styles, Step3TravelStyleScreen(), styles, stylesList, interestsList, Step4InterestsScreen() (+13 more)

### Community 1 - "(tabs)/index.tsx"
Cohesion: 0.06
Nodes (51): getStyles(), NotificationsScreen(), ITunesSong, RomyFeedScreen(), styles, { width, height }, expo-audio, expo-blur (+43 more)

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, base64-arraybuffer, expo, expo-audio, expo-auth-session, expo-blur, expo-camera, expo-constants (+37 more)

### Community 3 - "collapsible.tsx"
Cohesion: 0.11
Nodes (19): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+11 more)

### Community 4 - "ProximaViagemScreen.tsx"
Cohesion: 0.19
Nodes (24): runTest(), { searchRealFlights, buildDirectAirlineUrl, buildGoogleFlightsUrl }, getInitialFlightDates(), PriceDate, ProximaViagemScreen(), s, { width, height }, AIRLINE_LOGOS (+16 more)

### Community 5 - "expo"
Cohesion: 0.06
Nodes (31): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, package, predictiveBackGestureEnabled (+23 more)

### Community 6 - "expo-router"
Cohesion: 0.12
Nodes (13): LoginScreen(), styles, Index(), PaywallScreen(), styles, styles, TabLayout(), expo-router (+5 more)

### Community 7 - "ref_fs"
Cohesion: 0.18
Nodes (6): ref_fs, fs, fs, data, fs, raw

### Community 8 - "chat/[id].tsx"
Cohesion: 0.11
Nodes (35): AudioPlayer(), ChatDetailScreen(), getStyles(), { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, ChatScreen(), getStyles(), ConnectionsScreen(), getStyles() (+27 more)

### Community 9 - "communities.tsx"
Cohesion: 0.14
Nodes (26): CommunityScreen(), getStyles(), CommunitiesScreen(), CommunityCard(), s, TYPE_COLORS, typeColors(), typeIcon() (+18 more)

### Community 10 - "package.json"
Cohesion: 0.06
Nodes (30): main, name, private, version, dotenv, expo-auth-session, expo-camera, expo-constants (+22 more)

### Community 11 - "help-board.tsx"
Cohesion: 0.20
Nodes (15): FreeStatusScreen(), CAT, catConf(), CATEGORIES, CategoryKey, HelpBoardScreen(), s, useCreateHelpReply() (+7 more)

### Community 12 - "app/_layout.tsx"
Cohesion: 0.13
Nodes (13): ErrorBoundary, react-native-safe-area-context, InAppMessageBanner(), styles, IncomingCallBanner(), styles, { width: SCREEN_WIDTH }, GlobalNotificationContext (+5 more)

### Community 13 - "test_flight_verification.js"
Cohesion: 0.07
Nodes (24): Boundaries, Examples, Format, Scoring, Boundaries, Intensity, Output, Persistence (+16 more)

### Community 14 - "theme/index.ts"
Cohesion: 0.11
Nodes (26): getStyles(), NotificationSettingsScreen(), getStyles(), SettingsScreen(), CreateScreen(), styles, @react-native-async-storage/async-storage, zustand (+18 more)

### Community 15 - "MatchingActionButton.tsx"
Cohesion: 0.20
Nodes (8): AnimatedPressable, MatchingActionButton(), MatchingActionButtonProps, MatchingActionType, styles, src_theme_index_motion, motion, MotionPresets

### Community 16 - "react"
Cohesion: 0.21
Nodes (8): getStyles(), ProfileScreen(), react, SkeletonChatRow(), SkeletonLine(), SkeletonProfileHeader(), SkeletonProps, skeletonStyles

### Community 17 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 18 - "spacing"
Cohesion: 0.12
Nodes (23): styles, { width: SCREEN_WIDTH }, BirthDatePicker(), BirthDatePickerProps, MONTHS, styles, Chip(), ChipProps (+15 more)

### Community 19 - "Hardening Controls"
Cohesion: 0.05
Nodes (42): Broken Access Control, Broken Authentication, Cross-Site Scripting (XSS), Data Classification, Dependency Audit Triage, Destructive Operations on Derived Paths, File Upload Safety, Hardening Patterns (+34 more)

### Community 20 - "overrides"
Cohesion: 0.22
Nodes (9): ws, overrides, decode-uri-component, image-size, metro, postcss, react-devtools-core, uuid (+1 more)

### Community 21 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, android, build, ios, lint, postinstall, reset-project, start (+1 more)

### Community 22 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 23 - "supabase_schema.sql"
Cohesion: 0.33
Nodes (4): auth, public.handle_new_user, on_auth_user_created, public.users

### Community 24 - "public.communities"
Cohesion: 0.60
Nodes (5): public.communities, public.community_members, public.community_posts, public.conversations, public.users

### Community 25 - "Code Review and Quality"
Cohesion: 0.07
Nodes (29): 1. Correctness, 2. Readability & Simplicity, 3. Architecture, 4. Security, 5. Performance, Change Descriptions, Change Sizing, Code Review and Quality (+21 more)

### Community 26 - "Test-Driven Development"
Cohesion: 0.07
Nodes (29): Browser Testing with DevTools, Common Rationalizations, DAMP Over DRY in Tests, Decision Guide, Discover the Stack First, Name Tests Descriptively, One Assertion Per Concept, Overview (+21 more)

### Community 27 - "lucide-react-native"
Cohesion: 0.40
Nodes (5): FAQ_LIST, FAQItem, getStyles(), HelpSupportScreen(), lucide-react-native

### Community 28 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, eslint, eslint-config-expo

### Community 29 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, dotenv, eslint, eslint-config-expo, @expo/ngrok, playwright, qrcode, @types/react (+1 more)

### Community 30 - "react-native"
Cohesion: 0.29
Nodes (4): react-native, RomyMap, RomyMapProps, styles

### Community 31 - "public.comments"
Cohesion: 0.60
Nodes (4): public.comments, public.post_likes, public.posts, public.users

### Community 32 - "supabase_messenger.sql"
Cohesion: 0.70
Nodes (4): public.conversation_participants, public.conversations, public.messages, public.users

### Community 33 - "vercel.json"
Cohesion: 0.40
Nodes (4): buildCommand, headers, outputDirectory, rewrites

### Community 34 - "Context Engineering"
Cohesion: 0.07
Nodes (28): Anti-Patterns, Common Rationalizations, Compress before dropping, Confusion Management, Context Budget Management, Context Engineering, Context Packing Strategies, Level 1: Rules Files (+20 more)

### Community 36 - "public.event_requests"
Cohesion: 0.83
Nodes (3): public.event_requests, public.local_events, public.users

### Community 37 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, expo

### Community 39 - "public.help_replies"
Cohesion: 0.50
Nodes (3): public.help_replies, public.help_requests, public.users

### Community 40 - "supabase_discovery.sql"
Cohesion: 0.50
Nodes (3): public.events, public.help_requests, public.users

### Community 100 - "Git Workflow and Versioning"
Cohesion: 0.07
Nodes (26): 1. Commit Early, Commit Often, 2. Atomic Commits, 3. Descriptive Messages, 4. Keep Concerns Separate, 5. Size Your Changes, Branch Naming, Branching Strategy, Change Summaries (+18 more)

### Community 101 - "Shipping and Launch"
Cohesion: 0.08
Nodes (25): Accessibility, Code Quality, Common Rationalizations, Documentation, Error Budget Release Gate, Error Reporting, Feature Flag Strategy, Infrastructure (+17 more)

### Community 102 - "API and Interface Design"
Cohesion: 0.08
Nodes (24): 1. Contract First, 2. Consistent Error Semantics, 3. Validate at Boundaries, 4. Prefer Addition Over Modification, 5. Predictable Naming, 6. Honouring an Idempotency Key, API and Interface Design, Common Rationalizations (+16 more)

### Community 103 - "Browser Testing with DevTools"
Cohesion: 0.08
Nodes (24): Accessibility Verification with DevTools, Available Tools, Browser Testing with DevTools, Clean Console Standard, Common Rationalizations, Console Analysis Patterns, Content Boundary Markers, For Network Issues (+16 more)

### Community 104 - "Constraint-Driven Development"
Cohesion: 0.08
Nodes (23): Adapting it, Contract, Floor guard: reference implementation, Reference (Node, ~stack-agnostic patterns), Common Rationalizations, Constraint-Driven Development, Escalation Path, Loading Constraints (+15 more)

### Community 105 - "Frontend UI Engineering"
Cohesion: 0.08
Nodes (24): Accessibility (WCAG 2.1 AA), ARIA Labels, Avoid the AI Aesthetic, Color, Common Rationalizations, Component Architecture, Component Patterns, Design System Adherence (+16 more)

### Community 106 - "Performance Optimization"
Cohesion: 0.08
Nodes (24): Common Rationalizations, Connection Pool Exhaustion, Core Web Vitals Targets, Large Bundle Size, Log every attempt, including the reverted ones, Missing Caching (Backend), Missing Image Optimization (Frontend), N+1 Queries (Backend) (+16 more)

### Community 107 - "CI/CD and Automation"
Cohesion: 0.08
Nodes (23): Automation Beyond CI, Basic CI Pipeline, Build Cop Role, CI/CD and Automation, CI Optimization, Common Rationalizations, Dependabot / Renovate, Deployment Strategies (+15 more)

### Community 108 - "CustomDatePicker.tsx"
Cohesion: 0.33
Nodes (6): CustomDatePicker(), CustomDatePickerProps, formatDateToBr(), PT_MONTHS, PT_WEEKDAYS, styles

### Community 109 - "Deprecation and Migration"
Cohesion: 0.08
Nodes (23): Adapter Pattern, Code Is a Liability, Common Rationalizations, Compulsory vs Advisory Deprecation, Core Principles, Database Schema Migrations (Expand/Contract), Deprecation and Migration, Deprecation Planning Starts at Design Time (+15 more)

### Community 110 - "Incremental Implementation"
Cohesion: 0.09
Nodes (22): Common Rationalizations, Contract-First Slicing, Implementation Rules, Increment Checklist, Incremental Implementation, Overview, Red Flags, Risk-First Slicing (+14 more)

### Community 111 - "Code Simplification"
Cohesion: 0.09
Nodes (21): 1. Preserve Behavior Exactly, 2. Follow Project Conventions, 3. Prefer Clarity Over Cleverness, 4. Maintain Balance, 5. Scope to What Changed, Code Simplification, Common Rationalizations, Language-Specific Guidance (+13 more)

### Community 112 - "Debugging and Error Recovery"
Cohesion: 0.09
Nodes (21): Build Failure Triage, Common Rationalizations, Debugging and Error Recovery, Error-Specific Patterns, Instrumentation Guidelines, Overview, Red Flags, Runtime Error Triage (+13 more)

### Community 113 - "reset-project.js"
Cohesion: 0.20
Nodes (8): ref_readline, exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 114 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 115 - "Documentation and ADRs"
Cohesion: 0.09
Nodes (21): ADR Lifecycle, ADR Template, API Documentation, Architecture Decision Records (ADRs), Changelog Maintenance, Common Rationalizations, Document Known Gotchas, Documentation and ADRs (+13 more)

### Community 116 - "@supabase/supabase-js"
Cohesion: 0.22
Nodes (5): @supabase/supabase-js, { createClient }, supabase, { createClient }, supabase

### Community 117 - "Ponytail Help"
Cohesion: 0.25
Nodes (7): Configure Default Mode, Deactivate, Levels, More, Ponytail Help, Skills, Update

### Community 118 - "test_all_screens_authenticated.js"
Cohesion: 0.25
Nodes (6): { chromium }, { createClient }, fs, path, REPORT, SCREENSHOTS_DIR

### Community 119 - "Interview Me"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Example, Interaction with Other Skills, Interview Me, Loading Constraints, Output, Overview, Red Flags (+10 more)

### Community 120 - "Planning and Task Breakdown"
Cohesion: 0.11
Nodes (18): Common Rationalizations, Output Files, Overview, Parallelization Opportunities, Plan Document Template, Planning and Task Breakdown, Red Flags, See Also (+10 more)

### Community 121 - "test_headless_app.js"
Cohesion: 0.29
Nodes (5): { chromium }, fs, path, REPORT, SCREENSHOTS_DIR

### Community 122 - "ReOrder: Keep Your Regulars Ordering Direct"
Cohesion: 0.11
Nodes (17): Example 1: Vague Early-Stage Concept (Full 3-Phase Session), Example 2: Feature Idea Within an Existing Product (Codebase-Aware), Example 3: Process/Workflow Idea (Non-Product), Ideation Session Examples, Key Assumptions to Validate, MVP Scope, Not Doing (and Why), Open Questions (+9 more)

### Community 123 - "Doubt-Driven Development"
Cohesion: 0.12
Nodes (15): Common Rationalizations, Cross-model escalation, Doubt-Driven Development, Interaction with Other Skills, Loading Constraints, Overview, Red Flags, Step 1: CLAIM — Surface what stands (+7 more)

### Community 124 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 125 - "Process"
Cohesion: 0.12
Nodes (15): 1. Define "working" before instrumenting, 2. Pick the right signal for each question, 3. Structured logging, 4. Metrics, 5. Distributed tracing, 6. Alerting, 7. Verify the telemetry itself, Common Rationalizations (+7 more)

### Community 126 - "Idea Refine"
Cohesion: 0.13
Nodes (14): Anti-patterns to Avoid, Detailed Instructions, How It Works, Idea Refine, Output, Phase 1: Understand & Expand (Divergent), Phase 2: Evaluate & Converge, Phase 3: Sharpen & Ship (+6 more)

### Community 127 - "Using Agent Skills"
Cohesion: 0.13
Nodes (14): 1. Surface Assumptions, 2. Manage Confusion Actively, 3. Push Back When Warranted, 4. Enforce Simplicity, 5. Maintain Scope Discipline, 6. Verify, Don't Assume, Core Operating Behaviors, Failure Modes to Avoid (+6 more)

### Community 128 - "Welcome to your Expo app 👋"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 129 - "patch-image-size.js"
Cohesion: 0.33
Nodes (4): ref_path, candidates, fs, path

### Community 130 - "test_onboarding_e2e.js"
Cohesion: 0.33
Nodes (4): playwright, { chromium }, { createClient }, supabase

### Community 131 - "Integração de Ferramentas: Graphify, Ponytail & Agent Skills"
Cohesion: 0.40
Nodes (4): 1. Graphify — Compreensão Arquitetural e Grafo de Dependências, 2. Ponytail — Filosofia de Código Minimalista e Qualidade, 3. Agent Skills (Addy Osmani) — Rigor de Engenharia, Qualidade e Ciclo de Vida (SDLC), Integração de Ferramentas: Graphify, Ponytail & Agent Skills

### Community 132 - "ponytail-audit/SKILL.md"
Cohesion: 0.40
Nodes (4): Boundaries, Hunt, Output, Tags

### Community 133 - "Ponytail Gain"
Cohesion: 0.40
Nodes (4): Boundaries, Honesty boundary, Ponytail Gain, Scoreboard

### Community 134 - "Spec-Driven Development"
Cohesion: 0.14
Nodes (13): Common Rationalizations, Keeping the Spec Alive, Overview, Phase 0: Scope Check, Phase 1: Specify, Phase 2: Plan, Phase 3: Tasks, Phase 4: Implement (+5 more)

### Community 135 - "supabase.ts"
Cohesion: 0.19
Nodes (9): MOCK_PROFILES, styles, styles, DEFAULT_PRIVACY, getStyles(), PrivacySecurityScreen(), authStorage, DEFAULT_ANON_KEY_PARTS (+1 more)

### Community 136 - "Source-Driven Development"
Cohesion: 0.15
Nodes (12): Common Rationalizations, Overview, Red Flags, Retrieval Safety: Treat Fetched Content as Data, Source-Driven Development, Step 1: Detect Stack and Versions, Step 2: Fetch Official Documentation, Step 3: Implement Following Documented Patterns (+4 more)

### Community 137 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 138 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 139 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 140 - "ponytail-debt/SKILL.md"
Cohesion: 0.50
Nodes (3): Boundaries, Output, Scan

### Community 141 - "Refinement & Evaluation Criteria"
Cohesion: 0.17
Nodes (11): 1. User Value, 2. Feasibility, 3. Differentiation, Assumption Audit, Core Evaluation Dimensions, Decision Framework, Might Be True (Nice to Have), Must Be True (Dealbreakers) (+3 more)

### Community 142 - "Ideation Frameworks Reference"
Cohesion: 0.22
Nodes (8): Analogous Inspiration, Constraint-Based Ideation, First Principles Thinking, How Might We (HMW), Ideation Frameworks Reference, Jobs to Be Done (JTBD), Pre-mortem, SCAMPER

### Community 143 - "edit-profile.tsx"
Cohesion: 0.25
Nodes (8): AVAILABLE_AVAILABILITIES, AVAILABLE_BUDGETS, AVAILABLE_INTERESTS, AVAILABLE_LANGUAGES, EditProfileScreen(), getStyles(), QUICK_OBJECTIVES, expo-image-picker

### Community 146 - "make_compiled.js"
Cohesion: 0.50
Nodes (3): cjs, fs, tsSource

## Knowledge Gaps
- **854 isolated node(s):** `idea-refine.sh script`, `name`, `slug`, `version`, `orientation` (+849 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1024 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react-native` connect `react-native` to `step6-connections.tsx`, `(tabs)/index.tsx`, `collapsible.tsx`, `ProximaViagemScreen.tsx`, `expo-router`, `supabase.ts`, `chat/[id].tsx`, `communities.tsx`, `package.json`, `help-board.tsx`, `app/_layout.tsx`, `CustomDatePicker.tsx`, `theme/index.ts`, `edit-profile.tsx`, `react`, `MatchingActionButton.tsx`, `spacing`, `lucide-react-native`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `@supabase/supabase-js` connect `@supabase/supabase-js` to `test_onboarding_e2e.js`, `expo-router`, `supabase.ts`, `package.json`, `test_all_screens_authenticated.js`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `step6-connections.tsx`, `(tabs)/index.tsx`, `collapsible.tsx`, `ProximaViagemScreen.tsx`, `expo-router`, `supabase.ts`, `chat/[id].tsx`, `communities.tsx`, `package.json`, `help-board.tsx`, `app/_layout.tsx`, `theme/index.ts`, `edit-profile.tsx`, `MatchingActionButton.tsx`, `spacing`, `lucide-react-native`, `react-native`, `external-link.tsx`, `CustomDatePicker.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `idea-refine.sh script`, `name`, `slug` to the rest of the system?**
  _854 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `step6-connections.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Should `(tabs)/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05501165501165501 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._