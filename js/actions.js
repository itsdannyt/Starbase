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
            this.chopTree,
            this.mineStone,
            this.buildShelter,
            this.sleep,
            this.sleepOnGround,
            this.buildFarm,
            this.harvestFarm,
            this.buildStorage,
            this.buildWell,
            this.buildWorkshop,
            this.buildWatchtower,
            this.buildWall,
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
        effects: function(agent) {
            agent.inventory.food--;
            agent.hunger = SB.Utils.clamp(agent.hunger + 30, 0, 100);
        },
        getTarget: function() { return null; },
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

    chopTree: {
        name: 'chopTree',
        description: 'Chopping wood',
        get duration() { return SB.Actions._getDuration(4); },
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
        get duration() { return SB.Actions._getDuration(5); },
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

    buildShelter: {
        name: 'buildShelter',
        description: 'Building shelter',
        duration: 12,
        cost: 5,
        preconditions: function(agent, world) {
            return agent.inventory.wood >= 10 && agent.inventory.stone >= 5 && !world.hasBuilding(SB.BuildingTypes.SHELTER);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 10;
            agent.inventory.stone -= 5;
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

    buildFarm: {
        name: 'buildFarm',
        description: 'Building farm',
        duration: 10,
        cost: 4,
        preconditions: function(agent, world) {
            return agent.hasShelter && agent.inventory.wood >= 5 && !world.hasBuilding(SB.BuildingTypes.FARM);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 5;
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
                   agent.inventory.wood >= 8 && agent.inventory.stone >= 3 &&
                   !world.hasBuilding(SB.BuildingTypes.STORAGE);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 8;
            agent.inventory.stone -= 3;
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
            return world.hasBuilding(SB.BuildingTypes.SHELTER) &&
                   agent.inventory.stone >= 5 &&
                   !world.hasBuilding(SB.BuildingTypes.WELL);
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 5;
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
                   agent.inventory.wood >= 12 && agent.inventory.stone >= 8 &&
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

    buildWatchtower: {
        name: 'buildWatchtower',
        description: 'Building watchtower',
        duration: 18,
        cost: 7,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKSHOP) &&
                   agent.inventory.wood >= 15 && agent.inventory.stone >= 10 &&
                   !world.hasBuilding(SB.BuildingTypes.WATCHTOWER);
        },
        effects: function(agent, world) {
            agent.inventory.wood -= 15;
            agent.inventory.stone -= 10;
            var spot = SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 3);
            if (spot) {
                world.addBuilding(SB.BuildingTypes.WATCHTOWER, spot.x, spot.y, 2, 3);
            }
        },
        getTarget: function(agent, world) {
            return SB.Utils.findBuildingSpot(world, agent.x, agent.y, 2, 3);
        },
    },

    buildWall: {
        name: 'buildWall',
        description: 'Building wall segment',
        duration: 4,
        cost: 2,
        preconditions: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.SHELTER) &&
                   agent.inventory.stone >= 2 &&
                   world.getBuildingCount(SB.BuildingTypes.WALL) < 20;
        },
        effects: function(agent, world) {
            agent.inventory.stone -= 2;
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

    sleep: {
        name: 'sleep',
        description: 'Sleeping in shelter',
        duration: 15,
        cost: 1,
        preconditions: function(agent) {
            return agent.hasShelter;
        },
        effects: function(agent) {
            agent.energy = SB.Utils.clamp(agent.energy + 50, 0, 100);
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
