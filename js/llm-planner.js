var SB = window.Starbase = window.Starbase || {};

SB.LLMPlanner = {
    // Current LLM decision
    _pendingAction: null,
    _pendingReason: '',
    _pendingThought: '',
    isThinking: false,

    // Timing
    _tickCounter: 0,
    _interval: 30,         // ticks between queries (~3s at 1x)
    _minInterval: 15,      // danger interval
    _maxInterval: 50,      // comfortable interval
    _immediateRequested: false,

    // Tracking
    _consecutiveFallbacks: 0,
    _lastAction: null,

    // Keyword map for tier-3 parsing
    _keywordMap: {
        'wood': 'chopTree', 'tree': 'chopTree', 'chop': 'chopTree', 'lumber': 'chopTree',
        'eat': 'eat', 'hungry': 'eat', 'food': 'eat', 'starv': 'eat',
        'berr': 'gatherBerries', 'gather': 'gatherBerries', 'forag': 'gatherBerries',
        'fiber': 'gatherFiber', 'grass': 'gatherFiber',
        'stone': 'mineStone', 'mine': 'mineStone', 'rock': 'mineStone',
        'campfire': 'buildCampfire', 'fire': 'buildCampfire',
        'workbench': 'buildWorkbench', 'bench': 'buildWorkbench', 'table': 'buildWorkbench',
        'axe': 'craftWoodAxe', 'pickaxe': 'craftWoodPickaxe',
        'hoe': 'craftHoe',
        'shelter': 'buildShelter', 'home': 'buildShelter',
        'bed': 'buildBed',
        'furnace': 'buildFurnace', 'oven': 'buildFurnace',
        'smokehouse': 'buildSmokehouse', 'smoke': 'buildSmokehouse',
        'farm': 'buildFarm', 'plant': 'buildFarm', 'grow': 'buildFarm',
        'harvest': 'harvestFarm', 'crop': 'harvestFarm',
        'storage': 'buildStorage', 'store': 'buildStorage',
        'well': 'buildWell', 'water': 'buildWell',
        'workshop': 'buildWorkshop', 'tool': 'buildWorkshop',
        'wall': 'buildWall', 'fortif': 'buildWall', 'defend': 'buildWall',
        'sleep': 'sleep', 'rest': 'sleep', 'tired': 'sleep', 'nap': 'sleep',
        'explor': 'explore', 'wander': 'explore', 'look': 'explore', 'search': 'explore'
    },

    tick: function(agent, world, time) {
        if (!SB.LLM || !SB.LLM.available) return;

        this._tickCounter++;

        // Account for speed multiplier to avoid flooding
        var effectiveInterval = this._interval;
        if (SB.Game && SB.Game.speedMultiplier > 2) {
            effectiveInterval = Math.round(this._interval * (SB.Game.speedMultiplier / 2));
        }

        var shouldQuery = this._immediateRequested ||
                          this._tickCounter >= effectiveInterval;

        if (shouldQuery && !SB.LLM.pendingRequest) {
            this._fireQuery(agent, world, time);
            this._tickCounter = 0;
            this._immediateRequested = false;
        }
    },

    shouldOverride: function() {
        return this._pendingAction !== null;
    },

    getAction: function() {
        var action = this._pendingAction;
        var reason = this._pendingReason;
        var thought = this._pendingThought;
        this._pendingAction = null;
        this._pendingReason = '';
        this._pendingThought = '';
        return { action: action, reason: reason, thought: thought };
    },

    triggerImmediate: function() {
        if (SB.LLM && SB.LLM.available) {
            this._immediateRequested = true;
        }
    },

    _fireQuery: function(agent, world, time) {
        var self = this;
        var systemPrompt = this._buildSystemPrompt(agent);
        var userPrompt = this._buildUserPrompt(agent, world, time);

        this.isThinking = true;

        SB.LLM.query(userPrompt, systemPrompt, function(text, err) {
            self.isThinking = false;

            if (err || !text) {
                self._consecutiveFallbacks++;
                self._adjustInterval(agent);
                return;
            }

            var result = self._parseResponse(text, agent);
            if (result && result.action) {
                self._pendingAction = result.action;
                self._pendingReason = result.reason || '';
                self._pendingThought = result.thought || '';
                self._consecutiveFallbacks = 0;
                self._lastAction = result.action;

                // Show the LLM's thought as the agent's thought
                if (result.thought) {
                    agent.addThought(result.thought);
                } else if (result.reason) {
                    agent.addThought(result.reason);
                }

                // Feed to memory
                if (SB.Memory) {
                    SB.Memory.addEvent('Decided to ' + result.action + (result.reason ? ' — ' + result.reason : ''));
                }
            } else {
                self._consecutiveFallbacks++;
            }

            self._adjustInterval(agent);
        });
    },

    _adjustInterval: function(agent) {
        // If LLM keeps failing, slow down
        if (this._consecutiveFallbacks > 5) {
            this._interval = Math.min(this._interval + 10, 100);
            return;
        }

        // Danger = faster queries
        if (agent.hunger < 25 || agent.energy < 20) {
            this._interval = this._minInterval;
        }
        // Comfortable = slower queries
        else if (agent.hunger > 60 && agent.energy > 60) {
            this._interval = this._maxInterval;
        }
        // Default
        else {
            this._interval = 30;
        }
    },

    _buildSystemPrompt: function(agent) {
        var actions = agent.knownActions ? agent.knownActions.join(', ') : 'eat, sleepOnGround, explore';
        return 'You are an AI agent surviving alone on a floating island in space.\n' +
            'Respond ONLY in JSON: {"action":"actionName","reason":"brief why","thought":"your inner feeling"}\n' +
            'Valid actions: ' + actions + '\n' +
            'Progression: campfire \u2192 workbench \u2192 tools \u2192 shelter \u2192 bed \u2192 farm. Build campfire first, then workbench for tools.\n' +
            'Rules: Pick ONE action. Keep reason under 15 words. Keep thought under 12 words.';
    },

    _buildUserPrompt: function(agent, world, time) {
        var lines = [];

        // Body state
        lines.push('BODY: Hunger ' + Math.round(agent.hunger) + '/100, Energy ' + Math.round(agent.energy) + '/100');

        // Inventory
        lines.push('CARRYING: ' + agent.inventory.wood + ' wood, ' + agent.inventory.stone + ' stone, ' + agent.inventory.fiber + ' fiber, ' + agent.inventory.food + ' food');

        // Time
        var dayNum = time ? time.dayCount + 1 : 1;
        var timeOfDay = time && time.isNight ? 'night' : 'day';
        lines.push('TIME: Day ' + dayNum + ', ' + timeOfDay);

        // Shelter
        lines.push('SHELTER: ' + (agent.hasShelter ? 'yes' : 'no'));

        // Tools
        var tools = [];
        if (agent.axeTier > 0) tools.push((agent.axeTier >= 2 ? 'stone' : 'wooden') + ' axe');
        if (agent.pickaxeTier > 0) tools.push((agent.pickaxeTier >= 2 ? 'stone' : 'wooden') + ' pickaxe');
        if (agent.hasHoe) tools.push('hoe');
        lines.push('TOOLS: ' + (tools.length > 0 ? tools.join(', ') : 'none'));

        // Buildings
        if (world && world.buildings && world.buildings.length > 0) {
            var bNames = [];
            var wallCount = 0;
            for (var i = 0; i < world.buildings.length; i++) {
                if (world.buildings[i].type === SB.BuildingTypes.WALL) wallCount++;
                else bNames.push(world.buildings[i].type);
            }
            var bStr = bNames.length > 0 ? bNames.join(', ') : 'none';
            if (wallCount > 0) bStr += ' + ' + wallCount + ' walls';
            lines.push('BUILDINGS: ' + bStr);
        } else {
            lines.push('BUILDINGS: none');
        }

        // Spatial summary
        if (SB.Memory) {
            lines.push('');
            lines.push('NEARBY: ' + SB.Memory.getSpatialSummary(agent, world));
        }

        // Recent events
        if (SB.Memory) {
            var events = SB.Memory.getRecentEvents(6);
            if (events.length > 0) {
                lines.push('');
                lines.push('RECENT:');
                for (var e = 0; e < events.length; e++) {
                    lines.push('- ' + events[e]);
                }
            }
        }

        // Long-term lessons
        if (SB.Memory) {
            var lessons = SB.Memory.getLessons(5);
            if (lessons.length > 0) {
                lines.push('');
                lines.push('PAST LIVES:');
                for (var l = 0; l < lessons.length; l++) {
                    lines.push('- ' + lessons[l]);
                }
            }
        }

        lines.push('');
        lines.push('What do you do?');

        return lines.join('\n');
    },

    _parseResponse: function(text, agent) {
        if (!text) return null;

        var knownActions = agent.knownActions || [];
        var action = null;
        var reason = '';
        var thought = '';

        // Tier 1: JSON parse
        try {
            // Strip code fences if present
            var cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            // Try to extract JSON object
            var jsonMatch = cleaned.match(/\{[^}]+\}/);
            if (jsonMatch) {
                var parsed = JSON.parse(jsonMatch[0]);
                if (parsed.action) {
                    action = this._matchAction(parsed.action, knownActions);
                    reason = parsed.reason || '';
                    thought = parsed.thought || '';
                    if (action) return { action: action, reason: reason, thought: thought };
                }
            }
        } catch (e) {
            // Fall through to tier 2
        }

        // Tier 2: Regex — scan for exact action names
        for (var i = 0; i < knownActions.length; i++) {
            var re = new RegExp('\\b' + knownActions[i] + '\\b', 'i');
            if (re.test(text)) {
                action = knownActions[i];
                // Try to extract reason from text
                var reasonMatch = text.match(/reason["\s:]+([^"}\n]+)/i);
                reason = reasonMatch ? reasonMatch[1].trim().substring(0, 60) : '';
                var thoughtMatch = text.match(/thought["\s:]+([^"}\n]+)/i);
                thought = thoughtMatch ? thoughtMatch[1].trim().substring(0, 50) : '';
                return { action: action, reason: reason, thought: thought };
            }
        }

        // Tier 3: Keyword map
        var lowerText = text.toLowerCase();
        for (var keyword in this._keywordMap) {
            if (lowerText.indexOf(keyword) >= 0) {
                var mapped = this._keywordMap[keyword];
                if (knownActions.indexOf(mapped) >= 0) {
                    return { action: mapped, reason: '', thought: '' };
                }
            }
        }

        // Tier 4: Fallback — return null, rule-based planner handles it
        return null;
    },

    _matchAction: function(name, knownActions) {
        if (!name) return null;

        // Exact match
        if (knownActions.indexOf(name) >= 0) return name;

        // Case-insensitive match
        var lower = name.toLowerCase();
        for (var i = 0; i < knownActions.length; i++) {
            if (knownActions[i].toLowerCase() === lower) return knownActions[i];
        }

        // Fuzzy: check if any known action contains the name or vice versa
        for (var j = 0; j < knownActions.length; j++) {
            if (knownActions[j].toLowerCase().indexOf(lower) >= 0 ||
                lower.indexOf(knownActions[j].toLowerCase()) >= 0) {
                return knownActions[j];
            }
        }

        return null;
    }
};
