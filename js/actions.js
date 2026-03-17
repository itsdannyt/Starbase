var SB = window.Starbase = window.Starbase || {};

// Each action: { name, preconditions(agent, world), effects(agent, world), cost, duration, description }
SB.Actions = {
    // Workshop speed bonus tracking
    hasWorkshop: false,

    _getDuration: function(base) {
        return this.hasWorkshop ? Math.ceil(base * 0.67) : base;
    },

    all: function() {
        // Update workshop status
        this.hasWorkshop = SB.World && SB.World.hasBuilding(SB.BuildingTypes.WORKSHOP);
        return [
            this.eat,
            this.gatherBerries,
            this.gatherFiber,
            this.chopTree,
            this.mineStone,
            this.buildCampfire,
            this.buildWorkbench,
            this.buildShelter,
            this.buildBed,
            this.buildFurnace,
            this.buildSmokehouse,
            this.sleep,
            this.sleepOnGround,
            this.buildFarm,
            this.harvestFarm,
            this.buildStorage,
            this.buildWell,
            this.buildWorkshop,
            this.buildWall,
            this.craftWoodAxe,
            this.craftWoodPickaxe,
            this.craftHoe,
            this.craftStoneAxe,
            this.craftStonePickaxe,
            this.explore,
        ];
    },

    eat: {
        name: 'eat',
        description: 'Eating food',
        duration: 2,
        cost: 1,
        preconditions: function(agent) {
            return agent.inventory.food > 0;
        },
        effects: function(agent, world) {
            agent.inventory.food--;
            var bonus = 25;
            if (world.isBuildingNear(SB.BuildingTypes.FURNACE, agent.x, agent.y, 2) ||
                world.isBuildingNear(SB.BuildingTypes.SMOKEHOUSE, agent.x, agent.y, 2)) {
                bonus = 45;
            } else if (world.isBuildingNear(SB.BuildingTypes.CAMPFIRE, agent.x, agent.y, 2)) {
                bonus = 35;
            }
            agent.hunger = SB.Utils.clamp(agent.hunger + bonus, 0, 100);
        },
        getTarget: function(agent, world) {
            var furnace = world.getBuilding(SB.BuildingTypes.FURNACE);
            if (furnace) return { x: furnace.x, y: furnace.y };
            var smokehouse = world.getBuilding(SB.BuildingTypes.SMOKEHOUSE);
            if (smokehouse) return { x: smokehouse.x, y: smokehouse.y };
            var campfire = world.getBuilding(SB.BuildingTypes.CAMPFIRE);
            if (campfire) return { x: campfire.x, y: campfire.y };
            return null;
        },
    },

    gatherBerries: {
        name: 'gatherBerries',
        description: 'Gathering berries',
        get duration() { return SB.Actions._getDuration(3); },
        cost: 2,
        preconditions: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount > 0; }
            ) !== null;
        },
        effects: function(agent, world) {
            var tile = world.getTile(agent.x, agent.y);
            if (tile && tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount > 0) {
                tile.resourceAmount--;
                agent.inventory.food += 2;
                if (tile.resourceAmount <= 0) {
                    tile.growthTimer = 60;
                }
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount > 0; }
            );
        },
    },

    gatherFiber: {
        name: 'gatherFiber',
        description: 'Gathering fiber',
        get duration() { return SB.Actions._getDuration(2); },
        cost: 1,
        preconditions: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.TALL_GRASS && tile.resourceAmount > 0; }
            ) !== null;
        },
        effects: function(agent, world) {
            var tile = world.getTile(agent.x, agent.y);
            if (tile && tile.resource === SB.Resources.TALL_GRASS && tile.resourceAmount > 0) {
                tile.resourceAmount--;
                agent.inventory.fiber += 2;
                if (tile.resourceAmount <= 0) {
                    tile.growthTimer = 40;
                }
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.TALL_GRASS && tile.resourceAmount > 0; }
            );
        },
    },

    chopTree: {
        name: 'chopTree',
        description: 'Chopping wood',
        get duration() {
            var base = 6;
            if (SB.Agent && SB.Agent.axeTier >= 2) base = 2;
            else if (SB.Agent && SB.Agent.axeTier >= 1) base = 4;
            return SB.Actions._getDuration(base);
        },
        cost: 2,
        preconditions: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.TREE && tile.resourceAmount > 0; }
            ) !== null;
        },
        effects: function(agent, world) {
            var tile = world.getTile(agent.x, agent.y);
            if (tile && tile.resource === SB.Resources.TREE) {
                tile.resourceAmount--;
                agent.inventory.wood += 2;
                if (tile.resourceAmount <= 0) {
                    tile.resource = null;
                    tile.growthTimer = 150;
                }
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.TREE && tile.resourceAmount > 0; }
            );
        },
    },

    mineStone: {
        name: 'mineStone',
        description: 'Mining stone',
        get duration() {
            var base = 8;
            if (SB.Agent && SB.Agent.pickaxeTier >= 2) base = 3;
            else if (SB.Agent && SB.Agent.pickaxeTier >= 1) base = 5;
            return SB.Actions._getDuration(base);
        },
        cost: 3,
        preconditions: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.STONE && tile.resourceAmount > 0; }
            ) !== null;
        },
        effects: function(agent, world) {
            var tile = world.getTile(agent.x, agent.y);
            if (tile && tile.resource === SB.Resources.STONE) {
                tile.resourceAmount--;
                agent.inventory.stone += 1;
                if (tile.resourceAmount <= 0) {
                    tile.resource = null;
                    tile.type = SB.Tiles.DIRT;
                }
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.STONE && tile.resourceAmount > 0; }
            );
        },
    },

    buildCampfire: {
        name: 'buildCampfire',
        description: 'Building campfire',
        duration: 6,
        cost: 3,
        preconditions: function(agent, world) {
            return agent.inventory.wood >= 3 &&
                   agent.inventory.stone >= 2 &&
                   !world.hasBuilding(SB.BuildingTypes.CAMPFIRE);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 3;
            agent.inventory.stone -= 2;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.CAMPFIRE, spot.x, spot.y, 1, 1);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
        },
    },

    buildWorkbench: {
        name: 'buildWorkbench',
        description: 'Building workbench',
        duration: 5,
        cost: 2,
        preconditions: function(agent, world) {
            return agent.inventory.wood >= 5 &&
                   !world.hasBuilding(SB.BuildingTypes.WORKBENCH);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 5;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.WORKBENCH, spot.x, spot.y, 1, 1);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
        },
    },

    buildShelter: {
        name: 'buildShelter',
        description: 'Building shelter',
        duration: 12,
        cost: 5,
        preconditions: function(agent, world) {
            return agent.inventory.wood >= 10 &&
                   agent.inventory.stone >= 6 &&
                   world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   !world.hasBuilding(SB.BuildingTypes.SHELTER);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 10;
            agent.inventory.stone -= 6;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 2);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.SHELTER, spot.x, spot.y, 2, 2);
                agent.hasShelter = true;
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 2);
        },
    },

    buildBed: {
        name: 'buildBed',
        description: 'Building bed',
        duration: 6,
        cost: 3,
        preconditions: function(agent, world) {
            return agent.hasShelter &&
                   agent.inventory.wood >= 4 &&
                   agent.inventory.fiber >= 3 &&
                   !world.hasBuilding(SB.BuildingTypes.BED);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 4;
            agent.inventory.fiber -= 3;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.BED, spot.x, spot.y, 1, 1);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
        },
    },

    buildFurnace: {
        name: 'buildFurnace',
        description: 'Building furnace',
        duration: 8,
        cost: 4,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.stone >= 8 &&
                   !world.hasBuilding(SB.BuildingTypes.FURNACE);
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 8;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.FURNACE, spot.x, spot.y, 1, 1);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 1);
        },
    },

    buildSmokehouse: {
        name: 'buildSmokehouse',
        description: 'Building smokehouse',
        duration: 10,
        cost: 5,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.FURNACE) &&
                   agent.inventory.stone >= 6 &&
                   agent.inventory.wood >= 4 &&
                   !world.hasBuilding(SB.BuildingTypes.SMOKEHOUSE);
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 6;
            agent.inventory.wood -= 4;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 1);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.SMOKEHOUSE, spot.x, spot.y, 2, 1);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 1);
        },
    },

    buildFarm: {
        name: 'buildFarm',
        description: 'Building farm',
        duration: 10,
        cost: 4,
        preconditions: function(agent, world) {
            return agent.hasShelter &&
                   agent.hasHoe &&
                   agent.inventory.wood >= 5 &&
                   agent.inventory.fiber >= 2 &&
                   !world.hasBuilding(SB.BuildingTypes.FARM);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 5;
            agent.inventory.fiber -= 2;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 3, 2);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.FARM, spot.x, spot.y, 3, 2);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 3, 2);
        },
    },

    harvestFarm: {
        name: 'harvestFarm',
        description: 'Harvesting crops',
        duration: 4,
        cost: 2,
        preconditions: function(agent, world) {
            return world.isFarmReady();
        },
        effects: function(agent, world) {
            var harvested = world.harvestFarm();
            agent.inventory.food += harvested;
        },
        getTarget: function(agent, world) {
            var farm = world.getBuilding(SB.BuildingTypes.FARM);
            return farm ? { x: farm.x, y: farm.y } : null;
        },
    },

    buildStorage: {
        name: 'buildStorage',
        description: 'Building storage',
        duration: 10,
        cost: 4,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.FARM) &&
                   agent.inventory.wood >= 10 &&
                   agent.inventory.stone >= 4 &&
                   !world.hasBuilding(SB.BuildingTypes.STORAGE);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 10;
            agent.inventory.stone -= 4;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 2);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.STORAGE, spot.x, spot.y, 2, 2);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 2);
        },
    },

    buildWell: {
        name: 'buildWell',
        description: 'Building well',
        duration: 8,
        cost: 3,
        preconditions: function(agent, world) {
            return agent.hasShelter &&
                   agent.inventory.stone >= 8 &&
                   !world.hasBuilding(SB.BuildingTypes.WELL);
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 8;
            var spot = SB.Utils.findBuildingSpotNearWater(world, agent.x, agent.y, 1, 2, 5);
            if (!spot) {
                // Fallback: place anywhere if no water nearby
                spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 2);
            }
            if (spot) {
                world.addBuilding(SB.BuildingTypes.WELL, spot.x, spot.y, 1, 2);
            }
        },
        getTarget: function(agent, world) {
            var spot = SB.Utils.findBuildingSpotNearWater(world, agent.x, agent.y, 1, 2, 5);
            if (!spot) spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 1, 2);
            return spot;
        },
    },

    buildWorkshop: {
        name: 'buildWorkshop',
        description: 'Building workshop',
        duration: 15,
        cost: 6,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.STORAGE) &&
                   agent.inventory.wood >= 12 &&
                   agent.inventory.stone >= 8 &&
                   !world.hasBuilding(SB.BuildingTypes.WORKSHOP);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 12;
            agent.inventory.stone -= 8;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 3, 2);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.WORKSHOP, spot.x, spot.y, 3, 2);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 3, 2);
        },
    },

    buildWall: {
        name: 'buildWall',
        description: 'Building wall segment',
        duration: 4,
        cost: 2,
        preconditions: function(agent, world) {
            return agent.hasShelter &&
                   agent.inventory.stone >= 3 &&
                   world.getBuildingCount(SB.BuildingTypes.WALL) < 12;
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 3;
            // Place wall near shelter
            var shelter = world.getBuilding(SB.BuildingTypes.SHELTER);
            if (shelter) {
                var spot = SB.Utils.findBuildingSpot(world, shelter.x, shelter.y, 1, 1);
                if (spot) {
                    world.addBuilding(SB.BuildingTypes.WALL, spot.x, spot.y, 1, 1);
                }
            }
        },
        getTarget: function(agent, world) {
            var shelter = world.getBuilding(SB.BuildingTypes.SHELTER);
            if (!shelter) return null;
            return SB.Utils.findBuildingSpot(world, shelter.x, shelter.y, 1, 1);
        },
    },

    craftWoodAxe: {
        name: 'craftWoodAxe',
        description: 'Crafting wooden axe',
        duration: 3,
        cost: 2,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.wood >= 3 &&
                   agent.axeTier < 1;
        },
        effects: function(agent) {
            agent.inventory.wood -= 3;
            agent.axeTier = 1;
        },
        getTarget: function(agent, world) {
            var wb = world.getBuilding(SB.BuildingTypes.WORKBENCH);
            return wb ? { x: wb.x, y: wb.y } : null;
        },
    },

    craftWoodPickaxe: {
        name: 'craftWoodPickaxe',
        description: 'Crafting wooden pickaxe',
        duration: 3,
        cost: 2,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.wood >= 3 &&
                   agent.pickaxeTier < 1;
        },
        effects: function(agent) {
            agent.inventory.wood -= 3;
            agent.pickaxeTier = 1;
        },
        getTarget: function(agent, world) {
            var wb = world.getBuilding(SB.BuildingTypes.WORKBENCH);
            return wb ? { x: wb.x, y: wb.y } : null;
        },
    },

    craftHoe: {
        name: 'craftHoe',
        description: 'Crafting hoe',
        duration: 3,
        cost: 2,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.wood >= 2 &&
                   agent.inventory.stone >= 1 &&
                   !agent.hasHoe;
        },
        effects: function(agent) {
            agent.inventory.wood -= 2;
            agent.inventory.stone -= 1;
            agent.hasHoe = true;
        },
        getTarget: function(agent, world) {
            var wb = world.getBuilding(SB.BuildingTypes.WORKBENCH);
            return wb ? { x: wb.x, y: wb.y } : null;
        },
    },

    craftStoneAxe: {
        name: 'craftStoneAxe',
        description: 'Crafting stone axe',
        duration: 4,
        cost: 3,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKSHOP) &&
                   world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.stone >= 3 &&
                   agent.inventory.wood >= 2 &&
                   agent.axeTier < 2;
        },
        effects: function(agent) {
            agent.inventory.stone -= 3;
            agent.inventory.wood -= 2;
            agent.axeTier = 2;
        },
        getTarget: function(agent, world) {
            var wb = world.getBuilding(SB.BuildingTypes.WORKBENCH);
            return wb ? { x: wb.x, y: wb.y } : null;
        },
    },

    craftStonePickaxe: {
        name: 'craftStonePickaxe',
        description: 'Crafting stone pickaxe',
        duration: 4,
        cost: 3,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKSHOP) &&
                   world.hasBuilding(SB.BuildingTypes.WORKBENCH) &&
                   agent.inventory.stone >= 3 &&
                   agent.inventory.wood >= 2 &&
                   agent.pickaxeTier < 2;
        },
        effects: function(agent) {
            agent.inventory.stone -= 3;
            agent.inventory.wood -= 2;
            agent.pickaxeTier = 2;
        },
        getTarget: function(agent, world) {
            var wb = world.getBuilding(SB.BuildingTypes.WORKBENCH);
            return wb ? { x: wb.x, y: wb.y } : null;
        },
    },

    sleep: {
        name: 'sleep',
        description: 'Sleeping in shelter',
        duration: 15,
        cost: 1,
        preconditions: function(agent) {
            return agent.hasShelter;
        },
        effects: function(agent, world) {
            var bonus = world.hasBuilding(SB.BuildingTypes.BED) ? 60 : 40;
            agent.energy = SB.Utils.clamp(agent.energy + bonus, 0, 100);
        },
        getTarget: function(agent, world) {
            var shelter = world.getBuilding(SB.BuildingTypes.SHELTER);
            return shelter ? { x: shelter.x, y: shelter.y } : null;
        },
    },

    sleepOnGround: {
        name: 'sleepOnGround',
        description: 'Sleeping on the ground',
        duration: 12,
        cost: 3,
        preconditions: function() {
            return true;
        },
        effects: function(agent) {
            agent.energy = SB.Utils.clamp(agent.energy + 25, 0, 100);
        },
        getTarget: function() { return null; },
    },

    explore: {
        name: 'explore',
        description: 'Exploring',
        duration: 1,
        cost: 10,
        preconditions: function() {
            return true;
        },
        effects: function() {},
        getTarget: function(agent) {
            // Walk to a random nearby tile, staying on the island
            var tx = SB.Utils.clamp(agent.x + SB.Utils.random(-8, 8), 0, SB.WORLD_WIDTH - 1);
            var ty = SB.Utils.clamp(agent.y + SB.Utils.random(-8, 8), 0, SB.WORLD_HEIGHT - 1);
            // Make sure target isn't void or cliff
            var tile = SB.World.getTile(tx, ty);
            if (tile && SB.Utils.isWalkable(tile)) {
                return { x: tx, y: ty };
            }
            // Fallback: stay near center
            return { x: Math.floor(SB.WORLD_WIDTH / 2), y: Math.floor(SB.WORLD_HEIGHT / 2) };
        },
    },
};
