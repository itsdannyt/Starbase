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
            name: 'Build Campfire',
            category: 'build',
            priority: function(agent, world) {
                if (world.hasBuilding(SB.BuildingTypes.CAMPFIRE)) return 0;
                if (agent.inventory.wood >= 3 && agent.inventory.stone >= 2) return 48;
                return 0;
            },
            actions: ['buildCampfire', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Workbench',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.CAMPFIRE)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.WORKBENCH)) return 0;
                return 44;
            },
            actions: ['buildWorkbench', 'chopTree'],
        },
        {
            name: 'Craft Tools',
            category: 'craft',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.WORKBENCH)) return 0;
                if (agent.axeTier < 1 || agent.pickaxeTier < 1) return 42;
                if (!agent.hasHoe && agent.knowledge.indexOf('farming_concept') >= 0) return 35;
                return 0;
            },
            actions: ['craftWoodAxe', 'craftWoodPickaxe', 'craftHoe', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Shelter',
            category: 'build',
            priority: function(agent, world) {
                if (world.hasBuilding(SB.BuildingTypes.SHELTER)) return 0;
                if (!world.hasBuilding(SB.BuildingTypes.WORKBENCH)) return 0;
                return 45;
            },
            actions: ['buildShelter', 'chopTree', 'mineStone'],
        },
        {
            name: 'Build Bed',
            category: 'build',
            priority: function(agent, world) {
                if (!agent.hasShelter) return 0;
                if (world.hasBuilding(SB.BuildingTypes.BED)) return 0;
                return 32;
            },
            actions: ['buildBed', 'chopTree', 'gatherFiber'],
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
                if (!world.hasBuilding(SB.BuildingTypes.CAMPFIRE)) woodNeeded = 3;
                else if (!world.hasBuilding(SB.BuildingTypes.WORKBENCH)) woodNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) woodNeeded = 10;
                else if (!world.hasBuilding(SB.BuildingTypes.FARM)) woodNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.STORAGE)) woodNeeded = 10;
                else if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) woodNeeded = 12;
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
                if (!world.hasBuilding(SB.BuildingTypes.CAMPFIRE)) stoneNeeded = 2;
                else if (!world.hasBuilding(SB.BuildingTypes.SHELTER)) stoneNeeded = 5;
                else if (!world.hasBuilding(SB.BuildingTypes.WELL)) stoneNeeded = 8;
                else if (!world.hasBuilding(SB.BuildingTypes.FURNACE)) stoneNeeded = 8;
                else if (!world.hasBuilding(SB.BuildingTypes.STORAGE)) stoneNeeded = 4;
                else if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) stoneNeeded = 8;
                else if (world.getBuildingCount(SB.BuildingTypes.WALL) < 12) stoneNeeded = 3;
                else stoneNeeded = 0;

                if (stoneNeeded === 0 || agent.inventory.stone >= stoneNeeded) return 0;
                return 22;
            },
            actions: ['mineStone'],
        },
        {
            name: 'Gather Fiber',
            category: 'gather',
            priority: function(agent) {
                if (agent.knowledge.indexOf('bed_concept') < 0 && agent.knowledge.indexOf('farming_concept') < 0) return 0;
                var fiberNeeded = 0;
                if (agent.knowledge.indexOf('bed_concept') >= 0) fiberNeeded = 3;
                if (agent.knowledge.indexOf('farming_concept') >= 0) fiberNeeded = Math.max(fiberNeeded, 2);
                if (agent.inventory.fiber >= fiberNeeded) return 0;
                return 20;
            },
            actions: ['gatherFiber'],
        },
        {
            name: 'Build Farm',
            category: 'build',
            priority: function(agent, world) {
                if (!agent.hasShelter) return 0;
                if (!agent.hasHoe) return 0;
                if (world.hasBuilding(SB.BuildingTypes.FARM)) return 0;
                return 35;
            },
            actions: ['buildFarm', 'chopTree', 'gatherFiber'],
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
                if (!agent.hasShelter) return 0;
                if (world.hasBuilding(SB.BuildingTypes.WELL)) return 0;
                if (agent.inventory.stone >= 8) return 32;
                return 0;
            },
            actions: ['buildWell', 'mineStone'],
        },
        {
            name: 'Build Furnace',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.WORKBENCH)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.FURNACE)) return 0;
                if (agent.inventory.stone >= 8) return 28;
                return 18;
            },
            actions: ['buildFurnace', 'mineStone'],
        },
        {
            name: 'Build Smokehouse',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.FURNACE)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.SMOKEHOUSE)) return 0;
                if (agent.inventory.stone >= 6 && agent.inventory.wood >= 4) return 24;
                return 14;
            },
            actions: ['buildSmokehouse', 'mineStone', 'chopTree'],
        },
        {
            name: 'Build Storage',
            category: 'build',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.FARM)) return 0;
                if (world.hasBuilding(SB.BuildingTypes.STORAGE)) return 0;
                if (agent.inventory.wood >= 10 && agent.inventory.stone >= 4) return 30;
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
            name: 'Craft Stone Tools',
            category: 'craft',
            priority: function(agent, world) {
                if (!world.hasBuilding(SB.BuildingTypes.WORKSHOP)) return 0;
                if (agent.axeTier >= 2 && agent.pickaxeTier >= 2) return 0;
                return 26;
            },
            actions: ['craftStoneAxe', 'craftStonePickaxe', 'mineStone', 'chopTree'],
        },
        {
            name: 'Build Walls',
            category: 'build',
            priority: function(agent, world) {
                if (!agent.hasShelter) return 0;
                if (world.getBuildingCount(SB.BuildingTypes.WALL) >= 12) return 0;
                if (agent.inventory.stone >= 3) return 10;
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

    // Execute an LLM-chosen action by finding the action def and building a plan
    _executeLLMAction: function(agent, world, actionName) {
        var actionDefs = SB.Actions.all();
        var action = null;
        for (var i = 0; i < actionDefs.length; i++) {
            if (actionDefs[i].name === actionName) {
                action = actionDefs[i];
                break;
            }
        }
        if (!action) return null;

        // Check preconditions
        if (!action.preconditions(agent, world)) return null;

        var plan = [];
        var target = action.getTarget(agent, world);
        if (target) {
            plan.push({ type: 'walkTo', target: target, description: 'Walking to ' + actionName + ' site' });
        }
        plan.push({ type: 'execute', action: action, description: action.description });
        return { goal: 'LLM: ' + actionName, actions: plan };
    },

    makePlan: function(agent, world, time) {
        // LLM override: if the LLM brain has decided on an action, try it first
        if (SB.LLMPlanner && SB.LLMPlanner.shouldOverride()) {
            var llmDecision = SB.LLMPlanner.getAction();
            if (llmDecision && llmDecision.action) {
                var llmPlan = this._executeLLMAction(agent, world, llmDecision.action);
                if (llmPlan) return llmPlan;
                // If LLM action fails preconditions, fall through to rule-based
            }
        }

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
                var needsFiber = false;

                if (actionName === 'buildCampfire') {
                    needsWood = agent.inventory.wood < 3;
                    needsStone = agent.inventory.stone < 2;
                } else if (actionName === 'buildWorkbench') {
                    needsWood = agent.inventory.wood < 5;
                } else if (actionName === 'buildShelter') {
                    needsWood = agent.inventory.wood < 10;
                    needsStone = agent.inventory.stone < 5;
                } else if (actionName === 'buildBed') {
                    needsWood = agent.inventory.wood < 4;
                    needsFiber = agent.inventory.fiber < 3;
                } else if (actionName === 'buildFarm') {
                    needsWood = agent.inventory.wood < 5;
                    needsFiber = agent.inventory.fiber < 2;
                } else if (actionName === 'buildStorage') {
                    needsWood = agent.inventory.wood < 10;
                    needsStone = agent.inventory.stone < 4;
                } else if (actionName === 'buildWell') {
                    needsStone = agent.inventory.stone < 8;
                } else if (actionName === 'buildFurnace') {
                    needsStone = agent.inventory.stone < 8;
                } else if (actionName === 'buildSmokehouse') {
                    needsStone = agent.inventory.stone < 6;
                    needsWood = agent.inventory.wood < 4;
                } else if (actionName === 'buildWorkshop') {
                    needsWood = agent.inventory.wood < 12;
                    needsStone = agent.inventory.stone < 8;
                } else if (actionName === 'buildWall') {
                    needsStone = agent.inventory.stone < 3;
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
                if (needsFiber && agent.knownActions.indexOf('gatherFiber') >= 0) {
                    var fiberAction = null;
                    for (var fi = 0; fi < actionDefs.length; fi++) {
                        if (actionDefs[fi].name === 'gatherFiber') { fiberAction = actionDefs[fi]; break; }
                    }
                    if (fiberAction && fiberAction.preconditions(agent, world)) {
                        var fiberTarget = fiberAction.getTarget(agent, world);
                        if (fiberTarget) plan.push({ type: 'walkTo', target: fiberTarget, description: 'Walking to fiber' });
                        plan.push({ type: 'execute', action: fiberAction, description: fiberAction.description });
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
