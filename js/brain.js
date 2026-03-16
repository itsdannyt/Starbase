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
// MOOD DEFINITIONS
// ============================================
SB.Moods = {
    confused:  { label: 'Confused',  color: '#9988cc' },
    anxious:   { label: 'Anxious',   color: '#cc8844' },
    desperate: { label: 'Desperate', color: '#dd4444' },
    tired:     { label: 'Tired',     color: '#7788aa' },
    focused:   { label: 'Focused',   color: '#44aadd' },
    content:   { label: 'Content',   color: '#66bb66' },
    proud:     { label: 'Proud',     color: '#ddaa44' },
    excited:   { label: 'Excited',   color: '#ee8844' },
    peaceful:  { label: 'Peaceful',  color: '#88bbaa' },
};

// ============================================
// BRAIN - Full AI System
// ============================================
SB.Brain = {

    // Track day/night transitions
    _wasNight: false,

    // ── Discovery Engine ──
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
                agent.mood = 'excited';
                agent.moodTimer = 60;
            }
        }
    },

    // ── Personality Modifier ──
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

    // ── Mood System ──
    updateMood: function(agent, world, time) {
        // Mood timer: explicit moods (proud, excited) decay over time
        if (agent.moodTimer > 0) {
            agent.moodTimer--;
            if (agent.moodTimer <= 0) agent.mood = '';
        }

        // Don't override explicit moods that haven't expired
        if (agent.moodTimer > 0) return;

        // Derive mood from state
        if (agent.ticksAlive < 15) {
            agent.mood = 'confused';
        } else if (agent.hunger < 15 || agent.energy < 10) {
            agent.mood = 'desperate';
        } else if (agent.hunger < 35 || agent.energy < 25) {
            agent.mood = 'anxious';
        } else if (agent.energy < 40 && time.isNight) {
            agent.mood = 'tired';
        } else if (agent.isSleeping) {
            agent.mood = 'peaceful';
        } else if (agent.status && agent.status.indexOf('Build') >= 0) {
            agent.mood = 'focused';
        } else if (agent.status && (agent.status.indexOf('Chop') >= 0 || agent.status.indexOf('Min') >= 0 || agent.status.indexOf('Gather') >= 0)) {
            agent.mood = 'focused';
        } else if (agent.hunger > 70 && agent.energy > 70) {
            agent.mood = 'content';
        } else {
            agent.mood = '';
        }
    },

    // ── Event Reactions ──
    // Called from agent.js when specific things happen
    reactToEvent: function(agent, event, data) {
        var t = agent.personalityTraits || [];
        var pick = function(arr) { return arr[Math.floor(Math.random() * arr.length)]; };

        switch (event) {
            case 'action_complete':
                var name = data.action;
                var count = agent.stats.actionCounts[name] || 0;

                // First-time reactions
                if (count === 1) {
                    if (name === 'chopTree') agent.addThought(pick(['Got my first wood!', 'That was harder than I thought.', 'Timber!']));
                    else if (name === 'mineStone') agent.addThought(pick(['My hands are sore, but I got stone.', 'Heavy stuff.']));
                    else if (name === 'gatherBerries') agent.addThought(pick(['These taste... not bad actually.', 'Food! Finally.']));
                }
                // Experience milestones
                if (count === 10) {
                    if (name === 'chopTree') agent.addThought(pick(["I'm getting good at this.", "Ten trees down. My arms are stronger now."]));
                    else if (name === 'mineStone') agent.addThought(pick(["I know where to hit the rock now.", "Getting faster at this."]));
                    else if (name === 'gatherBerries') agent.addThought(pick(["I know which bushes have the best berries.", "I can spot berry bushes from far away now."]));
                }
                if (count === 25) {
                    agent.addThought(pick(["I've become an expert at this.", "Muscle memory kicking in.", "I could do this in my sleep."]));
                }
                break;

            case 'ate_food':
                if (agent.hunger < 40) {
                    agent.addThought(pick(["I was starving. That saved me.", "Just in time.", "Can't let myself get that hungry again."]));
                } else {
                    if (Math.random() < 0.3) agent.addThought(pick(['That hit the spot.', 'Not bad.', 'Good enough.']));
                }
                break;

            case 'slept':
                if (data.onGround) {
                    agent.addThought(pick(['My back hurts from the ground.', 'Rough night.', "I really need a proper bed."]));
                } else {
                    if (Math.random() < 0.4) agent.addThought(pick(['Slept well.', 'Feeling refreshed.', 'Good rest.']));
                }
                break;

            case 'built':
                agent.mood = 'proud';
                agent.moodTimer = 80;
                break;

            case 'near_death':
                agent.mood = 'desperate';
                agent.moodTimer = 40;
                if (agent.hunger < 10) {
                    agent.addThought(pick(["I'm going to starve if I don't find food NOW.", "This is bad. Really bad.", "I can feel myself fading..."]));
                } else {
                    agent.addThought(pick(["I can barely keep my eyes open.", "If I collapse out here...", "Must... keep... going..."]));
                }
                agent.addLog('Dangerously low on ' + (agent.hunger < 10 ? 'food' : 'energy'));
                break;

            case 'harvest':
                if (Math.random() < 0.5) {
                    agent.addThought(pick(['The farm is paying off.', 'Fresh crops!', 'All that work was worth it.']));
                }
                break;
        }
    },

    // ── Day/Night Transition Detector ──
    checkTimeTransitions: function(agent, time) {
        var isNight = time.isNight;
        if (isNight && !this._wasNight) {
            // Just became night
            var nightThoughts = [
                'Getting dark. Should be careful.',
                'Night is falling.',
                'The stars are coming out.',
                'Another day survived.',
            ];
            if (agent.hasShelter) nightThoughts.push('Time to head back to shelter.');
            else nightThoughts.push("I'll have to sleep under the stars again.");
            agent.addThought(nightThoughts[Math.floor(Math.random() * nightThoughts.length)]);
        } else if (!isNight && this._wasNight) {
            // Just became dawn
            var dawnThoughts = [
                'A new day. What should I focus on?',
                'Sunrise. Time to get to work.',
                'Morning already.',
                'The light feels good.',
            ];
            agent.addThought(dawnThoughts[Math.floor(Math.random() * dawnThoughts.length)]);
        }
        this._wasNight = isNight;
    },

    // ── Experience Tracker ──
    trackAction: function(agent, actionName) {
        if (!agent.stats.actionCounts) agent.stats.actionCounts = {};
        if (!agent.stats.actionCounts[actionName]) agent.stats.actionCounts[actionName] = 0;
        agent.stats.actionCounts[actionName]++;
    },

    // ── Thought Generator (rich, contextual) ──
    generateThought: function(agent, world, time) {
        // ~1.2% chance per tick = ~1 thought every 15-20 seconds
        if (Math.random() > 0.012) return;

        var pool = [];
        var hasTrait = function(t) { return agent.personalityTraits && agent.personalityTraits.indexOf(t) >= 0; };

        // === EARLY GAME (confused, learning) ===
        if (agent.ticksAlive < 25) {
            pool.push('Where am I?', 'This place is strange...', 'I need to figure this out.',
                'What is this floating island?', 'How did I get here?');
        }
        if (agent.ticksAlive > 30 && agent.ticksAlive < 80 && agent.knowledge.length === 0) {
            pool.push('I should look around more carefully.', 'There must be something useful nearby.',
                'I feel like I should pay more attention to my surroundings.');
        }

        // === SURVIVAL STATE ===
        if (agent.hunger < 20) {
            pool.push("I'm starving...", 'Need food. Now.', 'My stomach feels like its eating itself.');
        } else if (agent.hunger < 40) {
            pool.push("Getting hungry.", 'I should find something to eat soon.', 'My stomach is growling.');
        }

        if (agent.energy < 20) {
            pool.push("So exhausted.", "Can't keep my eyes open.", 'I need to rest before I collapse.');
        } else if (agent.energy < 40) {
            pool.push('Getting tired.', 'Could use a break.', 'My legs are heavy.');
        }

        // === WELL-FED & RESTED ===
        if (agent.hunger > 75 && agent.energy > 75) {
            pool.push('Feeling good.', "Life here isn't so bad.", 'Full belly, plenty of energy.',
                'This is the best I\u2019ve felt in a while.');
        }

        // === ACTIVITY-SPECIFIC ===
        var status = agent.status || '';
        if (status.indexOf('Chop') >= 0) {
            pool.push('Swing... swing...', 'Good wood in this tree.', 'Arms are getting stronger.');
            if (hasTrait('builder')) pool.push('This wood will make fine walls.');
        }
        if (status.indexOf('Mining') >= 0) {
            pool.push('This rock is stubborn.', 'Chip... chip... almost.', 'Solid stone. Useful.');
            if (hasTrait('builder')) pool.push('Perfect building material.');
        }
        if (status.indexOf('Gather') >= 0 || status.indexOf('berries') >= 0) {
            pool.push('These bushes are full.', 'Nature provides.', 'Red ones are the sweetest.');
            if (hasTrait('farmer')) pool.push('I should learn to grow these myself.');
        }
        if (status.indexOf('Build') >= 0) {
            pool.push('Piece by piece.', 'Almost there.', 'This is coming together.',
                'Place this here... and that there...');
            if (hasTrait('builder')) pool.push("I was made for this.", "Best part of the day.");
        }
        if (status.indexOf('Explor') >= 0 || status.indexOf('Wander') >= 0) {
            pool.push("What's over there?", 'New ground.', 'Never seen this part before.');
            if (hasTrait('explorer')) pool.push("There's always more to find.", 'The unknown calls to me.');
        }

        // === TIME OF DAY ===
        if (time.isNight && !agent.isSleeping) {
            pool.push("It's so dark.", 'The stars are bright tonight.', 'Careful in the dark.');
            if (!agent.hasShelter) pool.push('Wish I had somewhere safe to sleep.');
        }

        // === INVENTORY ===
        if (agent.inventory.food === 0 && agent.knowledge.indexOf('berries_edible') >= 0) {
            pool.push('No food left. Need to gather more.', "I can't let my supplies run out.");
        }
        if (agent.inventory.wood > 15) {
            pool.push("That's a lot of wood. I should use some.", 'Wood pile is getting big.');
        }
        if (agent.inventory.stone > 10) {
            pool.push('I have plenty of stone. Time to build something.', 'All this stone needs a purpose.');
        }

        // === PROGRESS REFLECTION ===
        if (agent.totalBuildingsBuilt > 0 && Math.random() < 0.3) {
            pool.push("I've built something real here.", 'This is starting to feel like home.',
                'Look how far I\u2019ve come.');
        }
        if (agent.totalBuildingsBuilt >= 3) {
            pool.push('A proper settlement. I should be proud.', 'From nothing to this. Not bad.');
        }
        if (agent.ticksAlive > 600 && agent.alive) {
            pool.push("I've survived a long time now.", "I'm a survivor.", 'This island can\u2019t beat me.');
        }

        // === DAY COUNT ===
        var day = time.dayCount + 1;
        if (day === 2 && Math.random() < 0.5) {
            pool.push('Day two. Still alive.', 'Made it through the first night.');
        }
        if (day >= 5 && Math.random() < 0.2) {
            pool.push('Day ' + day + '. I\u2019ve lost count almost.', 'Been here ' + day + ' days now.');
        }

        // === PERSONALITY-SPECIFIC (always available as background flavor) ===
        if (hasTrait('explorer')) {
            pool.push("I wonder what's beyond the fog.", "There's so much to discover.",
                'Every step reveals something new.', "I won't rest until I've seen it all.");
        }
        if (hasTrait('builder')) {
            pool.push("There's always something to build.", 'I see potential in every resource.',
                'A solid structure stands the test of time.', 'What should I construct next?');
        }
        if (hasTrait('survivor')) {
            pool.push('Stay sharp. Stay alive.', 'I can endure anything.',
                'Conserve energy. Think ahead.', "Others would've given up by now.");
        }
        if (hasTrait('gatherer')) {
            pool.push('Every resource counts.', 'My stockpile grows.',
                'Preparation is everything.', 'A full inventory is a safe inventory.');
        }
        if (hasTrait('genius')) {
            pool.push('What if I tried a different approach?', 'I see patterns in everything.',
                'Knowledge is the real resource.', 'There must be a smarter way.');
        }
        if (hasTrait('farmer')) {
            pool.push('Good soil here.', 'Food security is everything.',
                'The land provides if you treat it right.', "Nature's rhythms are predictable.");
        }

        // Pick a random thought from the pool
        if (pool.length > 0) {
            agent.addThought(pool[Math.floor(Math.random() * pool.length)]);
        }
    },

    // ── Main tick (called from agent.tick) ──
    tick: function(agent, world, time) {
        this.checkDiscoveries(agent, world);
        this.updateMood(agent, world, time);
        this.checkTimeTransitions(agent, time);
        this.generateThought(agent, world, time);

        // Near-death warning (once per danger period)
        if ((agent.hunger < 10 || agent.energy < 10) && !agent._nearDeathWarned) {
            this.reactToEvent(agent, 'near_death', {});
            agent._nearDeathWarned = true;
        }
        if (agent.hunger > 20 && agent.energy > 20) {
            agent._nearDeathWarned = false;
        }
    }
};
