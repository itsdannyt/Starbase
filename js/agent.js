var SB = window.Starbase = window.Starbase || {};

SB.Agent = {
    x: 0,
    y: 0,
    hunger: 80,
    energy: 100,
    alive: true,
    hasShelter: false,

    // Identity
    agentName: 'Survivor',
    personalityTraits: [],

    // Knowledge & Learning
    knowledge: [],          // discovered concept IDs
    knownActions: [],       // unlocked action names

    // Stats for discovery triggers
    stats: {
        timesSleptOnGround: 0,
        timesGatheredBerries: 0,
        actionCounts: {},
    },
    ticksAlive: 0,

    // Mood
    mood: '',
    moodTimer: 0,
    _nearDeathWarned: false,

    // Inner monologue
    thoughts: [],
    currentThought: '',
    thoughtTimer: 0,

    inventory: {
        wood: 0,
        stone: 0,
        fiber: 0,
        food: 2,
    },

    // Tool tiers: 0=none, 1=wood, 2=stone
    axeTier: 0,
    pickaxeTier: 0,
    hasHoe: false,

    // Current plan
    currentGoal: '',
    plan: [],
    currentStep: null,
    actionProgress: 0,
    walkPath: [],

    // Status for display
    status: 'Waking up...',
    log: [],
    isSleeping: false,

    // Direction & animation
    facing: 'down',
    walkFrame: 0,

    // Stats
    totalWoodChopped: 0,
    totalStoneMined: 0,
    totalFoodEaten: 0,
    totalBuildingsBuilt: 0,

    // Milestones
    milestones: [],

    init: function(world, config) {
        this.x = Math.floor(SB.WORLD_WIDTH / 2);
        this.y = Math.floor(SB.WORLD_HEIGHT / 2);
        this.hunger = 80;
        this.energy = 100;
        this.alive = true;
        this.hasShelter = false;
        this.inventory = { wood: 0, stone: 0, fiber: 0, food: 2 };
        this.axeTier = 0;
        this.pickaxeTier = 0;
        this.hasHoe = false;
        this.plan = [];
        this.currentStep = null;
        this.actionProgress = 0;
        this.walkPath = [];
        this.log = [];
        this.isSleeping = false;
        this.status = 'Waking up...';
        this.totalWoodChopped = 0;
        this.totalStoneMined = 0;
        this.totalFoodEaten = 0;
        this.totalBuildingsBuilt = 0;
        this.milestones = [];
        this.ticksAlive = 0;

        // Knowledge - start with only instinct actions
        this.knowledge = [];
        this.knownActions = ['eat', 'sleepOnGround', 'explore'];
        this.stats = { timesSleptOnGround: 0, timesGatheredBerries: 0, actionCounts: {} };

        // Mood
        this.mood = 'confused';
        this.moodTimer = 15;
        this._nearDeathWarned = false;

        // Thoughts
        this.thoughts = [];
        this.currentThought = '';
        this.thoughtTimer = 0;

        // Apply config from creation screen (or preserve from restart)
        if (config) {
            this.agentName = config.name || 'Survivor';
            this.personalityTraits = config.traits || [];
        }

        this.addLog(this.agentName + ' arrived on a floating island');
        this.addThought('Where... where am I?');
    },

    addLog: function(message) {
        var time = SB.Time ? 'Day ' + (SB.Time.dayCount + 1) : 'Day 1';
        this.log.unshift({ time: time, message: message });
        if (this.log.length > 20) this.log.pop();
    },

    addThought: function(text) {
        var time = SB.Time ? 'Day ' + (SB.Time.dayCount + 1) : 'Day 1';
        this.thoughts.unshift({ text: text, time: time });
        if (this.thoughts.length > 10) this.thoughts.pop();
        this.currentThought = text;
        this.thoughtTimer = 50;
    },

    tick: function(world, time) {
        if (!this.alive) return;

        this.ticksAlive++;

        // Drain needs (personality can modify drain rates)
        var hungerDrain = 0.25;
        var energyDrain = 0.15;
        if (SB.Brain) {
            hungerDrain *= SB.Brain.getModifier(this, 'hunger_drain');
            energyDrain *= SB.Brain.getModifier(this, 'energy_drain');
        }
        var nightMultiplier = time.isNight ? 1.5 : 1.0;
        this.hunger -= hungerDrain * nightMultiplier;
        this.energy -= energyDrain * nightMultiplier;

        if (this.isSleeping) {
            this.energy += 0.15 * nightMultiplier;
        }

        this.hunger = SB.Utils.clamp(this.hunger, 0, 100);
        this.energy = SB.Utils.clamp(this.energy, 0, 100);

        if (this.hunger <= 0 || this.energy <= 0) {
            this.alive = false;
            this.status = this.hunger <= 0 ? 'Starved...' : 'Collapsed from exhaustion...';
            this.addLog(this.status);
            return;
        }

        this.isSleeping = false;

        // Brain: discoveries, mood, thoughts, transitions
        if (SB.Brain) {
            SB.Brain.tick(this, world, time);
        }

        // Thought bubble timer
        if (this.thoughtTimer > 0) this.thoughtTimer--;

        SB.World.revealAround(this.x, this.y, SB.World.revealRadius);

        if (this.currentStep) {
            this._executeStep(world, time);
            return;
        }

        if (this.plan.length > 0) {
            this.currentStep = this.plan.shift();
            this.actionProgress = 0;

            if (this.currentStep.type === 'walkTo') {
                this.walkPath = SB.Utils.findPath(world, this.x, this.y,
                    this.currentStep.target.x, this.currentStep.target.y);
                if (!this.walkPath || this.walkPath.length === 0) {
                    this.currentStep = null;
                }
            }
            return;
        }

        var result = SB.Planner.makePlan(this, world, time);
        this.currentGoal = result.goal;
        this.plan = result.actions;

        if (this.plan.length > 0) {
            this.status = this.plan[0].description || this.currentGoal;
        }
    },

    _executeStep: function(world, time) {
        var step = this.currentStep;

        if (step.type === 'walkTo') {
            if (this.walkPath && this.walkPath.length > 0) {
                var next = this.walkPath.shift();
                if (next.x > this.x) this.facing = 'right';
                else if (next.x < this.x) this.facing = 'left';
                else if (next.y > this.y) this.facing = 'down';
                else if (next.y < this.y) this.facing = 'up';
                this.walkFrame++;
                this.x = next.x;
                this.y = next.y;
                this.status = step.description || 'Walking...';

                if (this.walkPath.length === 0) {
                    this.currentStep = null;
                }
            } else {
                this.currentStep = null;
            }
        } else if (step.type === 'execute') {
            this.actionProgress++;
            this.status = step.action.description;

            if (step.action.name === 'sleep' || step.action.name === 'sleepOnGround') {
                this.isSleeping = true;
            }

            if (this.actionProgress >= step.action.duration) {
                var prevWood = this.inventory.wood;
                var prevStone = this.inventory.stone;
                var prevFood = this.inventory.food;

                step.action.effects(this, world);

                if (this.inventory.wood > prevWood) this.totalWoodChopped += (this.inventory.wood - prevWood);
                if (this.inventory.stone > prevStone) this.totalStoneMined += (this.inventory.stone - prevStone);
                if (step.action.name === 'eat') this.totalFoodEaten++;

                // Track stats for discovery triggers
                if (step.action.name === 'sleepOnGround') this.stats.timesSleptOnGround++;
                if (step.action.name === 'gatherBerries') this.stats.timesGatheredBerries++;
                if (step.action.name === 'gatherFiber') { if (!this.stats.timesGatheredFiber) this.stats.timesGatheredFiber = 0; this.stats.timesGatheredFiber++; }

                // Track experience + trigger reactions
                if (SB.Brain) {
                    SB.Brain.trackAction(this, step.action.name);
                    SB.Brain.reactToEvent(this, 'action_complete', { action: step.action.name });

                    if (step.action.name === 'eat') SB.Brain.reactToEvent(this, 'ate_food', {});
                    if (step.action.name === 'sleepOnGround') SB.Brain.reactToEvent(this, 'slept', { onGround: true });
                    if (step.action.name === 'sleep') SB.Brain.reactToEvent(this, 'slept', { onGround: false });
                    if (step.action.name === 'harvestFarm') SB.Brain.reactToEvent(this, 'harvest', {});
                }

                if (step.action.name.indexOf('build') === 0) {
                    this.totalBuildingsBuilt++;
                    var buildingName = step.action.name.replace('build', '');
                    buildingName = buildingName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                    this.addLog('Built a ' + buildingName);
                    if (SB.Brain) SB.Brain.reactToEvent(this, 'built', { building: buildingName });

                    // Milestone-based events
                    if (step.action.name === 'buildCampfire') {
                        this.milestones.push({ name: 'First Fire', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 6);
                        this.addThought('Fire! This changes everything.');
                    } else if (step.action.name === 'buildWorkbench') {
                        this.milestones.push({ name: 'Workbench Ready', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 8);
                        this.addThought('Now I can craft real tools.');
                    } else if (step.action.name === 'buildShelter') {
                        this.milestones.push({ name: 'Shelter Built', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 14);
                        this.addLog('The fog recedes! New territory revealed.');
                        this.addThought('Finally! A roof over my head.');
                    } else if (step.action.name === 'buildFarm') {
                        this.milestones.push({ name: 'Farm Established', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 12);
                        this.addLog('Farming knowledge reveals more land!');
                        this.addThought("My own farm. I won't go hungry again.");
                    } else if (step.action.name === 'buildStorage') {
                        this.milestones.push({ name: 'Storage Built', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 10);
                        this.addLog('Storage secured! More land mapped.');
                    } else if (step.action.name === 'buildWell') {
                        this.milestones.push({ name: 'Well Constructed', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 8);
                        this.addLog('Fresh water! Fog pulls back.');
                    } else if (step.action.name === 'buildBed') {
                        this.milestones.push({ name: 'Bed Crafted', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        this.addThought('A real bed. No more sore back.');
                    } else if (step.action.name === 'buildFurnace') {
                        this.milestones.push({ name: 'Furnace Built', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 8);
                        this.addThought('Now I can really cook.');
                    } else if (step.action.name === 'buildSmokehouse') {
                        this.milestones.push({ name: 'Smokehouse Built', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        this.addThought('Smoked food will last much longer.');
                    } else if (step.action.name === 'buildWorkshop') {
                        this.milestones.push({ name: 'Workshop Ready', time: SB.Time ? SB.Time.dayCount + 1 : 1 });
                        SB.World.milestoneReveal(this.x, this.y, 12);
                        this.addLog('Tools upgraded! Gathering is faster now.');
                        this.addThought('Better tools. Now I can really get to work.');
                    }
                } else if (step.action.name.indexOf('craft') === 0) {
                    var toolName = step.action.name.replace('craft', '');
                    toolName = toolName.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                    this.addLog('Crafted ' + toolName);
                    if (SB.Brain) SB.Brain.reactToEvent(this, 'action_complete', { action: step.action.name });
                } else if (step.action.name === 'harvestFarm') {
                    this.addLog('Harvested crops from the farm');
                }

                this.currentStep = null;
                this.actionProgress = 0;
            }
        }
    },

    replan: function() {
        this.plan = [];
        this.currentStep = null;
        this.actionProgress = 0;
        this.walkPath = [];
    },
};
