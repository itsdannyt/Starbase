# Minecraft Survival Mechanics Reference

A comprehensive reference for the core survival loop: gathering, crafting, building, farming, and sustaining life. This document covers mechanics relevant to a 2D survival game inspired by Minecraft. Combat, enchanting, redstone, potions, and the Nether/End are excluded.

---

## 1. Day/Night Cycle

The full day/night cycle lasts **20 real-time minutes** (24,000 game ticks).

| Phase    | Duration       | Ticks         | In-Game Time    |
|----------|---------------|---------------|-----------------|
| Sunrise  | 50 seconds    | 0 - 1,000     | 06:00 - 07:00   |
| Daytime  | 9 min 10 sec  | 1,000 - 12,000| 07:00 - 18:00   |
| Sunset   | 50 seconds    | 12,000 - 13,000| 18:00 - 19:00  |
| Nighttime| 9 min 10 sec  | 13,000 - 24,000| 19:00 - 06:00  |

- **Hostile mobs spawn** when sky light drops below level 7 (around tick 13,188 in clear weather).
- **Hostile mobs burn/despawn** at sunrise when sky light returns above level 7.
- Time runs 72x faster than real time (1 real second = 72 game seconds).

---

## 2. Hunger, Saturation & Health

### The Hunger System

- **Hunger bar**: 20 points maximum (displayed as 10 drumstick icons).
- **Saturation**: Hidden value, max equals current hunger level. Depletes before hunger does.
- **Exhaustion**: Hidden accumulator. When it reaches 4.0, it resets and removes 1 saturation (or 1 hunger if saturation is 0).

### Exhaustion Costs by Action

| Action              | Exhaustion Cost      |
|---------------------|---------------------|
| Walking             | 0 (no cost)         |
| Swimming            | 0.01 per meter      |
| Breaking a block    | 0.005 per block     |
| Sprinting           | 0.1 per meter       |
| Jumping             | 0.05 per jump       |
| Sprint-jumping      | 0.2 per jump        |
| Attacking an entity | 0.1 per hit         |
| Natural health regen| 6.0 per 1 HP healed |

### Health Regeneration

| Hunger Level | Effect |
|-------------|--------|
| 20 (full) + saturation remaining | Rapid heal: 1 HP every 0.5 sec (consumes 1.5 saturation per HP) |
| 18-20 | Slow heal: 1 HP every 4 seconds |
| 7-17 | No natural healing |
| 1-6 | No healing, **cannot sprint** |
| 0 | **Starvation damage**: 1 HP every 4 seconds |

Starvation severity by difficulty:
- **Easy**: Stops at 10 HP (won't kill)
- **Normal**: Stops at 1 HP
- **Hard**: Can kill the player

### Sleep Mechanics

- **Bed recipe**: 3 Wool + 3 Planks
- Sleeping takes 5 seconds (101 ticks), then skips to sunrise.
- Sleeping sets your **respawn point** to the bed location.
- You don't have to sleep through the night -- just entering the bed briefly resets the **phantom timer**.
- **Phantoms**: If a player hasn't slept for 3 in-game days (60 real minutes), phantoms spawn at night. Touching a bed for any duration resets this timer.

---

## 3. Tool Tiers & Progression

### Tier Comparison Table

| Tier     | Durability | Mining Speed | Damage Bonus | Enchantability |
|----------|-----------|-------------|-------------|----------------|
| Wood     | 59        | 2x          | +0          | 15             |
| Gold     | 32        | 12x         | +0          | 25             |
| Stone    | 131       | 4x          | +1          | 5              |
| Iron     | 250       | 6x          | +2          | 14             |
| Diamond  | 1,561     | 8x          | +3          | 10             |
| Netherite| 2,031     | 9x          | +4          | 15             |

### Mining Level Requirements

| Mining Level | Tier Required | Blocks Unlocked |
|-------------|--------------|-----------------|
| 0 | Hand/Wood/Gold | Dirt, sand, gravel, wood, coal ore |
| 1 | Stone | Iron ore, copper ore, lapis ore |
| 2 | Iron | Gold ore, diamond ore, redstone ore, emerald ore |
| 3 | Diamond | Obsidian, ancient debris |

### Tool Crafting Recipes

All tools use **2 sticks** for the handle + material for the head:

| Tool      | Material Layout (on crafting grid)        |
|-----------|------------------------------------------|
| **Pickaxe** | 3 material across top row + 2 sticks down center |
| **Axe**     | 2 material top-left + 1 material mid-left + 2 sticks down center |
| **Shovel**  | 1 material top-center + 2 sticks down center |
| **Hoe**     | 2 material across top + 2 sticks down center |
| **Sword**   | 2 material stacked vertically + 1 stick below |

Materials per tier: Planks (wood), Cobblestone (stone), Iron Ingots (iron), Diamonds (diamond).

---

## 4. Resource Gathering Rates

### Log Breaking Times (seconds)

| Tool         | Time   |
|-------------|--------|
| Hand         | 3.0    |
| Wooden Axe   | 1.5    |
| Stone Axe    | 0.75   |
| Iron Axe     | 0.5    |
| Diamond Axe  | 0.4    |

### Stone/Cobblestone Breaking Times (seconds)

| Tool             | Stone  | Cobblestone |
|-----------------|--------|-------------|
| Hand             | 7.5    | 10.0        |
| Wooden Pickaxe   | 1.15   | 1.5         |
| Stone Pickaxe    | 0.6    | 0.75        |
| Iron Pickaxe     | 0.4    | 0.5         |
| Diamond Pickaxe  | 0.3    | 0.4         |

### Ore Breaking Times (seconds, with appropriate pickaxe)

| Ore          | Min. Tier | Wood  | Stone | Iron  | Diamond |
|-------------|-----------|-------|-------|-------|---------|
| Coal Ore     | Wood      | 2.25  | 1.15  | 0.75  | 0.6     |
| Iron Ore     | Stone     | --    | 1.15  | 0.75  | 0.6     |
| Gold Ore     | Iron      | --    | --    | 0.75  | 0.6     |
| Diamond Ore  | Iron      | --    | --    | 0.75  | 0.6     |
| Obsidian     | Diamond   | --    | --    | --    | 9.4     |

Note: Using a pickaxe below the required tier means the block drops **nothing** and takes much longer to break.

### Other Common Blocks

| Block    | Hand  | Proper Tool & Time |
|----------|-------|-------------------|
| Dirt     | 0.75s | Shovel: 0.4s (wood) to 0.15s (diamond) |
| Sand     | 0.75s | Shovel: 0.4s (wood) to 0.15s (diamond) |
| Gravel   | 0.9s  | Shovel: 0.45s (wood) to 0.2s (diamond) |
| Planks   | 3.0s  | Axe: 1.5s (wood) to 0.4s (diamond) |

---

## 5. Complete Crafting Tree

### From Logs (Raw Wood)

```
Log (1) --> Planks (4)
Planks (2) --> Sticks (4)
```

### From Planks (Wood Items)

| Recipe | Ingredients | Output |
|--------|------------|--------|
| Crafting Table | 4 Planks | 1 Crafting Table |
| Sticks | 2 Planks (vertical) | 4 Sticks |
| Wooden Tools | 2 Sticks + Planks (varies) | 1 Tool |
| Wooden Sword | 1 Stick + 2 Planks | 1 Sword |
| Chest | 8 Planks (ring) | 1 Chest |
| Door | 6 Planks (2x3) | 3 Doors |
| Trapdoor | 6 Planks (3x2) | 2 Trapdoors |
| Fence | 4 Planks + 2 Sticks | 3 Fence |
| Fence Gate | 2 Planks + 4 Sticks | 1 Fence Gate |
| Sign | 6 Planks + 1 Stick | 3 Signs |
| Boat | 5 Planks (U-shape) | 1 Boat |
| Bowl | 3 Planks (V-shape) | 4 Bowls |
| Slab | 3 Planks (horizontal) | 6 Slabs |
| Stairs | 6 Planks (stair pattern) | 4 Stairs |
| Pressure Plate | 2 Planks | 1 Pressure Plate |
| Button | 1 Plank | 1 Button |
| Ladder | 7 Sticks (H-pattern) | 3 Ladders |
| Bed | 3 Wool + 3 Planks | 1 Bed |
| Barrel | 6 Planks + 2 Slabs | 1 Barrel |
| Composter | 7 Slabs (U-shape) | 1 Composter |
| Shield | 6 Planks + 1 Iron Ingot | 1 Shield |

### From Cobblestone (Stone Items)

| Recipe | Ingredients | Output |
|--------|------------|--------|
| Furnace | 8 Cobblestone (ring) | 1 Furnace |
| Stone Tools | 2 Sticks + Cobblestone (varies) | 1 Tool |
| Stone Sword | 1 Stick + 2 Cobblestone | 1 Sword |
| Stone Slab | 3 Cobblestone | 6 Slabs |
| Stone Stairs | 6 Cobblestone | 4 Stairs |
| Stone Wall | 6 Cobblestone (2x3) | 6 Walls |
| Lever | 1 Cobblestone + 1 Stick | 1 Lever |

### From Iron Ingots

| Recipe | Ingredients | Output |
|--------|------------|--------|
| Iron Tools | 2 Sticks + Iron Ingots (varies) | 1 Tool |
| Iron Sword | 1 Stick + 2 Iron Ingots | 1 Sword |
| Bucket | 3 Iron Ingots (V-shape) | 1 Bucket |
| Iron Door | 6 Iron Ingots (2x3) | 3 Iron Doors |
| Iron Trapdoor | 4 Iron Ingots (2x2) | 1 Iron Trapdoor |
| Shield | 6 Planks + 1 Iron Ingot | 1 Shield |
| Shears | 2 Iron Ingots (diagonal) | 1 Shears |
| Flint & Steel | 1 Iron Ingot + 1 Flint | 1 Flint & Steel |
| Anvil | 3 Iron Blocks + 4 Iron Ingots | 1 Anvil |
| Cauldron | 7 Iron Ingots (U-shape) | 1 Cauldron |
| Minecart | 5 Iron Ingots (U-shape) | 1 Minecart |
| Rails | 6 Iron Ingots + 1 Stick | 16 Rails |
| Hopper | 5 Iron Ingots + 1 Chest | 1 Hopper |
| Iron Bars | 6 Iron Ingots (2x3) | 16 Iron Bars |
| Iron Nugget | 1 Iron Ingot | 9 Iron Nuggets |
| Lantern | 8 Iron Nuggets + 1 Torch | 1 Lantern |
| Chain | 2 Iron Nuggets + 1 Iron Ingot | 1 Chain |

**Armor (Iron):**
| Piece | Iron Ingots Required |
|-------|---------------------|
| Helmet | 5 |
| Chestplate | 8 |
| Leggings | 7 |
| Boots | 4 |
| **Full Set** | **24 total** |

### Light Sources

| Recipe | Ingredients | Output |
|--------|------------|--------|
| Torch | 1 Stick + 1 Coal/Charcoal | 4 Torches |
| Lantern | 8 Iron Nuggets + 1 Torch | 1 Lantern |
| Campfire | 3 Logs + 2 Sticks + 1 Coal/Charcoal | 1 Campfire |
| Jack o'Lantern | 1 Carved Pumpkin + 1 Torch | 1 Jack o'Lantern |

Light levels emitted:
- Torch: 14
- Lantern: 15
- Campfire: 15
- Jack o'Lantern: 15
- Furnace (active): 13

### Utility Blocks

| Block | Recipe | Function |
|-------|--------|----------|
| **Crafting Table** | 4 Planks | 3x3 crafting grid |
| **Furnace** | 8 Cobblestone | Smelts ores, cooks food (10 sec/item) |
| **Smoker** | 4 Logs + 1 Furnace | Cooks food 2x faster (5 sec/item), food only |
| **Blast Furnace** | 5 Iron Ingots + 3 Smooth Stone + 1 Furnace | Smelts ores 2x faster, ores/metals only |
| **Campfire** | 3 Logs + 2 Sticks + 1 Coal | Cooks 4 items at once, 30 sec each, no fuel needed |
| **Chest** | 8 Planks | 27 slots of storage |
| **Barrel** | 6 Planks + 2 Slabs | 27 slots of storage (opens even with block above) |
| **Composter** | 7 Wooden Slabs | Converts plant matter into bone meal |
| **Bed** | 3 Wool + 3 Planks | Sleep, set spawn point |

### Smelting Recipes (Furnace)

| Input | Output | Notes |
|-------|--------|-------|
| Raw Iron Ore | Iron Ingot | Requires stone+ pickaxe to mine |
| Raw Gold Ore | Gold Ingot | Requires iron+ pickaxe to mine |
| Log/Wood | Charcoal | Alternative to coal for torches |
| Cobblestone | Stone | Smooth building material |
| Sand | Glass | Transparent building block |
| Clay Ball | Brick | Building material |
| Raw Beef | Steak | Best food in game |
| Raw Porkchop | Cooked Porkchop | Tied with steak for best food |
| Raw Chicken | Cooked Chicken | Removes food poisoning risk |
| Raw Mutton | Cooked Mutton | Good food source |
| Raw Cod/Salmon | Cooked Cod/Salmon | Fish food |
| Potato | Baked Potato | Good crop-based food |
| Cactus | Green Dye | Decoration |
| Wet Sponge | Dry Sponge | Utility |

**Fuel burn times:**
| Fuel | Burn Time | Items Smelted |
|------|-----------|--------------|
| Wooden Slab | 7.5 sec | 0.75 |
| Stick | 5 sec | 0.5 |
| Plank | 15 sec | 1.5 |
| Log | 15 sec | 1.5 |
| Coal/Charcoal | 80 sec | 8 |
| Block of Coal | 800 sec | 80 |
| Lava Bucket | 1000 sec | 100 |

---

## 6. Food & Cooking

### Food Values Table

#### Cooked Meats (Best Foods)

| Food | Hunger Restored | Saturation | Source |
|------|----------------|-----------|--------|
| Steak | 8 | 12.8 | Cook raw beef |
| Cooked Porkchop | 8 | 12.8 | Cook raw porkchop |
| Cooked Mutton | 6 | 9.6 | Cook raw mutton |
| Cooked Salmon | 6 | 9.6 | Cook raw salmon |
| Cooked Chicken | 6 | 7.2 | Cook raw chicken |
| Cooked Cod | 5 | 6.0 | Cook raw cod |
| Cooked Rabbit | 5 | 6.0 | Cook raw rabbit |

#### Crafted Foods

| Food | Hunger Restored | Saturation | Recipe |
|------|----------------|-----------|--------|
| Rabbit Stew | 10 | 12.0 | Cooked Rabbit + Carrot + Baked Potato + Mushroom + Bowl |
| Bread | 5 | 6.0 | 3 Wheat |
| Baked Potato | 5 | 6.0 | Smelt a Potato |
| Mushroom Stew | 6 | 7.2 | Red Mushroom + Brown Mushroom + Bowl |
| Beetroot Soup | 6 | 7.2 | 6 Beetroot + Bowl |
| Golden Carrot | 6 | 14.4 | Carrot + 8 Gold Nuggets |
| Cake | 14 total (7 slices x 2) | 2.8/slice | 3 Wheat + 3 Milk + 2 Sugar + 1 Egg |
| Cookie | 2 | 0.4 | 2 Wheat + 1 Cocoa Beans (makes 8) |
| Pumpkin Pie | 8 | 4.8 | Pumpkin + Sugar + Egg |

#### Raw/Gathered Foods

| Food | Hunger Restored | Saturation | Notes |
|------|----------------|-----------|-------|
| Apple | 4 | 2.4 | Drops from oak/dark oak leaves |
| Golden Apple | 4 | 9.6 | Apple + 8 Gold Ingots; gives Regen II + Absorption |
| Melon Slice | 2 | 1.2 | From melon blocks |
| Sweet Berries | 2 | 1.2 | Found in taiga biomes |
| Dried Kelp | 1 | 0.6 | Smelt kelp |
| Carrot | 3 | 3.6 | Found in villages, dropped by zombies |
| Beetroot | 1 | 1.2 | Found in villages |

#### Raw Meats (Emergency Food)

| Food | Hunger Restored | Saturation | Risk |
|------|----------------|-----------|------|
| Raw Beef | 3 | 1.8 | None |
| Raw Porkchop | 3 | 1.8 | None |
| Raw Rabbit | 3 | 1.8 | None |
| Raw Chicken | 2 | 1.2 | 30% chance of Hunger effect (30s) |
| Raw Cod | 2 | 0.4 | None |
| Raw Salmon | 2 | 0.4 | None |

### Cooking Methods Comparison

| Method | Speed | Capacity | Fuel Required |
|--------|-------|----------|--------------|
| Furnace | 10 sec/item | 1 at a time | Yes |
| Smoker | 5 sec/item | 1 at a time | Yes (food only) |
| Campfire | 30 sec/item | 4 simultaneously | No |

---

## 7. Farming Mechanics

### Setting Up a Farm

1. **Create farmland**: Use a hoe on dirt/grass blocks.
2. **Hydrate**: Place water within 4 blocks horizontally (including diagonally) of farmland.
3. **Plant**: Use seeds/crops on farmland.
4. **Light**: Crops need light level 9+ to grow (sunlight or torches).

### Crop Growth Details

| Crop | Stages | Planted With | Harvest Yield | Seed Source |
|------|--------|-------------|---------------|-------------|
| Wheat | 8 (0-7) | Wheat Seeds | 1 Wheat + 1-4 Seeds | Break tall grass |
| Carrots | 8 (0-7) | Carrot | 1-4 Carrots | Villages, zombie drops |
| Potatoes | 8 (0-7) | Potato | 1-4 Potatoes (+2% poisonous) | Villages, zombie drops |
| Beetroot | 4 (0-3) | Beetroot Seeds | 1 Beetroot + 1-4 Seeds | Villages, mineshaft chests |

### Growth Speed Factors

- **Hydrated farmland**: 4 base speed points (vs 2 for dry).
- **Neighboring farmland**: +0.75 per hydrated neighbor, +0.25 per dry neighbor.
- **Row planting**: Alternating crop types in rows avoids the speed penalty from adjacent same-crops.
- **Light**: Must be level 9+ or growth stops entirely.

### Growth Timing

- Each growth stage: **5 minutes (ideal) to 35 minutes (worst case)**.
- Full growth (8 stages, optimal): approximately **31 minutes**.
- Random tick driven: a block gets a random tick on average every **68.27 seconds** (Java Edition).

### Optimal Farm Layout

The classic layout: **9x9 farmland square** with center block replaced by water.
- Provides 80 farmland blocks, all within 4 blocks of water.
- Alternating rows of different crops maximizes growth rate.
- Requires about 40 fence pieces to fully enclose.

### Farmland Mechanics

- **Hydration**: Water within 4 blocks horizontally, same level or 1 above.
- **Reversion to dirt**: Dry farmland with no crop reverts to dirt. Also reverts if jumped on or if a mob walks on it.
- **Trampling**: Jumping/falling on farmland destroys it back to dirt and uproots the crop.

---

## 8. Building & Structures

### Essential Survival Structures

| Structure | Purpose | Key Materials |
|-----------|---------|---------------|
| **Starter Shelter** | Survive first night | Dirt, wood, cobblestone |
| **Storage Room** | Organize items | Chests, signs, torches |
| **Mine Entrance** | Access underground resources | Cobblestone, ladders, torches |
| **Farm** | Renewable food | Hoe, water bucket, seeds, fences |
| **Animal Pen** | Breed animals for meat/wool | Fences, fence gates, wheat/seeds/carrots |
| **Smelting Area** | Process ores and cook food | Furnaces, smokers, chests |
| **Bedroom** | Set spawn, skip night | Bed, torches, walls |

### First Shelter Priorities

1. Walls and roof (any solid block -- dirt works in emergencies)
2. Door or sealed entrance
3. Light source inside (torches prevent mob spawning; mobs spawn at light level 0 in Java 1.18+)
4. Bed
5. Crafting table and furnace
6. Chest for storage

### Mob Spawning Prevention

- Hostile mobs spawn on solid blocks at **light level 0** (Java 1.18+) or **light level 7 or below** (older versions/Bedrock).
- Torches (light 14) illuminate an area of roughly 14 blocks radius.
- Half-slabs on the top half of a block prevent spawning on that block.
- Transparent blocks (glass, leaves) prevent spawning.

---

## 9. The Early Game Loop

### Day 1 (First 10 real-time minutes)

**Minutes 0-2: Wood Collection**
1. Find nearest tree, punch it to collect 5-8 logs.
2. Open inventory, convert logs to planks (1 log = 4 planks).
3. Craft a crafting table (4 planks).
4. Craft sticks (2 planks = 4 sticks).
5. Craft a wooden pickaxe (3 planks + 2 sticks).
6. Craft a wooden axe (3 planks + 2 sticks).

**Minutes 2-4: Stone Acquisition**
1. Dig into nearest hillside or dig down 2-3 blocks to reach stone.
2. Mine ~20 cobblestone with wooden pickaxe.
3. Craft stone pickaxe, stone axe, stone shovel.
4. Craft a furnace (8 cobblestone).

**Minutes 4-6: Food & Wool**
1. Kill nearby animals (sheep give wool + mutton, cows give beef + leather).
2. Collect at least 3 wool for a bed (kill 3 sheep or use shears).
3. Gather 10+ raw meat.

**Minutes 6-8: Shelter Construction**
1. Find or create a small enclosed space (dig into hillside or build 5x5 walls).
2. Place crafting table, furnace, bed inside.
3. Start cooking meat in furnace (use planks/logs as fuel initially).
4. Craft torches: smelt a log into charcoal, then charcoal + stick = 4 torches.
5. Light up shelter interior.

**Minutes 8-10: Nightfall**
1. Sleep in bed to skip night and set spawn point.
2. If no bed: stay inside, smelt resources, organize inventory.

### Day 2 (Minutes 10-20)

1. Continue gathering wood (20+ logs).
2. Craft a chest for storage (8 planks).
3. Begin mining for iron: dig staircase mine downward.
4. Coal ore appears commonly -- mine for torches.
5. Iron ore requires stone pickaxe or better. Smelt raw iron into ingots.
6. Target: 10-20 iron ingots for iron tools + bucket.

### Day 3 (Minutes 20-30)

1. Craft iron pickaxe, iron sword, iron axe.
2. Craft a bucket (3 iron ingots) -- essential for farming.
3. Start a wheat farm: break grass for seeds, hoe dirt, place water.
4. Build fences for an animal pen, lure animals with wheat/carrots/seeds.
5. Expand shelter into a proper base.
6. Begin branch mining at Y=11 (or Y=-59 in 1.18+) for diamonds.

### Day 4+ (Established Gameplay Loop)

1. Mine deeper for diamonds (need 11 for full tool set + enchanting table).
2. Expand farms, breed animals for sustainable food.
3. Build larger structures: storage room, dedicated smelting room.
4. Improve lighting and defenses around base.
5. Explore for villages (trading), temples (loot), and other structures.

---

## 10. Key Numeric Summary

### Items Needed for Common Goals

| Goal | Materials Required |
|------|-------------------|
| First crafting table | 4 planks (1 log) |
| First wooden pickaxe | 3 planks + 2 sticks (2 logs total) |
| Full stone tool set (pick+axe+shovel+hoe+sword) | 11 cobblestone + 8 sticks |
| Furnace | 8 cobblestone |
| Chest | 8 planks (2 logs) |
| Bed | 3 wool + 3 planks |
| 4 Torches | 1 coal/charcoal + 1 stick |
| Full iron tool set | 11 iron ingots + 8 sticks |
| Full iron armor | 24 iron ingots |
| Bucket | 3 iron ingots |
| Lantern | 8 iron nuggets (< 1 ingot) + 1 torch |

### Logs to Everything (First Day Economy)

Starting from raw logs, here's what you need:
- **1 log** = 4 planks
- **2 planks** = 4 sticks
- **Crafting table**: 1 log
- **Wooden pickaxe**: 0.75 logs (3 planks) + 1 stick = ~1 log
- **4 torches**: 1 log (smelt to charcoal) + 0.5 plank (1 stick) + fuel
- **Chest**: 2 logs (8 planks)
- **Total for minimum Day 1 setup**: ~8-10 logs

---

## Sources

- [Hunger / Food Mechanics - Minecraft Wiki](https://minecraft.wiki/w/Hunger)
- [Food - Minecraft Wiki](https://minecraft.wiki/w/Food)
- [Daylight Cycle - Minecraft Wiki](https://minecraft.wiki/w/Daylight_cycle)
- [Tiers - Minecraft Wiki](https://minecraft.wiki/w/Tiers)
- [Breaking - Minecraft Wiki](https://minecraft.wiki/w/Breaking)
- [Pickaxe - Minecraft Wiki](https://minecraft.wiki/w/Pickaxe)
- [Axe - Minecraft Wiki](https://minecraft.wiki/w/Axe)
- [Log - Minecraft Wiki](https://minecraft.wiki/w/Log)
- [Crafting - Minecraft Wiki](https://minecraft.wiki/w/Crafting)
- [Tutorial: Crop Farming - Minecraft Wiki](https://minecraft.wiki/w/Tutorial:Crop_farming)
- [Tutorial: Beginner's Guide - Minecraft Wiki](https://minecraft.wiki/w/Tutorial:Beginner%27s_guide)
- [Campfire - Minecraft Wiki](https://minecraft.wiki/w/Campfire)
- [Smoker - Minecraft Wiki](https://minecraft.wiki/w/Smoker)
- [Furnace - Minecraft Wiki](https://minecraft.wiki/w/Furnace)
- [Bed - Minecraft Wiki](https://minecraft.wiki/w/Bed)
- [Planks - Minecraft Wiki](https://minecraft.wiki/w/Planks)
- [Stick - Minecraft Wiki](https://minecraft.wiki/w/Stick)
- [Iron Ingot - Minecraft Wiki](https://minecraft.wiki/w/Iron_Ingot)
- [Durability - Minecraft Wiki](https://minecraft.wiki/w/Durability)
