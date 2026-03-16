var SB = window.Starbase = window.Starbase || {};

SB.Time = {
    elapsed: 0,
    progress: 0,
    isNight: false,
    darkness: 0,
    dayCount: 0,

    reset: function() {
        this.elapsed = 0;
        this.progress = 0;
        this.isNight = false;
        this.darkness = 0;
        this.dayCount = 0;
    },

    update: function(dt) {
        this.elapsed += dt;
        this.progress = (this.elapsed % SB.DAY_LENGTH) / SB.DAY_LENGTH;

        if (this.progress < 0.4) {
            this.isNight = false;
            this.darkness = 0;
        } else if (this.progress < 0.5) {
            this.isNight = false;
            this.darkness = (this.progress - 0.4) / 0.1 * 0.55;
        } else if (this.progress < 0.85) {
            this.isNight = true;
            this.darkness = 0.55;
        } else {
            this.isNight = false;
            this.darkness = (1.0 - this.progress) / 0.15 * 0.55;
        }

        var newDayCount = Math.floor(this.elapsed / SB.DAY_LENGTH);
        if (newDayCount > this.dayCount) {
            this.dayCount = newDayCount;
            SB.World.dayCount = newDayCount;
            SB.Agent.addLog('A new day dawns');
        }
    },
};

SB.Game = {
    running: false,
    lastTime: 0,
    tickAccumulator: 0,
    deathTimer: 0,
    speedMultiplier: 2, // Default to 2x so things feel alive but not rushed

    // Agent config from creation screen
    agentConfig: null,

    init: function() {
        SB.World.generate();
        SB.Agent.init(SB.World, this.agentConfig);
        SB.Time.reset();
        SB.Renderer.init('gameCanvas');

        // Center camera on agent
        SB.Renderer.camera.x = SB.Agent.x * SB.TILE_SIZE + SB.TILE_SIZE / 2;
        SB.Renderer.camera.y = SB.Agent.y * SB.TILE_SIZE + SB.TILE_SIZE / 2;
        SB.Renderer.camera.targetX = SB.Renderer.camera.x;
        SB.Renderer.camera.targetY = SB.Renderer.camera.y;

        this._setupControls();

        this.running = true;
        this.lastTime = performance.now();
        this.tickAccumulator = 0;
        this.deathTimer = 0;

        requestAnimationFrame(function(t) { SB.Game._loop(t); });
    },

    _setupControls: function() {
        var self = this;
        document.addEventListener('keydown', function(e) {
            // Don't process keys if creation screen is visible
            if (document.getElementById('creationScreen') &&
                document.getElementById('creationScreen').style.display !== 'none') return;

            // No speed or reset keys — handled via menu
        });
    },

    _restart: function() {
        SB.World.generate();
        SB.Agent.init(SB.World, this.agentConfig);
        SB.Time.reset();
        SB.Renderer.regenerateGrassNoise();
        SB.Renderer.camera.followAgent = true;
        SB.Renderer.camera.x = SB.Agent.x * SB.TILE_SIZE + SB.TILE_SIZE / 2;
        SB.Renderer.camera.y = SB.Agent.y * SB.TILE_SIZE + SB.TILE_SIZE / 2;
        SB.Renderer.camera.zoom = 1.0;
        this.deathTimer = 0;
        this.tickAccumulator = 0;
    },

    _loop: function(timestamp) {
        var dt = Math.min(timestamp - this.lastTime, 100);
        this.lastTime = timestamp;

        SB.Time.update(dt * this.speedMultiplier);

        this.tickAccumulator += dt * this.speedMultiplier;
        var tickRate = SB.TICK_RATE;

        while (this.tickAccumulator >= tickRate) {
            this.tickAccumulator -= tickRate;

            if (SB.Agent.alive) {
                SB.World.tick();
                SB.Agent.tick(SB.World, SB.Time);
            } else {
                this.deathTimer += tickRate;
                if (this.deathTimer >= 4000) {
                    this._restart();
                }
            }
        }

        SB.Renderer.draw(SB.World, SB.Agent, SB.Time);

        requestAnimationFrame(function(t) { SB.Game._loop(t); });
    },

    _drawSpeedIndicator: function() {
        var ctx = SB.Renderer.ctx;
        var vpH = SB.Renderer.viewportH;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(5, vpH - 30, 220, 25);

        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';

        var speeds = [1, 2, 5, 10];
        var x = 10;
        ctx.fillText('Speed:', x, vpH - 12);
        x += 50;

        for (var i = 0; i < speeds.length; i++) {
            var s = speeds[i];
            ctx.fillStyle = this.speedMultiplier === s ? '#88ff88' : '#666';
            ctx.fillText('[' + (i + 1) + '] ' + s + 'x', x, vpH - 12);
            x += 45;
        }
    },
};

// ============================================
// CREATION SCREEN
// ============================================
SB.CreationScreen = {
    selectedTraits: [],

    // Random name generator
    _randomNames: [
        'Kai', 'Nova', 'Ash', 'Ember', 'Sol', 'Lyra', 'Orion', 'Sage',
        'Rune', 'Cleo', 'Juno', 'Atlas', 'Iris', 'Pax', 'Zara', 'Milo',
        'Wren', 'Cass', 'Finn', 'Thea', 'Rex', 'Luna', 'Echo', 'Nyx',
        'Arlo', 'Vex', 'Kira', 'Dax', 'Opal', 'Sable', 'Pip', 'Moss'
    ],

    _getRandomName: function() {
        return this._randomNames[Math.floor(Math.random() * this._randomNames.length)];
    },

    _getRandomTraits: function() {
        var keys = Object.keys(SB.Personalities);
        var a = Math.floor(Math.random() * keys.length);
        var b = a;
        while (b === a) b = Math.floor(Math.random() * keys.length);
        return [keys[a], keys[b]];
    },

    show: function() {
        var self = this;
        var screen = document.getElementById('creationScreen');
        var grid = document.getElementById('traitGrid');
        var nameInput = document.getElementById('agentNameInput');
        var launchBtn = document.getElementById('launchBtn');
        var randomizeBtn = document.getElementById('randomizeNameBtn');

        // Pre-fill with random name
        nameInput.value = this._getRandomName();

        // Populate trait grid
        grid.innerHTML = '';
        for (var key in SB.Personalities) {
            if (!SB.Personalities.hasOwnProperty(key)) continue;
            var p = SB.Personalities[key];
            var card = document.createElement('div');
            card.className = 'cs-trait';
            card.setAttribute('data-trait', key);
            card.innerHTML = '<span class="cs-trait-icon">' + p.icon + '</span>' +
                '<span class="cs-trait-name">' + p.name + '</span>' +
                '<span class="cs-trait-desc">' + p.description + '</span>';
            grid.appendChild(card);
        }

        // Pre-select 2 random traits
        var randomTraits = this._getRandomTraits();
        this.selectedTraits = randomTraits.slice();
        var cards = grid.querySelectorAll('.cs-trait');
        for (var c = 0; c < cards.length; c++) {
            if (randomTraits.indexOf(cards[c].getAttribute('data-trait')) >= 0) {
                cards[c].classList.add('selected');
            }
        }

        // Launch button is always enabled now
        launchBtn.disabled = false;

        // Randomize button: shuffle name + traits
        if (randomizeBtn) {
            randomizeBtn.addEventListener('click', function() {
                nameInput.value = self._getRandomName();

                // Deselect all
                var allCards = grid.querySelectorAll('.cs-trait');
                for (var i = 0; i < allCards.length; i++) {
                    allCards[i].classList.remove('selected');
                }

                // Pick 2 new random traits
                var newTraits = self._getRandomTraits();
                self.selectedTraits = newTraits.slice();
                for (var j = 0; j < allCards.length; j++) {
                    if (newTraits.indexOf(allCards[j].getAttribute('data-trait')) >= 0) {
                        allCards[j].classList.add('selected');
                    }
                }
            });
        }

        // Trait selection
        grid.addEventListener('click', function(e) {
            var card = e.target.closest('.cs-trait');
            if (!card) return;
            var trait = card.getAttribute('data-trait');

            if (card.classList.contains('selected')) {
                card.classList.remove('selected');
                var idx = self.selectedTraits.indexOf(trait);
                if (idx >= 0) self.selectedTraits.splice(idx, 1);
            } else if (self.selectedTraits.length < 2) {
                card.classList.add('selected');
                self.selectedTraits.push(trait);
            } else {
                // Already have 2: deselect oldest, select new
                var oldest = self.selectedTraits.shift();
                var allCards = grid.querySelectorAll('.cs-trait');
                for (var i = 0; i < allCards.length; i++) {
                    if (allCards[i].getAttribute('data-trait') === oldest) {
                        allCards[i].classList.remove('selected');
                    }
                }
                card.classList.add('selected');
                self.selectedTraits.push(trait);
            }
        });

        // Launch button
        launchBtn.addEventListener('click', function() {
            self._launch(nameInput.value.trim(), self.selectedTraits);
        });

        // Enter key to launch
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                self._launch(nameInput.value.trim(), self.selectedTraits);
            }
        });

        screen.style.display = 'flex';
        nameInput.focus();
        nameInput.select();
    },

    _launch: function(name, traits) {
        // Fallback: ensure we always have a name and traits
        if (!name) name = this._getRandomName();
        if (!traits || traits.length < 2) traits = this._getRandomTraits();

        var screen = document.getElementById('creationScreen');
        screen.classList.add('cs-fade-out');

        SB.Game.agentConfig = {
            name: name,
            traits: traits.slice()
        };

        setTimeout(function() {
            screen.style.display = 'none';
            SB.Game.init();
        }, 600);
    }
};

// ============================================
// ENTRY POINT
// ============================================
window.addEventListener('DOMContentLoaded', function() {
    SB.CreationScreen.show();
});
