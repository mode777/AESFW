# Abstract Economic Simulation Framework

**A framework for economic city-building games very strongly inspired by the Anno series.**

It distills the core formula of the Anno games — stratified population tiers with escalating needs, multi-stage production chains, raw materials scattered across separate islands, and the logistics needed to connect them — into an abstract, theme-free, fully configurable simulation. Everything that is not load-bearing for that formula (setting, era, narrative, military, diplomacy, decoration) is removed. Islands become abstract *locations*, ships become *transport units*, population levels become *tiers*, and goods, buildings, and balancing become external configuration data.

This package contains the complete specification in [`docs/`](docs/). Four design documents (01–04) define the framework. Four implementation documents (05–08) bind it to a TypeScript implementation, a verification strategy, an equally abstract reference implementation with a minimalist browser client, and a risk-driven roadmap. The original abstract game concept (working title TIER) has been fully absorbed into them. Coding agents start with [AGENTS.md](AGENTS.md).

## Documents

1. [**01_Core_Game_Framework_GDD.md**](docs/01_Core_Game_Framework_GDD.md)  
   Defines the core design ideas (five coupled layers, one problem in four currencies, scarcity instead of conflict, pyramid rule, breadth versus depth, flow versus coverage, self-correcting failure, supported population as planning currency) and the invariant abstract mechanics: population tiers, categorized needs and satisfaction, resources, production, regions and isolated locations, exploration and establishment, logistics, exchanges with price elasticity, capabilities, construction, continuous economy and deficit resolution, transitions, unlocks, and optional modules. Includes a design element index and the reference parameter set.

2. [**02_Simulation_Architecture.md**](docs/02_Simulation_Architecture.md)  
   Defines the headless data-oriented runtime: entities, components, systems, deterministic tick order, transactions, commands, queries, owner-filtered visibility, events, persistence, replay, and tooling.

3. [**03_Content_Configuration_Specification.md**](docs/03_Content_Configuration_Specification.md)  
   Defines how a complete game is built through configuration: packages, schemas, stable IDs, composition, conditions (including sustained timers), curves, validation (including design-intent diagnostics), versioning, migration, and a minimal complete example.

4. [**04_Presentation_Integration_Contract.md**](docs/04_Presentation_Integration_Contract.md)  
   Defines full presentation decoupling: snapshots, deltas, fog-aware read models, planning metrics, domain events, commands, presentation mappings, localization, assets, resynchronization, and alternate clients.

5. [**05_Technical_Design_Specification.md**](docs/05_Technical_Design_Specification.md)  
   Binds the architecture to TypeScript: package structure and dependency rules, the purity model (functional core, imperative shell), fixed-point arithmetic, ordering, hashing, randomness, the kernel API and tick pipeline, the application layer, persistence, the content pipeline, the Web Worker and CLI hosts, the wire protocol, and amendments to 02–04.

6. [**06_Verification_Specification.md**](docs/06_Verification_Specification.md)  
   Defines requirement IDs and traceability, test levels, per-system unit testing, the invariant catalogue, property-based, determinism, replay, and persistence testing, golden scenarios, quality gates, and the mapping of every acceptance criterion to a test.

7. [**07_Reference_Implementation_and_Client_Design.md**](docs/07_Reference_Implementation_and_Client_Design.md)  
   Specifies the reference content (`ref.tier`, derived from GDD Appendix B) and the minimalist browser client: visual language, views, interaction model, client architecture, and accessibility. Both are kept strictly separate from the framework.

8. [**08_Implementation_Roadmap.md**](docs/08_Implementation_Roadmap.md)  
   A risk-driven sequence of milestones (M0–M13), each broken into OpenSpec-ready changes with capability paths, sources, dependencies, and sizes.

**AGENTS.md** contains the working rules for coding agents: document precedence, non-negotiable rules, the OpenSpec workflow, commands, and conventions.

## Core Idea

The player continuously solves one problem in four currencies — **throughput, space, workforce, and balance** — inside a closed loop of five coupled layers: stratified population → categorized needs → production chains → spatially scarce sources → logistics across isolated inventories → back to population. All tension comes from economic scarcity, never from conflict, and the simulation never ends in defeat.

## Framework Boundary

Included:

- Abstract economic simulation
- Aggregate population and tier progression with asymmetric decline
- Categorized, weighted needs and residence satisfaction
- Data-defined resources, recipes, entities, services, and capabilities
- Spatial locations with isolated inventories, regions, and disjoint distribution rules
- Exploration (fog) and establishment of new locations
- Internal throughput-limited and inter-location logistics
- Exchanges (trade without opponents) with mandatory price elasticity
- Continuous economy with maintenance while idle and deterministic deficit resolution
- Data-defined construction, transport, transitions, and unlocks
- Headless deterministic runtime
- Configurable content packages
- Fully decoupled presentation clients

Optional modules (outside the core, no feedback into it, disabled by default):

- Other owners (exclusive locations, shared exchange prices)
- Scenario objectives
- Seeded disruptions

Explicitly excluded from the core:

- Military
- Diplomacy
- Competitors as a requirement
- Missions or quests (at most the optional scenario-objective module)
- Disasters and random incidents (at most the optional disruption module)
- Decorations, attractiveness, tourism
- Items, specialists, equipment (at most modifiers)
- Narrative or historical setting
- Factions, cultures, religions, and characters
- Hard-coded technology trees
- Hard-coded content categories

## Canonical Definition

> A deterministic, headless simulation of aggregate, tiered population groups that create categorized demand and supply the capabilities and income that production requires; configurable entities transform resources through recipes; independently inventoried locations with scarce, disjointly distributed sources constrain resource availability; configurable transport processes connect those inventories; and condition-driven transitions create progression. All tension arises from economic scarcity, not conflict. All concrete content and representation are external data.
