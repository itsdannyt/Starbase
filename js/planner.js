var SB = window.Starbase = window.Starbase || {};

SB.Planner = {
    goals: [
        {
            name: 'Survive Hunger',
            category: 'survival',
            priority: function(agent) {
                if (agent.hunger < 20) return 95;
                if (agent.hunger < 40) return 70;
                if (agent.hunger < 60) return 40;
                return 0;
            },
            actions: ['eat', 'gatherBerries', 'harvestFarm'],
        },
        {
            name: 'Survive Energy',
            category: 'survival',
            priority: function(agent, world, time) {
                var nightBonus = time.isNight ? 20 : 0;
                if (agent.energy < 15) return 90 + nightBonus;
                if (agent.energy < 30) return 60 + nightBonus;
                if (agent.energy < 50) return 30 + nightBonus;
                return 0;
            },
            actions: ['sleep', 'sleepOnGround'],
        },
        {
            name: 'Build Shelter',
            category: 'build',
            priority: function(agent, world) {
                if (world.hasBuilding(SB.BuildingTypes.SHELTER)) return 0;
                return 45;
            },
            actions: ['buildShelter', 'chopTree', 'mineStone'],
        },
        {
            name: 'Stock Food',
            category: 'stock_food',
            priority: function(agent) {
                if (agent.inventory.food >= 8) return 0;
                if (agent.inventory.food < 2) return 55;
                return 30;
            },
            actions: ['gatherBerries', 'harvestFarm'],
        },
        {
            name: 'Gather Wood',
            category: 'gather',
            priority: function(agent, world) {
                var woodNeeded = 0;
                if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) woodNeeded = 10;
                else if (!world.hasBuilding(SB.BuildingTypes.FARM)) woodNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.STORAGE)) woodNeeded = 8;
                else if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) woodNeeded = 12;
                else if (!world.hasBuilding(SB.BuildingTypes.WATCHTOWER)) woodNeeded = 15;
                else woodNeeded = 5;

                if (agent.inventory.wood >= woodNeeded) return 0;
                return 25;
            },
            actions: ['chopTree'],
        },
        {
            name: 'Gather Stone',
            category: 'gather',
            priority: function(agent, world) {
                var stoneNeeded = 0;
                if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) stoneNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.WELL)) stoneNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.STORAGE)) stoneNeeded = 3;
                else if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) stoneNeeded = 8;
                else if (!world.hasBuilding(SB.BuildingTypes.WATCHTOWER)) stoneNeeded = 10;
                else if (world.getBuildingCount(SB.BuildingTypes.WALL) < 12) stoneNeeded = 2;
                else stoneNeeded = 0;

                if (stoneNeeded === 0 || agent.inventory.stone >= stoneNeeded) return 0;
                return 22;
            },
            actions: ['mineStone'],
        },
        {
            name: 'Build Farm',
            category: 'build',
            priority: function(agent, world) {
                if (!agent.hasShelter) return 0;
                if (world.hasBuilding(SB.BuildingTypes.FARM)) return 0;
                return 35;
            },
            actions: ['buildFarm', 'chopTree'],
        },
        {
            name: 'Tend Farm',
            category: 'gather',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.FARM)) return 0;
                if (world.isFarmReady()) return 38;
                return 0;
            },
            actions: ['harvestFarm'],
        },
        {
            name: 'Build Well',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.WELL)) return 0;
                if (agent.inventory.stone >= 5) return 32;
                return 0;
            },
            actions: ['buildWell', 'mineStone'],
        },
        {
            name: 'Build Storage',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.FARM)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.STORAGE)) return 0;
                if (agent.inventory.wood >= 8 && agent.inventory.stone >= 3) return 30;
                return 18;
            },
            actions: ['buildStorage', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Workshop',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.STORAGE)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.WORKSHOP)) return 0;
                if (agent.inventory.wood >= 12 && agent.inventory.stone >= 8) return 28;
                return 16;
            },
            actions: ['buildWorkshop', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Watchtower',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.WATCHTOWER)) return 0;
                if (agent.inventory.wood >= 15 && agent.inventory.stone >= 10) return 26;
                return 14;
            },
            actions: ['buildWatchtower', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Walls',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) return 0;
                if (world.getBuildingCount(SB.BuildingTypes.WALL) >= 12) return 0;
                if (agent.inventory.stone >= 2) return 10;
                return 0;
            },
            actions: ['buildWall', 'mineStone'],
        },
        {
            name: 'Sleep at Night',
            category: 'sleep',
            priority: function(agent, world, time) {
                if (!time.isNight) return 0;
                if (agent.energy < 70) return 50;
                return 15;
            },
            actions: ['sleep', 'sleepOnGround'],
        },
        {
            name: 'Explore',
            category: 'explore',
            priority: function() {
                return 5;
            },
            actions: ['explore'],
        },
    ],

    makePlan: function(agent, world, time) {
        var bestGoal = null;
        var bestPriority = -1;
        var bestActions = null;

        for (var g = 0; g < this.goals.length; g++) {
            var goal = this.goals[g];

            // Filter to only actions the agent has learned
            var known = [];
            for (var k = 0; k < goal.actions.length; k++) {
                if (agent.knownActions.indexOf(goal.actions[k]) >= 0) {
                    known.push(goal.actions[k]);
                }
            }
            if (known.length === 0) continue;

            var priority = goal.priority(agent, world, time);

            // Personality modifies non-survival priorities
            if (goal.category !== 'survival' && priority > 0 && SB.Brain) {
                priority = Math.round(priority * SB.Brain.getModifier(agent, goal.category));
            }

            if (priority > bestPriority) {
                bestPriority = priority;
                bestGoal = goal;
                bestActions = known;
            }
        }

        if (!bestGoal) return { goal: 'Idle', actions: [] };

        var actionDefs = SB.Actions.all();
        var plan = [];

        for (var a = 0; a < bestActions.length; a++) {
            var actionName = bestActions[a];
            var action = null;
            for (var i = 0; i < actionDefs.length; i++) {
                if (actionDefs[i].name === actionName) {
                    action = actionDefs[i];
                    break;
                }
            }
            if (!action) continue;

            if (action.preconditions(agent, world)) {
                var target = action.getTarget(agent, world);
                if (target) {
                    plan.push({ type: 'walkTo', target: target, description: 'Walking to ' + actionName + ' site' });
                }
                plan.push({ type: 'execute', action: action, description: action.description });
                break;
            }

            // Sub-goal: gather resources for builds
            if (actionName.indexOf('build') === 0 && !action.preconditions(agent, world)) {
                var needsWood = false;
                var needsStone = false;

                if (actionName === 'buildShelter') {
                    needsWood = agent.inventory.wood < 10;
                    needsStone = agent.inventory.stone < 5;
                } else if (actionName === 'buildFarm') {
                    needsWood = agent.inventory.wood < 5;
                } else if (actionName === 'buildStorage') {
                    needsWood = agent.inventory.wood < 8;
                    needsStone = agent.inventory.stone < 3;
                } else if (actionName === 'buildWell') {
                    needsStone = agent.inventory.stone < 5;
                } else if (actionName === 'buildWorkshop') {
                    needsWood = agent.inventory.wood < 12;
                    needsStone = agent.inventory.stone < 8;
                } else if (actionName === 'buildWatchtower') {
                    needsWood = agent.inventory.wood < 15;
                    needsStone = agent.inventory.stone < 10;
                } else if (actionName === 'buildWall') {
                    needsStone = agent.inventory.stone < 2;
                }

                // Only gather resources the agent knows how to gather
                if (needsWood && agent.knownActions.indexOf('chopTree') >= 0) {
                    var chopAction = null;
                    for (var ci = 0; ci < actionDefs.length; ci++) {
                        if (actionDefs[ci].name === 'chopTree') { chopAction = actionDefs[ci]; break; }
                    }
                    if (chopAction && chopAction.preconditions(agent, world)) {
                        var chopTarget = chopAction.getTarget(agent, world);
                        if (chopTarget) plan.push({ type: 'walkTo', target: chopTarget, description: 'Walking to tree' });
                        plan.push({ type: 'execute', action: chopAction, description: chopAction.description });
                        break;
                    }
                }
                if (needsStone && agent.knownActions.indexOf('mineStone') >= 0) {
                    var mineAction = null;
                    for (var mi = 0; mi < actionDefs.length; mi++) {
                        if (actionDefs[mi].name === 'mineStone') { mineAction = actionDefs[mi]; break; }
                    }
                    if (mineAction && mineAction.preconditions(agent, world)) {
                        var mineTarget = mineAction.getTarget(agent, world);
                        if (mineTarget) plan.push({ type: 'walkTo', target: mineTarget, description: 'Walking to stone' });
                        plan.push({ type: 'execute', action: mineAction, description: mineAction.description });
                        break;
                    }
                }
            }

            // For eat: if no food, skip to next action
            if (actionName === 'eat' && !action.preconditions(agent, world)) {
                continue;
            }
        }

        // Fallback: wander
        if (plan.length === 0) {
            var tx = SB.Utils.clamp(agent.x + SB.Utils.random(-5, 5), 0, SB.WORLD_WIDTH - 1);
            var ty = SB.Utils.clamp(agent.y + SB.Utils.random(-4, 4), 0, SB.WORLD_HEIGHT - 1);
            var wTile = SB.World.getTile(tx, ty);
            if (!wTile || !SB.Utils.isWalkable(wTile)) {
                tx = Math.floor(SB.WORLD_WIDTH / 2);
                ty = Math.floor(SB.WORLD_HEIGHT / 2);
            }
            plan.push({ type: 'walkTo', target: { x: tx, y: ty }, description: 'Wandering around' });
        }

        return { goal: bestGoal.name, actions: plan };
    },
};
