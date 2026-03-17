# Starbase Crafting Overhaul — Design Document

## Philosophy

Take Minecraft's proven survival loop — gather → craft tools → build shelter → farm → thrive — and adapt it to Starbase's context: a solo AI agent on a small floating island, no combat, spectator experience. The LLM decides strategy; the rules enforce what's physically possible.

**What we keep from Minecraft:**
- Tool progression (bare hands → wood tools → stone tools)
- Crafting dependencies (need workbench before advanced crafts)
- Hunger/energy drain rates that scale with activity
- Farming requires setup (hoe farmland, water proximity)
- Cooking makes food better

**What we drop:**
- Combat, armor, weapons, mobs
- Mining underground (no caves — it's a floating island)
- Iron/diamond/netherite tiers (no ore on surface island)
- Redstone, enchanting, potions
- Multiplayer mechanics

**What we adapt:**
- Minecraft's 20-minute day → Starbase's existing day/night cycle
- 3D block placement → 2D isometric tile placement
- Player inventory grid → simple resource counts
- Health + hunger → hunger + energy (already exists)

---

## Resources

### Current Resources (keep)
| Resource | Source | Gathering |
|----------|--------|-----------|
| **Wood** | Trees | Chop (hands or axe) |
| **Stone** | Stone deposits | Mine (hands or pickaxe) |
| **Food** | Berry bushes, farms, cooking | Gather, harvest, cook |

### New Resources
| Resource | Source | Use |
|----------|--------|-----|
| **Fiber** | Tall grass tiles (new tile type) | Rope, bedding, farming |
| **Planks** | Crafted from wood (1 wood → 2 planks) | Building, furniture |
| **Sticks** | Crafted from planks (1 plank → 2 sticks) | Tool handles, fences |
| **Clay** | Near water tiles | Bricks, pots |
| **Charcoal** | Cook wood in campfire/furnace | Torches, fuel |

### Resource Conversion Chain (inspired by Minecraft)
```
Tree → Wood (raw logs)
  Wood → Planks (1:2)
    Planks → Sticks (1:2)
  Wood → Charcoal (via campfire/furnace, 1:1)

Stone deposit → Stone (raw)
  Stone → Cut Stone (via workshop, for better buildings)

Berry bush → Berries (raw food, low nutrition)
  Berries → Jam (via campfire, better nutrition)

Grass tile → Fiber
  Fiber → Rope (2 fiber → 1 rope)

Water-adjacent dirt → Clay
  Clay → Bricks (via furnace, 1:1)
```

---

## Tool Progression

Inspired by Minecraft's wood → stone → iron, but we stop at stone (no ore on island).

### Bare Hands (starting)
- Chop trees: slow (6 ticks)
- Mine stone: very slow (8 ticks)
- Gather fiber: normal (2 ticks)
- Gather berries: normal (3 ticks)

### Wooden Tools (need workbench)
| Tool | Recipe | Effect |
|------|--------|--------|
| Wooden Axe | 3 planks + 2 sticks | Chop trees: 4 ticks (33% faster) |
| Wooden Pickaxe | 3 planks + 2 sticks | Mine stone: 5 ticks (37% faster) |
| Wooden Hoe | 2 planks + 2 sticks | Can create farmland tiles |

### Stone Tools (need workbench)
| Tool | Recipe | Effect |
|------|--------|--------|
| Stone Axe | 3 stone + 2 sticks | Chop trees: 2 ticks (67% faster than hands) |
| Stone Pickaxe | 3 stone + 2 sticks | Mine stone: 3 ticks (62% faster than hands) |
| Stone Hoe | 2 stone + 2 sticks | Create farmland faster, better harvest yield |

### Tool Durability
- Wooden tools: ~20 uses
- Stone tools: ~50 uses
- Agent auto-crafts replacement when tool breaks (if resources available)
- LLM can decide to pre-craft spares

---

## Crafting System

### How Crafting Works
- Agent needs to be at a workbench (or carrying a portable one) for most recipes
- Simple recipes (planks from wood, sticks from planks) can be done anywhere
- The LLM sees available recipes based on what the agent has unlocked
- Crafting takes time (ticks), not instant

### Recipe List

#### Anywhere Recipes (no station needed)
| Item | Ingredients | Ticks | Notes |
|------|------------|-------|-------|
| Planks | 1 wood | 1 | Basic processing |
| Sticks | 1 plank | 1 | For tools and building |
| Rope | 2 fiber | 2 | For building, fishing |

#### Workbench Recipes
| Item | Ingredients | Ticks | Notes |
|------|------------|-------|-------|
| Wooden Axe | 3 planks + 2 sticks | 3 | Faster tree chopping |
| Wooden Pickaxe | 3 planks + 2 sticks | 3 | Faster stone mining |
| Wooden Hoe | 2 planks + 2 sticks | 3 | Create farmland |
| Stone Axe | 3 stone + 2 sticks | 4 | Best tree chopping |
| Stone Pickaxe | 3 stone + 2 sticks | 4 | Best stone mining |
| Stone Hoe | 2 stone + 2 sticks | 4 | Better farming |
| Chest | 4 planks | 5 | Storage structure |
| Fence section | 2 planks + 2 sticks | 2 | Enclosure for farms |
| Door | 3 planks | 3 | For shelter |
| Torch | 1 stick + 1 charcoal | 1 | Light source |

#### Campfire Recipes (cooking)
| Item | Ingredients | Ticks | Notes |
|------|------------|-------|-------|
| Cooked Berries/Jam | 2 berries | 4 | Restores more hunger |
| Charcoal | 1 wood | 5 | For torches |
| Dried Fish | 1 raw fish | 4 | If we add fishing |

#### Furnace Recipes (advanced cooking/processing)
| Item | Ingredients | Ticks | Notes |
|------|------------|-------|-------|
| Bricks | 1 clay | 6 | Strong building material |
| Cut Stone | 1 stone | 6 | Better building material |
| Bread | 3 wheat | 4 | Good food, from farming |

---

## Buildings & Structures

### Progression (replaces current hardcoded buildings)

The order below is a natural progression, but the LLM decides when/if to build each one. Dependencies are enforced by resource requirements and prerequisites.

#### Tier 0 — No Station Needed
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Campfire** | 3 wood + 2 stone | 1×1 | Cook food, light at night, warmth (slows energy drain at night) |
| **Lean-to** | 5 wood + 3 fiber | 1×2 | Basic sleeping spot, slightly better than ground (energy +30) |

#### Tier 1 — Requires Campfire (knowledge trigger)
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Workbench** | 4 planks | 1×1 | Unlocks tool crafting and advanced recipes |
| **Drying Rack** | 4 sticks + 2 rope | 1×1 | Preserve food (food items last longer) |

#### Tier 2 — Requires Workbench
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Shelter** | 10 planks + 6 stone + 1 door | 2×2 | Proper sleeping (energy +50), rain protection |
| **Chest** | 4 planks | 1×1 | Increases max inventory capacity |
| **Fence** | 2 planks + 2 sticks (per section) | 1×1 | Enclose areas |

#### Tier 3 — Requires Shelter
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Bed** | 4 planks + 3 fiber | 1×1 | Best sleep (energy +60), inside shelter |
| **Furnace** | 8 stone | 1×1 | Advanced cooking, brick making, smelting |
| **Farm Plot** | hoe + 5 planks + rope | 2×3 | Grow wheat, needs water nearby |
| **Well** | 8 stone + 2 rope | 1×2 | Water source, hydrates nearby farm plots |

#### Tier 4 — Requires Furnace
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Stone House** | 20 cut stone + 8 planks + door | 3×3 | Upgraded shelter, more durable |
| **Smokehouse** | 6 bricks + 4 planks | 2×1 | Cook food 2x faster than campfire |
| **Storage Shed** | 12 planks + 4 stone + 2 chests | 2×2 | Large storage |

#### Tier 5 — Late Game
| Structure | Recipe | Size | Effect |
|-----------|--------|------|--------|
| **Workshop** | 10 cut stone + 12 planks + workbench | 3×2 | Stone tools last 2x longer |
| **Garden** | 8 planks + 4 rope + fertile soil | 3×2 | Grow berries/herbs |
| **Stone Walls** | 3 cut stone per section | 1×1 | Fortification, aesthetics |
| **Lookout Post** | 15 planks + 8 stone | 2×2 | Reveals nearby fog (smaller than old watchtower) |

---

## Hunger & Energy System (adapted from Minecraft)

### Current System (what changes)
- Hunger: 0-100, drains over time → **keep, but drain varies by activity**
- Energy: 0-100, drains over time → **keep, but restore varies by sleep quality**

### Activity-Based Drain (inspired by Minecraft's exhaustion)
| Activity | Hunger Drain/tick | Energy Drain/tick |
|----------|------------------|-------------------|
| Idle/standing | 0.10 | 0.05 |
| Walking | 0.15 | 0.10 |
| Chopping (hands) | 0.30 | 0.25 |
| Chopping (axe) | 0.20 | 0.15 |
| Mining (hands) | 0.35 | 0.30 |
| Mining (pickaxe) | 0.25 | 0.20 |
| Building | 0.25 | 0.20 |
| Farming | 0.20 | 0.15 |
| Sleeping | 0.10 | -0.50 (restores) |

### Food Quality (inspired by Minecraft's hunger + saturation)
| Food | Hunger Restored | Saturation (slows next drain) |
|------|----------------|-------------------------------|
| Raw berries | +15 | Low (drains again quickly) |
| Cooked berries/jam | +25 | Medium |
| Raw wheat | +10 | Low |
| Bread | +30 | High (lasts a while) |
| Cooked fish | +25 | Medium |
| Stew (berries + wheat + water) | +40 | High |

### Sleep Quality
| Sleep Location | Energy Restored | Time to Sleep |
|---------------|----------------|---------------|
| Ground | +20 | 15 ticks |
| Lean-to | +30 | 12 ticks |
| Shelter (no bed) | +40 | 12 ticks |
| Bed in shelter | +60 | 10 ticks |

### Night Penalties
- Energy drain 1.5x at night (same as current)
- Without light source nearby: hunger drain 1.3x (cold/stress)
- Campfire or torch nearby: normal drain rates at night

---

## Discovery System (revised)

Instead of arbitrary tick-count triggers, discoveries happen through **natural gameplay** like Minecraft's progression.

| Discovery | Trigger | Unlocks |
|-----------|---------|---------|
| Edible Berries | Walk near berry bush | Gather berries |
| Wood Harvesting | Walk near tree + be hungry/shelterless | Chop trees |
| Stone Knowledge | Chop 3 trees (realizes need for harder material) | Mine stone |
| Fire Making | Have wood + stone (striking sparks idea) | Build campfire |
| Crafting | Build campfire (realizes can shape materials) | Planks, sticks recipes |
| Tool Making | Craft planks + sticks (sees potential) | Build workbench |
| Fiber Gathering | Walk over grass tiles 5+ times | Gather fiber |
| Shelter Concept | Sleep on ground 2+ times + have workbench | Build shelter |
| Farming Concept | Gather berries 5+ times + have shelter | Build farm, craft hoe |
| Cooking | Have campfire + raw food | Cook food |
| Masonry | Have furnace + clay | Make bricks, cut stone |

---

## The LLM's Decision Space

With this system, the LLM sees prompts like:

```
BODY: Hunger 45/100, Energy 62/100
CARRYING: 8 wood, 3 stone, 4 planks, 2 sticks, 3 berries, 1 rope
TOOLS: wooden axe (12/20 durability)
TIME: Day 3, night
STRUCTURES: campfire, workbench, lean-to
NEARBY: 5 trees, 2 berry bushes, 3 stone deposits, grass patches

AVAILABLE CRAFTS:
- stone axe (3 stone + 2 sticks, at workbench)
- stone pickaxe (3 stone + 2 sticks, at workbench)
- shelter (10 planks + 6 stone + 1 door, needs workbench)
- door (3 planks, at workbench)
- torch (1 stick + 1 charcoal)
- cook berries (2 berries, at campfire)

PAST LIVES:
- "Died on day 2 from hunger. Should stockpile food before building."

What do you do?
```

The LLM might decide:
- "It's night, I should sleep in my lean-to"
- "My axe is almost broken, craft a stone axe first"
- "Cook these berries before sleeping — better hunger restoration"
- "I need 10 planks for a shelter, I have 4, so chop more trees tomorrow"

Every decision is **its own**, but constrained by real rules.

---

## What Changes in Code

### New/Modified Files
1. **`js/constants.js`** — New resource types, tile types (grass/clay), building types
2. **`js/crafting.js`** (NEW) — Recipe definitions, crafting logic, tool durability
3. **`js/actions.js`** — Rewrite to use new resource system, tool-speed modifiers
4. **`js/planner.js`** — Update goals to work with crafting tree
5. **`js/brain.js`** — Revised discovery triggers
6. **`js/agent.js`** — Expanded inventory (planks, sticks, fiber, clay, tools), tool tracking
7. **`js/world.js`** — New tile types (tall grass, clay deposits), generation tweaks
8. **`js/renderer.js`** — Draw new tiles, buildings, tools
9. **`js/llm-planner.js`** — Expanded prompt with crafting options, tool status
10. **`js/memory.js`** — Track crafting milestones

### Migration Strategy
- Phase 1: Add new resources + crafting system alongside existing
- Phase 2: Convert existing buildings to new recipe system
- Phase 3: Add tool progression
- Phase 4: Rebalance hunger/energy with activity-based drain
- Phase 5: Update LLM prompts with crafting info
- Phase 6: Polish renderer for new items

---

## Open Questions

1. **Fishing?** Island surrounded by water — fishing rod (sticks + rope) could be a food source. Adds gameplay variety.
2. **Weather?** Rain could hydrate farms automatically, but drain energy faster without shelter. Adds environmental pressure.
3. **Seasons?** Berry bushes only produce in certain seasons, forcing reliance on farming. Might be too complex.
4. **Multiple islands?** Build a bridge or raft to reach nearby islands with different resources. Very ambitious.
5. **Animal husbandry?** Even simple (chickens for eggs) adds a lot. Probably a future expansion.
