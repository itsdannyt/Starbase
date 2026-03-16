var SB = window.Starbase = window.Starbase || {};

// ============================================
// PERSONALITY TRAIT DEFINITIONS
// ============================================
SB.Personalities = {
    explorer: {
        name: 'Explorer',
        icon: '\uD83E\uDDED',
        description: 'Reveals the map fast, finds resources others miss',
        modifiers: { explore: 2.5, gather: 1.2 }
    },
    builder: {
        name: 'Builder',
        icon: '\uD83D\uDD28',
        description: 'Constructs buildings faster, plans ahead',
        modifiers: { build: 1.6, gather: 1.3 }
    },
    survivor: {
        name: 'Survivor',
        icon: '\uD83D\uDD25',
        description: 'Burns less hunger and energy, outlasts anyone',
        modifiers: { hunger_drain: 0.7, energy_drain: 0.7, gather: 1.1 }
    },
    gatherer: {
        name: 'Gatherer',
        icon: '\uD83C\uDF3F',
        description: 'Stockpiles resources quickly, never runs low',
        modifiers: { gather: 1.6, stock_food: 1.5 }
    },
    genius: {
        name: 'Genius',
        icon: '\uD83E\uDDE0',
        description: 'Discovers new skills and ideas much faster',
        modifiers: { explore: 1.3, build: 1.2 }
    },
    farmer: {
        name: 'Farmer',
        icon: '\uD83C\uDF3E',
        description: 'Masters food production, farms thrive',
        modifiers: { stock_food: 1.8, build: 1.2, gather: 1.2 }
    }
};

// ============================================
// DISCOVERY DEFINITIONS
// ============================================
SB.Discoveries = {
    berries_edible: {
        name: 'Edible Berries',
        check: function(agent, world) {
            return SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount > 0; }, 3
            ) !== null;
        },
        unlocks: ['gatherBerries'],
        thoughts: [
            'Those red things on that bush... are they edible?',
            'My stomach is growling. Those berries look promising.',
            'I think I can eat these!'
        ]
    },
    trees_choppable: {
        name: 'Wood from Trees',
        check: function(agent, world) {
            return agent.ticksAlive > 15 && SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.TREE && tile.resourceAmount > 0; }, 3
            ) !== null;
        },
        unlocks: ['chopTree'],
        thoughts: [
            'I could break branches off these trees...',
            'Wood could be useful for something.',
            'These trees... I bet I could use that wood.'
        ]
    },
    stone_minable: {
        name: 'Stone Mining',
        check: function(agent, world) {
            return agent.ticksAlive > 30 && SB.Utils.findNearest(world, agent.x, agent.y,
                function(tile) { return tile.resource === SB.Resources.STONE && tile.resourceAmount > 0; }, 3
            ) !== null;
        },
        unlocks: ['mineStone'],
        thoughts: [
            'These rocks look solid. Could be useful.',
            'Stone... I could shape this into something.',
            'Hard rock. I can chip pieces off this.'
        ]
    },
    shelter_concept: {
        name: 'Shelter Building',
        check: function(agent) {
            return agent.knowledge.indexOf('trees_choppable') >= 0 &&
                   agent.knowledge.indexOf('stone_minable') >= 0 &&
                   agent.stats.timesSleptOnGround >= 2;
        },
        unlocks: ['buildShelter'],
        thoughts: [
            'Sleeping on the ground is terrible. I need something better.',
            'With wood and stone... I could build a shelter!',
            'I need a roof over my head.'
        ]
    },
    farming_concept: {
        name: 'Farming',
        check: function(agent) {
            return agent.hasShelter && agent.stats.timesGatheredBerries >= 3;
        },
        unlocks: ['buildFarm', 'harvestFarm'],
        thoughts: [
            'What if I could grow my own food?',
            'I keep searching for berries... there must be a better way.',
            'A farm near my shelter... I could plant things!'
        ]
    },
    well_concept: {
        name: 'Well Building',
        check: function(agent) {
            return agent.hasShelter &&
                   agent.knowledge.indexOf('stone_minable') >= 0 &&
                   agent.ticksAlive > 200;
        },
        unlocks: ['buildWell'],
        thoughts: [
            'Fresh water would make life so much easier.',
            'I should build a well near my shelter.'
        ]
    },
    storage_concept: {
        name: 'Storage',
        check: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.FARM) &&
                   agent.ticksAlive > 350;
        },
        unlocks: ['buildStorage'],
        thoughts: [
            'I need somewhere to keep all these materials.',
            'A storage building would help me stay organized.'
        ]
    },
    workshop_concept: {
        name: 'Workshop',
        check: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.STORAGE) &&
                   agent.ticksAlive > 550;
        },
        unlocks: ['buildWorkshop'],
        thoughts: [
            'With better tools, I could work much faster.',
            'A workshop... I could craft better equipment!'
        ]
    },
    watchtower_concept: {
        name: 'Watchtower',
        check: function(agent, world) {
            return world.hasBuilding(SB.BuildingTypes.WORKSHOP) &&
                   agent.ticksAlive > 750;
        },
        unlocks: ['buildWatchtower'],
        thoughts: [
            'I want to see further. A tall tower would help.',
            'From up high, I could survey the whole island!'
        ]
    },
    walls_concept: {
        name: 'Defensive Walls',
        check: function(agent) {
            return agent.hasShelter &&
                   agent.knowledge.indexOf('stone_minable') >= 0 &&
                   agent.ticksAlive > 300;
        },
        unlocks: ['buildWall'],
        thoughts: [
            'Walls around my shelter would make me feel safer.',
            'I should fortify my home with stone walls.'
        ]
    }
};

// ============================================
// BRAIN - Discovery Engine + Thought Generator
// ============================================
SB.Brain = {
    checkDiscoveries: function(agent, world) {
        for (var id in SB.Discoveries) {
            if (!SB.Discoveries.hasOwnProperty(id)) continue;
            if (agent.knowledge.indexOf(id) >= 0) continue;

            var disc = SB.Discoveries[id];
            if (disc.check(agent, world)) {
                agent.knowledge.push(id);
                for (var u = 0; u < disc.unlocks.length; u++) {
                    if (agent.knownActions.indexOf(disc.unlocks[u]) < 0) {
                        agent.knownActions.push(disc.unlocks[u]);
                    }
                }
                var thought = disc.thoughts[Math.floor(Math.random() * disc.thoughts.length)];
                agent.addThought(thought);
                agent.addLog('Discovered: ' + disc.name);
            }
        }
    },

    getModifier: function(agent, category) {
        if (!agent.personalityTraits) return 1.0;
        var mod = 1.0;
        for (var i = 0; i < agent.personalityTraits.length; i++) {
            var trait = SB.Personalities[agent.personalityTraits[i]];
            if (trait && trait.modifiers[category]) {
                mod *= trait.modifiers[category];
            }
        }
        return mod;
    },

    generateThought: function(agent, world, time) {
        if (Math.random() > 0.012) return;

        var thoughts = [];

        // State-based thoughts
        if (agent.hunger < 30) {
            thoughts.push("I'm getting really hungry...", 'Need to find food soon.');
        }
        if (agent.energy < 30) {
            thoughts.push('So tired...', 'I need to rest.');
        }
        if (time.isNight) {
            thoughts.push("It's dark out.", 'The stars are beautiful tonight.');
        }
        if (agent.hunger > 80 && agent.energy > 80) {
            thoughts.push('Feeling good right now.', "Life here isn't so bad.");
        }
        if (agent.ticksAlive < 20) {
            thoughts.push('Where am I?', 'I need to figure out how to survive.', 'This place is strange...');
        }
        if (agent.ticksAlive > 50 && agent.knowledge.length === 0) {
            thoughts.push('I should look around more carefully.', "There must be something useful nearby.");
        }

        // Personality-flavored thoughts
        if (agent.personalityTraits) {
            for (var i = 0; i < agent.personalityTraits.length; i++) {
                var t = agent.personalityTraits[i];
                if (t === 'explorer') thoughts.push("I wonder what's beyond that hill...", 'I should explore further.');
                else if (t === 'builder') thoughts.push("No time for rest, there's work to do.", 'I should build something.');
                else if (t === 'survivor') thoughts.push('I can handle this.', "Keep going. Don't give up.");
                else if (t === 'gatherer') thoughts.push('Every bit of material counts.', 'I should stock up more.');
                else if (t === 'genius') thoughts.push('What if I tried something different?', 'I have an idea...');
                else if (t === 'farmer') thoughts.push('I should tend to my crops.', 'A good harvest solves everything.');
            }
        }

        if (thoughts.length > 0) {
            agent.addThought(thoughts[Math.floor(Math.random() * thoughts.length)]);
        }
    }
};

// ============================================
// LLM - Optional Ollama Integration
// ============================================
SB.LLM = {
    available: false,
    checking: false,
    lastCall: 0,
    callInterval: 45000,
    model: 'llama3.2:3b',

    checkAvailability: function() {
        if (this.checking) return;
        this.checking = true;
        var self = this;
        fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
            .then(function(r) {
                if (r.ok) {
                    self.available = true;
                    console.log('[Starbase] Ollama detected! Enhanced AI thoughts enabled.');
                }
                self.checking = false;
            })
            .catch(function() {
                self.available = false;
                self.checking = false;
                console.log('[Starbase] No Ollama detected. Using built-in brain.');
            });
    },

    requestThought: function(agent, world, time) {
        if (!this.available) return;
        var now = Date.now();
        if (now - this.lastCall < this.callInterval) return;
        this.lastCall = now;

        var prompt = this._buildPrompt(agent, world, time);

        fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.8, num_predict: 50 }
            }),
            signal: AbortSignal.timeout(5000)
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.response) {
                var thought = data.response.trim().split('\n')[0];
                thought = thought.replace(/^["']|["']$/g, '');
                if (thought.length > 2 && thought.length < 100) {
                    agent.addThought(thought);
                }
            }
        })
        .catch(function() { /* silent */ });
    },

    _buildPrompt: function(agent, world, time) {
        var traits = [];
        if (agent.personalityTraits) {
            for (var i = 0; i < agent.personalityTraits.length; i++) {
                var p = SB.Personalities[agent.personalityTraits[i]];
                if (p) traits.push(p.name);
            }
        }

        var s = 'You are ' + (agent.agentName || 'a survivor') + ', stranded on a floating island in space.\n';
        s += 'Personality: ' + (traits.length > 0 ? traits.join(', ') : 'Unknown') + '\n';
        s += 'Hunger: ' + Math.round(agent.hunger) + '/100, Energy: ' + Math.round(agent.energy) + '/100\n';
        s += 'Inventory: ' + agent.inventory.wood + ' wood, ' + agent.inventory.stone + ' stone, ' + agent.inventory.food + ' food\n';
        s += 'Day ' + (time.dayCount + 1) + (time.isNight ? ' (night)' : ' (day)') + '\n';
        s += 'Currently: ' + agent.status + '\n';
        s += 'Skills: ' + agent.knownActions.join(', ') + '\n';
        s += '\nExpress ONE brief thought (max 12 words, first person, in character). No quotes.';
        return s;
    }
};
