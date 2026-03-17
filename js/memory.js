var SB = window.Starbase = window.Starbase || {};

SB.Memory = {
    // Short-term: ring buffer of recent events (cleared on death)
    shortTerm: [],
    maxShortTerm: 15,

    // Long-term: lessons from past lives (persisted in localStorage)
    longTerm: [],
    maxLongTerm: 10,

    // Stats for death analysis
    lifeCount: 0,
    _storageKey: 'starbase_brain_default',

    load: function() {
        var agentName = SB.Agent ? SB.Agent.agentName : 'default';
        this._storageKey = 'starbase_brain_' + agentName;

        try {
            var data = localStorage.getItem(this._storageKey);
            if (data) {
                var parsed = JSON.parse(data);
                this.longTerm = parsed.lessons || [];
                this.lifeCount = parsed.lifeCount || 0;
            }
        } catch (e) {
            // localStorage unavailable or corrupt — start fresh
            this.longTerm = [];
            this.lifeCount = 0;
        }
    },

    _persist: function() {
        try {
            localStorage.setItem(this._storageKey, JSON.stringify({
                lessons: this.longTerm,
                lifeCount: this.lifeCount
            }));
        } catch (e) {
            // Silently fail if localStorage unavailable
        }
    },

    addEvent: function(text) {
        this.shortTerm.push(text);
        if (this.shortTerm.length > this.maxShortTerm) {
            this.shortTerm.shift();
        }
    },

    getSpatialSummary: function(agent, world) {
        if (!world || !agent) return '';

        var nearby = [];
        var scanRadius = 8;
        var treeClusters = 0;
        var berryClusters = 0;
        var stoneClusters = 0;
        var grassClusters = 0;

        for (var dx = -scanRadius; dx <= scanRadius; dx++) {
            for (var dy = -scanRadius; dy <= scanRadius; dy++) {
                var tx = agent.x + dx;
                var ty = agent.y + dy;
                if (tx < 0 || tx >= SB.WORLD_WIDTH || ty < 0 || ty >= SB.WORLD_HEIGHT) continue;

                var tile = world.getTile(tx, ty);
                if (!tile || !tile.revealed) continue;

                if (tile.resource === SB.Resources.TREE && tile.resourceAmount > 0) treeClusters++;
                else if (tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount > 0) berryClusters++;
                else if (tile.resource === SB.Resources.STONE && tile.resourceAmount > 0) stoneClusters++;
                else if (tile.resource === SB.Resources.TALL_GRASS && tile.resourceAmount > 0) grassClusters++;
            }
        }

        var parts = [];
        if (treeClusters > 0) parts.push(treeClusters + ' trees nearby');
        if (berryClusters > 0) parts.push(berryClusters + ' berry bushes nearby');
        if (stoneClusters > 0) parts.push(stoneClusters + ' stone deposits nearby');
        if (grassClusters > 0) parts.push(grassClusters + ' tall grass nearby');

        // Note buildings
        if (world.buildings.length > 0) {
            var buildingNames = [];
            for (var i = 0; i < world.buildings.length; i++) {
                var b = world.buildings[i];
                if (b.type !== SB.BuildingTypes.WALL) {
                    buildingNames.push(b.type);
                }
            }
            if (buildingNames.length > 0) parts.push('buildings: ' + buildingNames.join(', '));
        }

        return parts.length > 0 ? parts.join(', ') : 'nothing notable nearby';
    },

    onDeath: function(agent) {
        if (!agent) return;

        this.lifeCount++;
        var lessons = [];
        var daysSurvived = SB.Time ? SB.Time.dayCount + 1 : 1;

        // Analyze cause of death
        if (agent.hunger <= 0) {
            if (agent.inventory.food > 0) {
                lessons.push('I had food but forgot to eat. Always eat when hunger drops below 30.');
            } else if (agent.knowledge.indexOf('berries_edible') < 0) {
                lessons.push('I starved because I never learned to gather food. Explore early to find berry bushes.');
            } else {
                lessons.push('I starved. Need to stockpile more food and eat earlier.');
            }
        } else if (agent.energy <= 0) {
            if (agent.hasShelter) {
                lessons.push('I collapsed from exhaustion despite having shelter. Sleep before energy gets critical.');
            } else {
                lessons.push('I collapsed from exhaustion with no shelter. Build a shelter early for proper rest.');
            }
        }

        // Analyze survival strategy
        if (daysSurvived <= 2) {
            lessons.push('Died very early (day ' + daysSurvived + '). Focus on food and rest first, explore later.');
        }
        if (!agent.hasShelter && daysSurvived > 3) {
            lessons.push('Survived ' + daysSurvived + ' days without shelter. Prioritize building shelter sooner.');
        }
        if (agent.totalBuildingsBuilt >= 3 && daysSurvived > 5) {
            lessons.push('Good progress with ' + agent.totalBuildingsBuilt + ' buildings. Keep balancing survival with building.');
        }

        // Cap at 3 lessons per death
        lessons = lessons.slice(0, 3);

        // Add to long-term, keeping max limit
        for (var i = 0; i < lessons.length; i++) {
            this.longTerm.push(lessons[i]);
        }
        while (this.longTerm.length > this.maxLongTerm) {
            this.longTerm.shift();
        }

        this._persist();
    },

    onNewLife: function() {
        this.shortTerm = [];
        // Long-term lessons persist
    },

    getRecentEvents: function(count) {
        count = count || 8;
        return this.shortTerm.slice(-count);
    },

    getLessons: function(count) {
        count = count || 5;
        return this.longTerm.slice(-count);
    }
};
