var SB = window.Starbase = window.Starbase || {};

SB.Renderer = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    animFrame: 0,
    grassNoise: null,

    // Camera system
    camera: {
        x: 0,
        y: 0,
        zoom: 1.0,
        targetX: 0,
        targetY: 0,
        followAgent: true,
        lerpSpeed: 0.08,
    },
    drag: {
        active: false,
        startX: 0,
        startY: 0,
        camStartX: 0,
        camStartY: 0,
    },
    viewportW: 0,
    viewportH: 0,
    hudWidth: 300,

    fogPatternCanvas: null,

    // Starfield layers
    farStars: [],
    nearStars: [],

    init: function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this._resize();
        this._generateGrassNoise();
        this._generateFogPattern();
        this._generateStarfield();
        this._setupCameraControls();
        this._createZoomButtons();
        window.addEventListener('resize', function() { SB.Renderer._resize(); SB.Renderer._generateStarfield(); });
    },

    _resize: function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        this.canvas.width = w;
        this.canvas.height = h;
        this.width = w;
        this.height = h;
        this.viewportW = w - this.hudWidth;
        this.viewportH = h;
    },

    _generateStarfield: function() {
        this.farStars = [];
        this.nearStars = [];
        var vpW = this.viewportW || 800;
        var vpH = this.viewportH || 600;

        // Far stars: fixed in screen space, don't move with camera
        for (var i = 0; i < 100; i++) {
            this.farStars.push({
                x: Math.random() * vpW,
                y: Math.random() * vpH,
                size: Math.random() < 0.3 ? 1 : (Math.random() < 0.7 ? 1.5 : 2),
                color: Math.random() < 0.6 ? SB.Colors.star_white :
                       (Math.random() < 0.5 ? SB.Colors.star_blue : SB.Colors.star_yellow),
                twinkleSpeed: 0.01 + Math.random() * 0.04,
                twinkleOffset: Math.random() * Math.PI * 2,
                baseAlpha: 0.4 + Math.random() * 0.5,
            });
        }

        // Near stars: move slightly with camera for parallax
        for (var j = 0; j < 50; j++) {
            this.nearStars.push({
                x: Math.random() * vpW * 2 - vpW * 0.5,
                y: Math.random() * vpH * 2 - vpH * 0.5,
                size: Math.random() < 0.2 ? 1 : (Math.random() < 0.6 ? 2 : 3),
                color: Math.random() < 0.5 ? SB.Colors.star_white :
                       (Math.random() < 0.6 ? SB.Colors.star_blue : SB.Colors.star_yellow),
                twinkleSpeed: 0.015 + Math.random() * 0.03,
                twinkleOffset: Math.random() * Math.PI * 2,
                baseAlpha: 0.5 + Math.random() * 0.4,
                parallaxFactor: 0.05 + Math.random() * 0.1,
            });
        }
    },

    _generateFogPattern: function() {
        this.fogPatternCanvas = document.createElement('canvas');
        this.fogPatternCanvas.width = 64;
        this.fogPatternCanvas.height = 64;
        var fctx = this.fogPatternCanvas.getContext('2d');
        fctx.fillStyle = 'rgb(8, 8, 20)';
        fctx.fillRect(0, 0, 64, 64);
        for (var i = 0; i < 120; i++) {
            var brightness = Math.floor(Math.random() * 15 + 10);
            fctx.fillStyle = 'rgb(' + brightness + ',' + brightness + ',' + (brightness + 10) + ')';
            fctx.fillRect(
                Math.floor(Math.random() * 64),
                Math.floor(Math.random() * 64),
                1, 1
            );
        }
    },

    _createZoomButtons: function() {
        var container = document.getElementById('gameContainer');
        var self = this;

        // Create button container
        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'position:absolute;bottom:45px;left:10px;display:flex;flex-direction:column;gap:4px;z-index:10;';

        var makeBtn = function(text, onclick) {
            var btn = document.createElement('button');
            btn.textContent = text;
            btn.style.cssText = 'width:32px;height:32px;background:rgba(15,15,35,0.85);color:#aaccee;border:1px solid rgba(80,80,120,0.5);border-radius:4px;cursor:pointer;font-family:monospace;font-size:16px;font-weight:bold;display:flex;align-items:center;justify-content:center;';
            btn.addEventListener('click', onclick);
            btn.addEventListener('mouseenter', function() { btn.style.background = 'rgba(40,40,80,0.9)'; });
            btn.addEventListener('mouseleave', function() { btn.style.background = 'rgba(15,15,35,0.85)'; });
            return btn;
        };

        var zoomIn = makeBtn('+', function() {
            self.camera.zoom = SB.Utils.clamp(self.camera.zoom + 0.15, 0.25, 2.5);
        });
        var zoomOut = makeBtn('-', function() {
            self.camera.zoom = SB.Utils.clamp(self.camera.zoom - 0.15, 0.25, 2.5);
        });
        var fitBtn = makeBtn('\u2922', function() {
            // Fit entire island in view
            var worldPx = SB.WORLD_WIDTH * SB.TILE_SIZE;
            var worldPy = SB.WORLD_HEIGHT * SB.TILE_SIZE;
            var zoomX = self.viewportW / worldPx;
            var zoomY = self.viewportH / worldPy;
            self.camera.zoom = Math.min(zoomX, zoomY) * 0.9;
            self.camera.zoom = SB.Utils.clamp(self.camera.zoom, 0.25, 2.5);
            self.camera.x = worldPx / 2;
            self.camera.y = worldPy / 2;
            self.camera.targetX = self.camera.x;
            self.camera.targetY = self.camera.y;
            self.camera.followAgent = false;
        });
        fitBtn.title = 'Fit island';

        btnContainer.appendChild(zoomIn);
        btnContainer.appendChild(zoomOut);
        btnContainer.appendChild(fitBtn);
        container.appendChild(btnContainer);
    },

    _setupCameraControls: function() {
        var self = this;

        this.canvas.addEventListener('wheel', function(e) {
            e.preventDefault();
            var zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
            self.camera.zoom = SB.Utils.clamp(self.camera.zoom + zoomDelta, 0.25, 2.5);
        }, { passive: false });

        this.canvas.addEventListener('mousedown', function(e) {
            if (e.offsetX < self.viewportW) {
                self.drag.active = true;
                self.drag.startX = e.clientX;
                self.drag.startY = e.clientY;
                self.drag.camStartX = self.camera.x;
                self.drag.camStartY = self.camera.y;
                self.camera.followAgent = false;
            }
        });

        window.addEventListener('mousemove', function(e) {
            if (self.drag.active) {
                var dx = (e.clientX - self.drag.startX) / self.camera.zoom;
                var dy = (e.clientY - self.drag.startY) / self.camera.zoom;
                self.camera.x = self.drag.camStartX - dx;
                self.camera.y = self.drag.camStartY - dy;
            }
        });

        window.addEventListener('mouseup', function() {
            self.drag.active = false;
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'f' || e.key === 'F') {
                self.camera.followAgent = true;
            }
        });
    },

    _updateCamera: function(agent) {
        var ts = SB.TILE_SIZE;
        if (this.camera.followAgent && agent) {
            this.camera.targetX = agent.x * ts + ts / 2;
            this.camera.targetY = agent.y * ts + ts / 2;
        }
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.lerpSpeed;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.lerpSpeed;
    },

    _generateGrassNoise: function() {
        this.grassNoise = [];
        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            this.grassNoise[y] = [];
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                this.grassNoise[y][x] = {
                    color: Math.random(),
                    hasFlower: Math.random() < 0.06,
                    flowerType: Math.floor(Math.random() * 3),
                    flowerX: Math.random() * 14 + 3,
                    flowerY: Math.random() * 14 + 3,
                    grassBlades: [
                        { x: Math.random() * 18 + 2, h: Math.random() * 5 + 3 },
                        { x: Math.random() * 18 + 2, h: Math.random() * 5 + 3 },
                    ],
                };
            }
        }
    },

    regenerateGrassNoise: function() {
        this._generateGrassNoise();
        this._generateFogPattern();
        this._generateStarfield();
    },

    _drawStarfield: function(ctx) {
        var frame = this.animFrame;

        // Far stars (fixed in screen space)
        for (var i = 0; i < this.farStars.length; i++) {
            var star = this.farStars[i];
            var twinkle = Math.sin(frame * star.twinkleSpeed + star.twinkleOffset);
            var alpha = star.baseAlpha + twinkle * 0.25;
            if (alpha < 0.1) continue;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        // Near stars (slight parallax with camera)
        var camOffX = this.camera.x * 0.02;
        var camOffY = this.camera.y * 0.02;

        for (var j = 0; j < this.nearStars.length; j++) {
            var nstar = this.nearStars[j];
            var ntwinkle = Math.sin(frame * nstar.twinkleSpeed + nstar.twinkleOffset);
            var nalpha = nstar.baseAlpha + ntwinkle * 0.3;
            if (nalpha < 0.1) continue;

            var sx = nstar.x - camOffX * nstar.parallaxFactor * 20;
            var sy = nstar.y - camOffY * nstar.parallaxFactor * 20;

            // Wrap around viewport
            sx = ((sx % this.viewportW) + this.viewportW) % this.viewportW;
            sy = ((sy % this.viewportH) + this.viewportH) % this.viewportH;

            ctx.globalAlpha = nalpha;
            ctx.fillStyle = nstar.color;

            if (nstar.size >= 3) {
                // Larger stars get a slight glow
                ctx.beginPath();
                ctx.arc(sx, sy, nstar.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(sx, sy, nstar.size, nstar.size);
            }
        }

        ctx.globalAlpha = 1;
    },

    draw: function(world, agent, time) {
        this.animFrame++;
        var ctx = this.ctx;
        var ts = SB.TILE_SIZE;

        this._updateCamera(agent);
        world.updateFogPulses();

        // Clear entire canvas with void/space background
        ctx.fillStyle = SB.Colors.void_bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Save state, set up clipping for viewport
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.viewportW, this.viewportH);
        ctx.clip();

        // Draw starfield BEFORE camera transform (screen space)
        this._drawStarfield(ctx);

        // Apply camera transform
        var zoom = this.camera.zoom;
        var camX = this.camera.x - (this.viewportW / 2) / zoom;
        var camY = this.camera.y - (this.viewportH / 2) / zoom;

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-camX, -camY);

        // Compute visible tile range for culling
        var minTX = Math.max(0, Math.floor(camX / ts) - 1);
        var minTY = Math.max(0, Math.floor(camY / ts) - 1);
        var maxTX = Math.min(SB.WORLD_WIDTH - 1, Math.ceil((camX + this.viewportW / zoom) / ts) + 1);
        var maxTY = Math.min(SB.WORLD_HEIGHT - 1, Math.ceil((camY + this.viewportH / zoom) / ts) + 1);

        // Draw tiles (only visible ones) - skip VOID tiles
        for (var y = minTY; y <= maxTY; y++) {
            for (var x = minTX; x <= maxTX; x++) {
                var tile = world.tiles[y][x];
                if (tile.type === SB.Tiles.VOID) continue; // Let starfield show through

                var px = x * ts;
                var py = y * ts;
                var fogAlpha = world.getFogAlpha(x, y);
                if (fogAlpha < 1.0) {
                    this._drawTile(ctx, tile, px, py, ts, x, y);
                }
            }
        }

        // Draw cliff edges (separate pass for depth effect)
        for (var cy = minTY; cy <= maxTY; cy++) {
            for (var cx = minTX; cx <= maxTX; cx++) {
                var ctile = world.tiles[cy][cx];
                if (ctile.type === SB.Tiles.CLIFF) {
                    var cfogAlpha = world.getFogAlpha(cx, cy);
                    if (cfogAlpha < 1.0) {
                        this._drawCliffEdge(ctx, cx, cy, ts);
                    }
                }
            }
        }

        // Draw resources
        for (var ry = minTY; ry <= maxTY; ry++) {
            for (var rx = minTX; rx <= maxTX; rx++) {
                var rtile = world.tiles[ry][rx];
                if (rtile.resource && !rtile.building && world.isRevealed(rx, ry)) {
                    this._drawResource(ctx, rtile, rx * ts, ry * ts, ts);
                }
            }
        }

        // Draw buildings
        for (var bi = 0; bi < world.buildings.length; bi++) {
            var building = world.buildings[bi];
            if (world.isRevealed(building.x, building.y)) {
                this._drawBuilding(ctx, building, ts);
            }
        }

        // Draw agent
        this._drawAgent(ctx, agent, ts);

        // Day/night overlay
        this._drawDayNight(ctx, world, agent, time, ts);

        // Draw fog overlay (skip void tiles)
        this._drawFog(ctx, world, ts, minTX, minTY, maxTX, maxTY);

        // Draw fog pulse animations
        this._drawFogPulses(ctx, world, ts);

        // Restore camera transform
        ctx.restore();
        // Restore clipping
        ctx.restore();

        // HUD
        this._drawHUD(ctx, world, agent, time);
    },

    _drawTile: function(ctx, tile, px, py, ts, x, y) {
        var noise = this.grassNoise[y] ? this.grassNoise[y][x] : null;

        switch (tile.type) {
            case SB.Tiles.GRASS: {
                var colors = [SB.Colors.grass1, SB.Colors.grass2, SB.Colors.grass3, SB.Colors.grass4];
                var ci = noise ? Math.floor(noise.color * 4) : 0;
                ctx.fillStyle = colors[ci];
                ctx.fillRect(px, py, ts, ts);

                if (noise) {
                    ctx.strokeStyle = 'rgba(80, 160, 60, 0.25)';
                    ctx.lineWidth = 1;
                    for (var b = 0; b < noise.grassBlades.length; b++) {
                        var blade = noise.grassBlades[b];
                        ctx.beginPath();
                        ctx.moveTo(px + blade.x, py + ts);
                        ctx.lineTo(px + blade.x - 1, py + ts - blade.h);
                        ctx.stroke();
                    }

                    if (noise.hasFlower && !tile.resource && !tile.building) {
                        var flowerColors = [SB.Colors.grass_flower1, SB.Colors.grass_flower2, SB.Colors.grass_flower3];
                        ctx.fillStyle = flowerColors[noise.flowerType];
                        ctx.beginPath();
                        ctx.arc(px + noise.flowerX, py + noise.flowerY, 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.beginPath();
                        ctx.arc(px + noise.flowerX, py + noise.flowerY, 0.8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case SB.Tiles.CLIFF: {
                // Draw cliff top surface (slightly darker earth tone)
                ctx.fillStyle = SB.Colors.cliff_top;
                ctx.fillRect(px, py, ts, ts);
                // Rocky texture
                ctx.fillStyle = SB.Colors.cliff_edge;
                ctx.fillRect(px + 2, py + 4, 3, 2);
                ctx.fillRect(px + 10, py + 8, 4, 2);
                ctx.fillRect(px + 6, py + 16, 3, 2);
                break;
            }
            case SB.Tiles.WATER: {
                var t = this.animFrame * 0.03;
                var wave = Math.sin(t + x * 0.8 + y * 0.6) * 0.3 + 0.5;
                var wave2 = Math.sin(t * 0.7 + x * 0.5 - y * 0.9) * 0.2;

                ctx.fillStyle = wave > 0.5 ? SB.Colors.water_light : SB.Colors.water_mid;
                ctx.fillRect(px, py, ts, ts);

                if (wave + wave2 < 0.4) {
                    ctx.fillStyle = SB.Colors.water_deep;
                    ctx.fillRect(px, py, ts, ts);
                }

                if (wave > 0.7) {
                    ctx.fillStyle = 'rgba(150, 210, 255, 0.15)';
                    var hw = ts * 0.6;
                    ctx.fillRect(px + (ts - hw) / 2, py + (ts - hw) / 2, hw, hw * 0.3);
                }
                break;
            }
            case SB.Tiles.STONE_DEPOSIT: {
                ctx.fillStyle = SB.Colors.stone_deposit;
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = SB.Colors.stone_deposit_dark;
                ctx.fillRect(px + 3, py + 5, ts - 8, 1);
                ctx.fillRect(px + 8, py + 12, ts - 12, 1);
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(px, py, ts, 2);
                break;
            }
            case SB.Tiles.DIRT: {
                ctx.fillStyle = SB.Colors.dirt;
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = SB.Colors.dirt_dark;
                ctx.fillRect(px + 4, py + 6, 2, 2);
                ctx.fillRect(px + 14, py + 10, 2, 1);
                break;
            }
            case SB.Tiles.FARMLAND: {
                ctx.fillStyle = SB.Colors.farmland;
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = SB.Colors.farmland_dark;
                for (var row = 0; row < 3; row++) {
                    ctx.fillRect(px + 1, py + 4 + row * 7, ts - 2, 2);
                }
                break;
            }
        }
    },

    _drawCliffEdge: function(ctx, x, y, ts) {
        var px = x * ts;
        var py = y * ts;
        var neighbors = SB.World.getVoidNeighbors(x, y);
        var cliffDepth = 8;

        // Draw cliff face extending into void direction
        if (neighbors.bottom) {
            // Bottom edge: draw cliff face below
            ctx.fillStyle = SB.Colors.cliff_face;
            ctx.fillRect(px, py + ts, ts, cliffDepth);
            // Shadow at bottom
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px, py + ts + cliffDepth - 3, ts, 3);
            // Highlight at top of cliff face
            ctx.fillStyle = 'rgba(120,100,80,0.3)';
            ctx.fillRect(px, py + ts, ts, 2);
        }
        if (neighbors.right) {
            ctx.fillStyle = SB.Colors.cliff_face;
            ctx.fillRect(px + ts, py, cliffDepth, ts);
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px + ts + cliffDepth - 3, py, 3, ts);
            ctx.fillStyle = 'rgba(120,100,80,0.2)';
            ctx.fillRect(px + ts, py, 2, ts);
        }
        if (neighbors.left) {
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px - cliffDepth, py, cliffDepth, ts);
            ctx.fillStyle = SB.Colors.cliff_face;
            ctx.fillRect(px - cliffDepth + 3, py, cliffDepth - 3, ts);
        }
        if (neighbors.top) {
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px, py - cliffDepth, ts, cliffDepth);
            ctx.fillStyle = SB.Colors.cliff_face;
            ctx.fillRect(px, py - cliffDepth + 3, ts, cliffDepth - 3);
        }

        // Corner shadows for more depth when two edges meet
        if (neighbors.bottom && neighbors.right) {
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px + ts, py + ts, cliffDepth, cliffDepth);
        }
        if (neighbors.bottom && neighbors.left) {
            ctx.fillStyle = SB.Colors.cliff_shadow;
            ctx.fillRect(px - cliffDepth, py + ts, cliffDepth, cliffDepth);
        }

        // Subtle inner shadow on the cliff tile itself
        if (neighbors.bottom || neighbors.right || neighbors.left || neighbors.top) {
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            if (neighbors.bottom) ctx.fillRect(px, py + ts - 3, ts, 3);
            if (neighbors.right) ctx.fillRect(px + ts - 3, py, 3, ts);
            if (neighbors.left) ctx.fillRect(px, py, 3, ts);
            if (neighbors.top) ctx.fillRect(px, py, ts, 3);
        }
    },

    _drawResource: function(ctx, tile, px, py, ts) {
        var cx = px + ts / 2;
        var cy = py + ts / 2;

        switch (tile.resource) {
            case SB.Resources.TREE: {
                var sway = Math.sin(this.animFrame * 0.02 + px * 0.1) * 0.5;

                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(cx + 1, py + ts - 2, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = SB.Colors.tree_trunk;
                ctx.fillRect(cx - 2, cy + 2, 4, ts / 2 - 3);
                ctx.fillStyle = SB.Colors.tree_trunk_dark;
                ctx.fillRect(cx - 1, cy + 4, 1, ts / 2 - 6);

                var canopyColors = [SB.Colors.tree_canopy1, SB.Colors.tree_canopy2];
                ctx.fillStyle = canopyColors[0];
                ctx.beginPath();
                ctx.arc(cx - 1 + sway, cy - 1, ts / 2.5 + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = canopyColors[1];
                ctx.beginPath();
                ctx.arc(cx + 1 + sway, cy + 1, ts / 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = SB.Colors.tree_highlight;
                ctx.beginPath();
                ctx.arc(cx - 2 + sway, cy - 3, ts / 6, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case SB.Resources.BERRY_BUSH: {
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.beginPath();
                ctx.ellipse(cx, py + ts - 2, 7, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = SB.Colors.berry_bush;
                ctx.beginPath();
                ctx.arc(cx, cy + 1, ts / 2.8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = SB.Colors.berry_bush_dark;
                ctx.beginPath();
                ctx.arc(cx + 1, cy + 3, ts / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(100, 200, 80, 0.3)';
                ctx.beginPath();
                ctx.arc(cx - 2, cy - 2, ts / 5, 0, Math.PI * 2);
                ctx.fill();

                if (tile.resourceAmount > 0) {
                    var positions = [
                        { x: -4, y: -2 }, { x: 3, y: -3 }, { x: 0, y: 3 },
                        { x: -3, y: 2 }, { x: 4, y: 1 },
                    ];
                    for (var i = 0; i < Math.min(tile.resourceAmount, 4); i++) {
                        var p = positions[i];
                        ctx.fillStyle = SB.Colors.berry;
                        ctx.beginPath();
                        ctx.arc(cx + p.x, cy + p.y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = SB.Colors.berry_highlight;
                        ctx.beginPath();
                        ctx.arc(cx + p.x - 0.5, cy + p.y - 1, 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case SB.Resources.STONE: {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(cx + 1, cy + 5, 7, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = SB.Colors.stone_resource;
                ctx.beginPath();
                ctx.moveTo(cx - 7, cy + 4);
                ctx.lineTo(cx - 5, cy - 4);
                ctx.lineTo(cx + 2, cy - 5);
                ctx.lineTo(cx + 7, cy - 2);
                ctx.lineTo(cx + 6, cy + 4);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = SB.Colors.stone_highlight;
                ctx.beginPath();
                ctx.moveTo(cx - 5, cy - 4);
                ctx.lineTo(cx + 2, cy - 5);
                ctx.lineTo(cx + 1, cy - 1);
                ctx.lineTo(cx - 4, cy - 1);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = SB.Colors.stone_shadow;
                ctx.beginPath();
                ctx.moveTo(cx + 7, cy - 2);
                ctx.lineTo(cx + 6, cy + 4);
                ctx.lineTo(cx + 2, cy + 3);
                ctx.lineTo(cx + 3, cy - 1);
                ctx.closePath();
                ctx.fill();
                break;
            }
        }
    },

    _drawBuilding: function(ctx, building, ts) {
        var px = building.x * ts;
        var py = building.y * ts;
        var w = building.width * ts;
        var h = building.height * ts;

        switch (building.type) {
            case SB.BuildingTypes.SHELTER: {
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(px + 3, py + h - 2, w - 4, 4);

                ctx.fillStyle = SB.Colors.dirt;
                ctx.fillRect(px + 2, py + 2, w - 4, h - 4);

                ctx.fillStyle = SB.Colors.shelter_wall;
                ctx.fillRect(px + 2, py + 2, w - 4, 4);
                ctx.fillRect(px + 2, py + h - 6, w - 4, 4);
                ctx.fillRect(px + 2, py + 2, 4, h - 4);
                ctx.fillRect(px + w - 6, py + 2, 4, h - 4);

                ctx.fillStyle = SB.Colors.shelter_wall_dark;
                ctx.fillRect(px + 2, py + h - 8, w - 4, 2);

                ctx.fillStyle = SB.Colors.shelter_roof;
                ctx.fillRect(px + 6, py + 6, w - 12, h - 14);
                ctx.fillStyle = SB.Colors.shelter_roof_dark;
                for (var si = 0; si < 3; si++) {
                    ctx.fillRect(px + 6, py + 8 + si * 8, w - 12, 1);
                }

                ctx.fillStyle = SB.Colors.shelter_door;
                var doorX = px + w / 2 - 4;
                var doorY = py + h - 10;
                ctx.fillRect(doorX, doorY, 8, 8);
                ctx.fillStyle = SB.Colors.shelter_wall;
                ctx.fillRect(doorX + 6, doorY + 4, 1.5, 1.5);

                ctx.fillStyle = SB.Colors.shelter_window;
                ctx.fillRect(px + 8, py + 10, 6, 5);
                ctx.fillRect(px + w - 14, py + 10, 6, 5);
                ctx.strokeStyle = SB.Colors.shelter_wall_dark;
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 8, py + 10, 6, 5);
                ctx.strokeRect(px + w - 14, py + 10, 6, 5);
                ctx.lineWidth = 1;
                break;
            }
            case SB.BuildingTypes.FARM: {
                ctx.strokeStyle = SB.Colors.shelter_wall;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);

                var postPositions = [
                    [px + 1, py + 1], [px + w - 2, py + 1],
                    [px + 1, py + h - 2], [px + w - 2, py + h - 2],
                ];
                ctx.fillStyle = SB.Colors.shelter_wall;
                for (var fp = 0; fp < postPositions.length; fp++) {
                    ctx.fillRect(postPositions[fp][0] - 1, postPositions[fp][1] - 1, 3, 3);
                }

                for (var fdy = 0; fdy < building.height; fdy++) {
                    for (var fdx = 0; fdx < building.width; fdx++) {
                        var ftile = SB.World.tiles[building.y + fdy] ? SB.World.tiles[building.y + fdy][building.x + fdx] : null;
                        if (!ftile || ftile.type !== SB.Tiles.FARMLAND) continue;

                        var cropX = (building.x + fdx) * ts;
                        var cropY = (building.y + fdy) * ts;

                        if (ftile.growthTimer <= 0) {
                            for (var fc = 0; fc < 3; fc++) {
                                var fsx = cropX + 4 + fc * 7;
                                ctx.fillStyle = SB.Colors.farm_crop;
                                ctx.fillRect(fsx, cropY + 5, 2, ts - 8);
                                ctx.fillStyle = SB.Colors.farm_crop_dark;
                                ctx.fillRect(fsx - 2, cropY + 10, 3, 2);
                                ctx.fillRect(fsx + 2, cropY + 14, 3, 2);
                                ctx.fillStyle = SB.Colors.farm_crop_grain;
                                ctx.beginPath();
                                ctx.arc(fsx + 1, cropY + 4, 3, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else {
                            var growth = 1 - (ftile.growthTimer / 50);
                            ctx.fillStyle = SB.Colors.farm_crop_young;
                            for (var gc = 0; gc < 3; gc++) {
                                var gsx = cropX + 4 + gc * 7;
                                var sproutH = Math.max(2, growth * (ts - 8));
                                ctx.fillRect(gsx, cropY + ts - 3 - sproutH, 2, sproutH);
                                if (growth > 0.4) {
                                    ctx.fillRect(gsx - 1, cropY + ts - 3 - sproutH * 0.5, 2, 1);
                                }
                            }
                        }
                    }
                }
                ctx.lineWidth = 1;
                break;
            }
            case SB.BuildingTypes.STORAGE: {
                // Wooden crate with roof
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(px + 3, py + h - 2, w - 4, 4);

                // Main crate body
                ctx.fillStyle = SB.Colors.storage_wood;
                ctx.fillRect(px + 3, py + 6, w - 6, h - 8);

                // Crate slats (horizontal)
                ctx.fillStyle = SB.Colors.storage_wood_dark;
                ctx.fillRect(px + 3, py + 10, w - 6, 1);
                ctx.fillRect(px + 3, py + 16, w - 6, 1);
                ctx.fillRect(px + 3, py + 22, w - 6, 1);
                // Vertical divider
                ctx.fillRect(px + w / 2 - 1, py + 6, 2, h - 8);

                // Roof
                ctx.fillStyle = SB.Colors.storage_roof;
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px + w / 2, py);
                ctx.lineTo(px + w, py + 6);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = SB.Colors.storage_wood_dark;
                ctx.beginPath();
                ctx.moveTo(px + w / 2, py);
                ctx.lineTo(px + w, py + 6);
                ctx.lineTo(px + w / 2, py + 4);
                ctx.closePath();
                ctx.fill();

                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px + 4, py + 7, w / 2 - 5, h - 10);
                break;
            }
            case SB.BuildingTypes.WELL: {
                // Circular stone well
                var wcx = px + w / 2;
                var wcy = py + h / 2 + 2;

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(wcx + 1, wcy + 6, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Stone ring (outer)
                ctx.fillStyle = SB.Colors.well_stone;
                ctx.beginPath();
                ctx.ellipse(wcx, wcy, 10, 8, 0, 0, Math.PI * 2);
                ctx.fill();

                // Inner water
                ctx.fillStyle = SB.Colors.well_water;
                ctx.beginPath();
                ctx.ellipse(wcx, wcy, 6, 5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Water shimmer
                var wt = this.animFrame * 0.04;
                ctx.fillStyle = 'rgba(100,180,255,0.3)';
                ctx.beginPath();
                ctx.ellipse(wcx - 1, wcy - 1 + Math.sin(wt) * 0.5, 3, 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Stone detail
                ctx.fillStyle = SB.Colors.well_stone_dark;
                ctx.fillRect(wcx - 9, wcy - 2, 2, 2);
                ctx.fillRect(wcx + 7, wcy, 2, 2);
                ctx.fillRect(wcx - 1, wcy - 7, 2, 2);

                // Rope post
                ctx.fillStyle = SB.Colors.storage_wood_dark;
                ctx.fillRect(wcx + 8, wcy - 12, 2, 14);
                // Crossbar
                ctx.fillRect(wcx + 4, wcy - 12, 10, 2);
                // Rope
                ctx.strokeStyle = '#8a7a60';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(wcx + 9, wcy - 10);
                ctx.lineTo(wcx + 9, wcy - 3);
                ctx.stroke();
                ctx.lineWidth = 1;
                break;
            }
            case SB.BuildingTypes.WORKSHOP: {
                // Larger building with workbench
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(px + 3, py + h - 2, w - 4, 4);

                // Floor
                ctx.fillStyle = SB.Colors.dirt;
                ctx.fillRect(px + 2, py + 6, w - 4, h - 8);

                // Walls
                ctx.fillStyle = SB.Colors.workshop_wall;
                ctx.fillRect(px + 2, py + 6, w - 4, 3);
                ctx.fillRect(px + 2, py + h - 5, w - 4, 3);
                ctx.fillRect(px + 2, py + 6, 3, h - 8);
                ctx.fillRect(px + w - 5, py + 6, 3, h - 8);

                // Roof
                ctx.fillStyle = SB.Colors.workshop_roof;
                ctx.beginPath();
                ctx.moveTo(px, py + 6);
                ctx.lineTo(px + w / 2, py - 2);
                ctx.lineTo(px + w, py + 6);
                ctx.closePath();
                ctx.fill();
                // Roof shading
                ctx.fillStyle = SB.Colors.workshop_wall_dark;
                ctx.beginPath();
                ctx.moveTo(px + w / 2, py - 2);
                ctx.lineTo(px + w, py + 6);
                ctx.lineTo(px + w / 2, py + 3);
                ctx.closePath();
                ctx.fill();

                // Workbench inside
                ctx.fillStyle = SB.Colors.storage_wood;
                ctx.fillRect(px + 8, py + 14, w - 20, 6);
                ctx.fillStyle = SB.Colors.storage_wood_dark;
                ctx.fillRect(px + 8, py + 18, 2, 6);
                ctx.fillRect(px + w - 14, py + 18, 2, 6);

                // Anvil
                ctx.fillStyle = '#555';
                ctx.fillRect(px + w - 22, py + 16, 6, 2);
                ctx.fillRect(px + w - 21, py + 14, 4, 2);
                ctx.fillRect(px + w - 20, py + 18, 2, 4);

                // Window
                ctx.fillStyle = SB.Colors.shelter_window;
                ctx.fillRect(px + 12, py + 8, 5, 4);
                ctx.fillRect(px + w - 20, py + 8, 5, 4);

                // Door
                ctx.fillStyle = SB.Colors.shelter_door;
                ctx.fillRect(px + w / 2 - 4, py + h - 10, 8, 7);
                break;
            }
            case SB.BuildingTypes.WATCHTOWER: {
                // Tall structure drawn to appear tall
                var twcx = px + w / 2;

                // Foundation shadow
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(px + 2, py + h - 2, w - 4, 4);

                // Support legs (4 posts)
                ctx.fillStyle = SB.Colors.watchtower_wood;
                ctx.fillRect(px + 4, py + 10, 3, h - 12);
                ctx.fillRect(px + w - 7, py + 10, 3, h - 12);

                // Cross bracing
                ctx.strokeStyle = SB.Colors.watchtower_wood_dark;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(px + 5, py + 14);
                ctx.lineTo(px + w - 6, py + h - 8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + w - 6, py + 14);
                ctx.lineTo(px + 5, py + h - 8);
                ctx.stroke();
                ctx.lineWidth = 1;

                // Platform
                ctx.fillStyle = SB.Colors.watchtower_wood;
                ctx.fillRect(px, py + 8, w, 4);
                ctx.fillStyle = SB.Colors.watchtower_wood_dark;
                ctx.fillRect(px, py + 11, w, 1);

                // Railing
                ctx.fillStyle = SB.Colors.watchtower_wood;
                ctx.fillRect(px + 1, py + 2, 2, 7);
                ctx.fillRect(px + w - 3, py + 2, 2, 7);
                ctx.fillRect(px, py + 2, w, 2);

                // Roof (pointed)
                ctx.fillStyle = SB.Colors.shelter_roof;
                ctx.beginPath();
                ctx.moveTo(px - 1, py + 2);
                ctx.lineTo(twcx, py - 6);
                ctx.lineTo(px + w + 1, py + 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = SB.Colors.shelter_roof_dark;
                ctx.beginPath();
                ctx.moveTo(twcx, py - 6);
                ctx.lineTo(px + w + 1, py + 2);
                ctx.lineTo(twcx, py);
                ctx.closePath();
                ctx.fill();

                // Flag
                var flagWave = Math.sin(this.animFrame * 0.06) * 2;
                ctx.fillStyle = '#cc3333';
                ctx.beginPath();
                ctx.moveTo(twcx, py - 6);
                ctx.lineTo(twcx + 8, py - 10 + flagWave);
                ctx.lineTo(twcx, py - 8);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case SB.BuildingTypes.WALL: {
                // Stone block segment
                ctx.fillStyle = SB.Colors.wall_stone;
                ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

                // Top highlight
                ctx.fillStyle = SB.Colors.wall_stone_light;
                ctx.fillRect(px + 1, py + 1, ts - 2, 3);

                // Shadow on right and bottom
                ctx.fillStyle = SB.Colors.wall_stone_dark;
                ctx.fillRect(px + ts - 4, py + 1, 3, ts - 2);
                ctx.fillRect(px + 1, py + ts - 4, ts - 2, 3);

                // Mortar lines
                ctx.strokeStyle = '#444455';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
                // Horizontal mortar
                ctx.beginPath();
                ctx.moveTo(px + 2, py + ts / 2);
                ctx.lineTo(px + ts - 2, py + ts / 2);
                ctx.stroke();
                // Vertical mortar (offset on rows)
                ctx.beginPath();
                ctx.moveTo(px + ts / 2, py + 2);
                ctx.lineTo(px + ts / 2, py + ts / 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(px + ts / 3, py + ts / 2);
                ctx.lineTo(px + ts / 3, py + ts - 2);
                ctx.stroke();
                ctx.lineWidth = 1;
                break;
            }
        }
    },

    _drawAgent: function(ctx, agent, ts) {
        var px = agent.x * ts + ts / 2;
        var py = agent.y * ts;
        var walking = agent.status && agent.status.indexOf('Walk') >= 0;
        var legAnim = walking ? Math.sin(agent.walkFrame * 0.8) : 0;

        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(px, py + ts - 1, 7, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (agent.isSleeping) {
            var ly = py + ts - 8;

            ctx.fillStyle = '#5577bb';
            ctx.beginPath();
            ctx.roundRect(px - 10, ly - 2, 20, 7, 3);
            ctx.fill();

            ctx.fillStyle = '#4466aa';
            ctx.beginPath();
            ctx.roundRect(px - 8, ly - 1, 16, 5, 2);
            ctx.fill();

            ctx.fillStyle = SB.Colors.agent_skin;
            ctx.beginPath();
            ctx.arc(px - 9, ly - 1, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ddd';
            ctx.beginPath();
            ctx.ellipse(px - 9, ly + 2, 5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = SB.Colors.agent_eye;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px - 11, ly - 2);
            ctx.lineTo(px - 8, ly - 2);
            ctx.stroke();
            ctx.lineWidth = 1;

            ctx.fillStyle = '#aaccff';
            var zt = this.animFrame * 0.06;
            var z1y = Math.sin(zt) * 3;
            ctx.globalAlpha = 0.8;
            ctx.font = 'bold 10px monospace';
            ctx.fillText('z', px, ly - 12 + z1y);
            ctx.font = '7px monospace';
            ctx.globalAlpha = 0.5;
            ctx.fillText('z', px + 6, ly - 19 + z1y * 0.7);
            ctx.globalAlpha = 1;
        } else {
            var bodyTop = py + 4;

            ctx.fillStyle = '#4a6a9a';
            var legW = 2.5;
            var legH = 7;
            var legSpread = walking ? legAnim * 3 : 0;
            ctx.fillRect(px - 3.5, bodyTop + 12, legW, legH + legSpread);
            ctx.fillRect(px + 1, bodyTop + 12, legW, legH - legSpread);
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(px - 4, bodyTop + 18 + Math.max(0, legSpread), 3.5, 2);
            ctx.fillRect(px + 0.5, bodyTop + 18 + Math.max(0, -legSpread), 3.5, 2);

            ctx.fillStyle = '#dd6644';
            ctx.beginPath();
            ctx.roundRect(px - 5, bodyTop + 5, 10, 9, 2);
            ctx.fill();
            ctx.fillStyle = '#cc5533';
            ctx.fillRect(px - 2, bodyTop + 5, 4, 2);

            ctx.fillStyle = SB.Colors.agent_skin;
            var armSwing = walking ? legAnim * 2.5 : 0;
            ctx.fillRect(px - 7, bodyTop + 6 - armSwing, 2.5, 8);
            ctx.fillRect(px + 4.5, bodyTop + 6 + armSwing, 2.5, 8);

            if (agent.status) {
                if (agent.status.indexOf('Chop') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(px + 6, bodyTop + 3 + armSwing, 2, 10);
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(px + 5, bodyTop + 2 + armSwing, 4, 3);
                } else if (agent.status.indexOf('Mining') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(px + 6, bodyTop + 3 + armSwing, 2, 10);
                    ctx.fillStyle = '#999';
                    ctx.fillRect(px + 4, bodyTop + 2 + armSwing, 6, 2);
                } else if (agent.status.indexOf('Build') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(px + 6, bodyTop + 4 + armSwing, 2, 8);
                    ctx.fillStyle = '#888';
                    ctx.fillRect(px + 5, bodyTop + 3 + armSwing, 4, 3);
                }
            }

            ctx.fillStyle = SB.Colors.agent_skin;
            ctx.beginPath();
            ctx.arc(px, bodyTop + 1, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = SB.Colors.agent_hair;
            ctx.beginPath();
            ctx.arc(px, bodyTop - 2, 6, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(px - 6, bodyTop - 2, 2, 4);
            ctx.fillRect(px + 4, bodyTop - 2, 2, 4);

            var blink = Math.sin(this.animFrame * 0.05) > 0.95;

            if (agent.facing === 'up') {
                // Back of head
            } else if (agent.facing === 'left') {
                if (!blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(px - 3, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(px - 3.5, bodyTop - 0.8, 0.8, 0.8);
                }
            } else if (agent.facing === 'right') {
                if (!blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(px + 3, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(px + 2.5, bodyTop - 0.8, 0.8, 0.8);
                }
            } else {
                if (blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.fillRect(px - 4, bodyTop, 2.5, 0.8);
                    ctx.fillRect(px + 1.5, bodyTop, 2.5, 0.8);
                } else {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(px - 2.5, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.arc(px + 2.5, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(px - 3, bodyTop - 0.8, 0.8, 0.8);
                    ctx.fillRect(px + 2, bodyTop - 0.8, 0.8, 0.8);
                }
                ctx.strokeStyle = SB.Colors.agent_eye;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.arc(px, bodyTop + 3, 1.5, 0.2, Math.PI - 0.2);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        if (agent.status && !agent.isSleeping) {
            var bob = Math.sin(this.animFrame * 0.08) * 2;
            var bubbleY = py - 4 + bob;

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(px + 3, bubbleY + 6, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px + 5, bubbleY + 2, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.roundRect(px + 2, bubbleY - 12, 18, 14, 5);
            ctx.fill();

            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this._getActionIcon(agent.status), px + 11, bubbleY - 1);
        }
    },

    _getActionIcon: function(status) {
        if (status.indexOf('Chop') >= 0) return '\uD83E\uDE93';
        if (status.indexOf('Mining') >= 0 || status.indexOf('stone') >= 0) return '\u26CF';
        if (status.indexOf('berries') >= 0 || status.indexOf('Gather') >= 0) return '\uD83E\uDED0';
        if (status.indexOf('Eat') >= 0) return '\uD83C\uDF56';
        if (status.indexOf('Sleep') >= 0) return '\uD83D\uDCA4';
        if (status.indexOf('Build') >= 0) return '\uD83D\uDD28';
        if (status.indexOf('Harvest') >= 0) return '\uD83C\uDF3E';
        if (status.indexOf('Walk') >= 0) return '\uD83D\uDEB6';
        if (status.indexOf('Explor') >= 0) return '\uD83E\uDDED';
        if (status.indexOf('Wander') >= 0) return '\uD83D\uDC40';
        return '\uD83D\uDCAD';
    },

    _drawDayNight: function(ctx, world, agent, time, ts) {
        if (time.darkness <= 0.02) return;

        // Draw darkness per-tile, skipping VOID tiles so stars show through
        var zoom = this.camera.zoom;
        var camX = this.camera.x - (this.viewportW / 2) / zoom;
        var camY = this.camera.y - (this.viewportH / 2) / zoom;
        var minTX = Math.max(0, Math.floor(camX / ts) - 1);
        var minTY = Math.max(0, Math.floor(camY / ts) - 1);
        var maxTX = Math.min(SB.WORLD_WIDTH - 1, Math.ceil((camX + this.viewportW / zoom) / ts) + 1);
        var maxTY = Math.min(SB.WORLD_HEIGHT - 1, Math.ceil((camY + this.viewportH / zoom) / ts) + 1);

        ctx.fillStyle = SB.Colors.night_overlay + time.darkness + ')';
        for (var y = minTY; y <= maxTY; y++) {
            for (var x = minTX; x <= maxTX; x++) {
                var tile = world.tiles[y][x];
                if (tile.type === SB.Tiles.VOID) continue;
                ctx.fillRect(x * ts, y * ts, ts, ts);
            }
        }

        // Firelight glow near shelter
        var shelter = world.getBuilding(SB.BuildingTypes.SHELTER);
        if (shelter && time.darkness > 0.1) {
            var sx = (shelter.x + shelter.width / 2) * ts;
            var sy = (shelter.y + shelter.height / 2) * ts;
            var flicker = 1 + Math.sin(this.animFrame * 0.15) * 0.1;
            var glowRadius = ts * 5 * flicker;
            var gradient = ctx.createRadialGradient(sx, sy, 5, sx, sy, glowRadius);
            var glowAlpha = Math.min(time.darkness * 0.9, 0.35);
            gradient.addColorStop(0, SB.Colors.firelight + glowAlpha + ')');
            gradient.addColorStop(0.4, SB.Colors.firelight + (glowAlpha * 0.4) + ')');
            gradient.addColorStop(1, SB.Colors.firelight + '0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Agent personal glow
        if (agent.alive && time.darkness > 0.2) {
            var ax = agent.x * ts + ts / 2;
            var ay = agent.y * ts + ts / 2;
            var agentGlow = ctx.createRadialGradient(ax, ay, 2, ax, ay, ts * 2.5);
            agentGlow.addColorStop(0, 'rgba(255, 220, 150, 0.12)');
            agentGlow.addColorStop(1, 'rgba(255, 220, 150, 0)');
            ctx.fillStyle = agentGlow;
            ctx.beginPath();
            ctx.arc(ax, ay, ts * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    _drawFog: function(ctx, world, ts, minTX, minTY, maxTX, maxTY) {
        for (var y = minTY; y <= maxTY; y++) {
            for (var x = minTX; x <= maxTX; x++) {
                var tile = world.tiles[y][x];
                // Don't draw fog on void tiles - they show stars
                if (tile.type === SB.Tiles.VOID) continue;

                var fogAlpha = world.getFogAlpha(x, y);
                if (fogAlpha <= 0) continue;

                var fpx = x * ts;
                var fpy = y * ts;

                if (fogAlpha >= 0.95) {
                    ctx.fillStyle = 'rgba(8, 8, 20, 0.97)';
                    ctx.fillRect(fpx, fpy, ts, ts);
                    var hash = (x * 7 + y * 13) % 20;
                    if (hash < 3) {
                        ctx.fillStyle = 'rgba(15, 15, 35, 0.4)';
                        ctx.fillRect(fpx + 3, fpy + 5, ts - 6, ts - 10);
                    }
                } else {
                    ctx.fillStyle = SB.Colors.fog_edge + Math.min(fogAlpha * 0.85, 0.7) + ')';
                    ctx.fillRect(fpx, fpy, ts, ts);
                }
            }
        }
    },

    _drawFogPulses: function(ctx, world, ts) {
        for (var i = 0; i < world.fogPulses.length; i++) {
            var pulse = world.fogPulses[i];
            var pcx = pulse.x * ts + ts / 2;
            var pcy = pulse.y * ts + ts / 2;
            var pr = pulse.radius * ts;

            ctx.beginPath();
            ctx.arc(pcx, pcy, pr, 0, Math.PI * 2);
            ctx.strokeStyle = SB.Colors.fog_pulse + (pulse.alpha * 0.6) + ')';
            ctx.lineWidth = 3;
            ctx.stroke();

            var gradient = ctx.createRadialGradient(pcx, pcy, pr * 0.8, pcx, pcy, pr);
            gradient.addColorStop(0, 'rgba(120, 180, 255, 0)');
            gradient.addColorStop(1, SB.Colors.fog_pulse + (pulse.alpha * 0.15) + ')');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.lineWidth = 1;
        }
    },

    _drawHUD: function(ctx, world, agent, time) {
        var hudLeft = this.viewportW;
        var hudX = hudLeft + 20;
        var hudW = this.hudWidth - 40;
        var hudRight = hudX + hudW;

        // ── Background: dark wood/parchment feel ──
        ctx.fillStyle = '#1a1612';
        ctx.fillRect(hudLeft, 0, this.hudWidth, this.height);

        // Subtle wood grain texture lines
        ctx.fillStyle = 'rgba(60, 45, 30, 0.15)';
        for (var gi = 0; gi < 20; gi++) {
            var gy = gi * (this.height / 20) + ((gi * 37) % 15);
            ctx.fillRect(hudLeft, gy, this.hudWidth, 1);
        }

        // Left border accent (earthy)
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(hudLeft, 0, 3, this.height);
        ctx.fillStyle = 'rgba(120, 90, 50, 0.3)';
        ctx.fillRect(hudLeft + 3, 0, 1, this.height);

        var y = 28;
        ctx.textAlign = 'left';

        // ── AGENT NAME ──
        ctx.fillStyle = '#e8d5a8';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(agent.agentName || 'Agent', hudX, y);

        // Day counter (right side)
        ctx.fillStyle = '#8a7a60';
        ctx.font = '11px monospace';
        var timeIcon = time.isNight ? '\uD83C\uDF19' : '\u2600\uFE0F';
        var dayStr = timeIcon + ' Day ' + (time.dayCount + 1);
        ctx.fillText(dayStr, hudRight - ctx.measureText(dayStr).width, y);
        y += 8;

        // Traits
        if (agent.personalityTraits && agent.personalityTraits.length > 0) {
            ctx.font = '9px monospace';
            ctx.fillStyle = '#6a5a44';
            var traitStr = '';
            for (var ti = 0; ti < agent.personalityTraits.length; ti++) {
                var trait = SB.Personalities ? SB.Personalities[agent.personalityTraits[ti]] : null;
                if (trait) traitStr += trait.icon + ' ' + trait.name + '  ';
            }
            if (traitStr) ctx.fillText(traitStr.trim(), hudX, y);
            y += 4;
        }

        // Time progress bar
        this._drawFancyBar(ctx, hudX, y, hudW, 3, time.progress,
            time.isNight ? '#3a4a6a' : '#b8922a', '#0d0a06');
        y += 14;

        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        // ── STATUS ──
        ctx.fillStyle = '#7a6a50';
        ctx.font = '8px monospace';
        ctx.fillText('STATUS', hudX, y);
        y += 14;

        // Status dot + text
        var alive = agent.alive;
        ctx.fillStyle = alive ? '#6aaa55' : '#cc4444';
        ctx.beginPath();
        ctx.arc(hudX + 4, y - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = alive ? '#c8e8a8' : '#ff6666';
        ctx.font = 'bold 12px monospace';
        var statusText = alive ? agent.status : 'DEAD';
        if (statusText.length > 26) statusText = statusText.substring(0, 25) + '...';
        ctx.fillText(statusText, hudX + 14, y);
        y += 14;

        // Goal + Mood
        ctx.fillStyle = '#a08850';
        ctx.font = '10px monospace';
        var goalStr = 'Goal: ' + (agent.currentGoal || 'Idle');
        ctx.fillText(goalStr, hudX + 14, y);

        // Mood tag (right-aligned)
        if (agent.mood && SB.Moods && SB.Moods[agent.mood]) {
            var moodDef = SB.Moods[agent.mood];
            ctx.fillStyle = moodDef.color;
            ctx.font = '9px monospace';
            ctx.fillText(moodDef.label, hudX + hudW - ctx.measureText(moodDef.label).width, y);
        }
        y += 18;

        if (!alive) {
            ctx.fillStyle = '#cc6655';
            ctx.font = '11px monospace';
            ctx.fillText('Restarting...', hudX + 14, y);
            return;
        }

        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        // ── VITALS ──
        ctx.fillStyle = '#7a6a50';
        ctx.font = '8px monospace';
        ctx.fillText('VITALS', hudX, y);
        y += 14;

        // Hunger
        ctx.fillStyle = '#8a7a60';
        ctx.font = '10px monospace';
        ctx.fillText('Hunger', hudX, y);
        var hColor = agent.hunger < 25 ? '#cc3333' : agent.hunger < 50 ? '#cc7744' : '#bb6644';
        this._drawFancyBar(ctx, hudX + 55, y - 8, hudW - 85, 10, agent.hunger / 100,
            hColor, '#1a0d0a');
        ctx.fillStyle = agent.hunger < 25 ? '#ee5544' : '#9a8a70';
        ctx.fillText(Math.round(agent.hunger), hudRight - 22, y);
        y += 18;

        // Energy
        ctx.fillStyle = '#8a7a60';
        ctx.fillText('Energy', hudX, y);
        var eColor = agent.energy < 25 ? '#cc3333' : agent.energy < 50 ? '#88aa44' : '#55aa44';
        this._drawFancyBar(ctx, hudX + 55, y - 8, hudW - 85, 10, agent.energy / 100,
            eColor, '#0a1a0a');
        ctx.fillStyle = agent.energy < 25 ? '#ee5544' : '#9a8a70';
        ctx.fillText(Math.round(agent.energy), hudRight - 22, y);
        y += 20;

        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        // ── INVENTORY ──
        ctx.fillStyle = '#7a6a50';
        ctx.font = '8px monospace';
        ctx.fillText('INVENTORY', hudX, y);
        y += 16;

        ctx.font = '11px monospace';
        var colW = Math.floor(hudW / 3);
        // Wood
        ctx.fillStyle = '#aa9966';
        ctx.fillText('\uD83E\uDEB5 ' + agent.inventory.wood, hudX, y);
        // Stone
        ctx.fillStyle = '#999999';
        ctx.fillText('\uD83E\uDEA8 ' + agent.inventory.stone, hudX + colW, y);
        // Food
        ctx.fillStyle = '#bb7766';
        ctx.fillText('\uD83C\uDF4E ' + agent.inventory.food, hudX + colW * 2, y);
        y += 20;

        // ── BUILDINGS ──
        if (world.buildings.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#7a6a50';
            ctx.font = '8px monospace';
            ctx.fillText('BUILDINGS', hudX, y);
            y += 14;

            ctx.font = '11px monospace';
            var buildingIcons = { shelter: '\uD83C\uDFE0', farm: '\uD83C\uDF3E', storage: '\uD83D\uDCE6',
                well: '\uD83D\uDCA7', workshop: '\uD83D\uDD27', watchtower: '\uD83D\uDDFC' };
            var bx = hudX;
            for (var bhi = 0; bhi < world.buildings.length; bhi++) {
                var bld = world.buildings[bhi];
                if (bld.type === SB.BuildingTypes.WALL) continue;
                var bIcon = buildingIcons[bld.type] || '\uD83C\uDFE0';
                ctx.fillStyle = '#c8b888';
                ctx.fillText(bIcon, bx, y);
                bx += 24;
                if (bx > hudRight - 20) { bx = hudX; y += 18; }
            }
            var wallCount = world.getBuildingCount(SB.BuildingTypes.WALL);
            if (wallCount > 0) {
                ctx.fillStyle = '#8a7a60';
                ctx.font = '9px monospace';
                ctx.fillText('\uD83E\uDDF1\u00d7' + wallCount, bx, y);
            }
            y += 20;
        }

        // ── EXPLORATION ──
        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        ctx.fillStyle = '#7a6a50';
        ctx.font = '8px monospace';
        ctx.fillText('EXPLORED', hudX, y);

        var exploredPct = world.getRevealedPercent();
        ctx.fillStyle = '#b8a878';
        ctx.font = '11px monospace';
        ctx.fillText(exploredPct + '%', hudX + 70, y);
        this._drawFancyBar(ctx, hudX + 100, y - 8, hudW - 100, 10, exploredPct / 100,
            '#5a7a4a', '#0a1008');
        y += 12;

        // Milestones
        if (agent.milestones && agent.milestones.length > 0) {
            y += 4;
            ctx.font = '9px monospace';
            ctx.fillStyle = '#7a8a5a';
            for (var mi = 0; mi < Math.min(agent.milestones.length, 3); mi++) {
                var ms = agent.milestones[mi];
                ctx.fillText('\u2713 ' + ms.name, hudX + 4, y);
                y += 12;
            }
        }
        y += 8;

        // ── THOUGHTS ──
        if (agent.thoughts && agent.thoughts.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#7a6a50';
            ctx.font = '8px monospace';
            ctx.fillText('THOUGHTS', hudX, y);
            y += 14;

            ctx.font = '9px monospace';
            var tCount = Math.min(agent.thoughts.length, 3);
            for (var thi = 0; thi < tCount; thi++) {
                var thAlpha = 0.6 - (thi * 0.15);
                ctx.fillStyle = 'rgba(200, 185, 150, ' + thAlpha + ')';
                var tText = '\u201C' + agent.thoughts[thi].text + '\u201D';
                if (tText.length > 34) tText = tText.substring(0, 33) + '\u2026\u201D';
                ctx.fillText(tText, hudX, y);
                y += 13;
            }
            y += 4;
        }

        // ── KNOWLEDGE ──
        if (agent.knowledge && agent.knowledge.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#7a6a50';
            ctx.font = '8px monospace';
            ctx.fillText('KNOWLEDGE', hudX, y);
            y += 14;

            ctx.font = '9px monospace';
            ctx.fillStyle = '#6a8a5a';
            var kx = hudX;
            for (var ki = 0; ki < agent.knowledge.length; ki++) {
                var disc = SB.Discoveries ? SB.Discoveries[agent.knowledge[ki]] : null;
                if (!disc) continue;
                var kText = disc.name;
                var kWidth = ctx.measureText(kText).width + 12;
                if (kx + kWidth > hudRight) { kx = hudX; y += 14; }
                ctx.fillText(kText, kx, y);
                kx += kWidth;
            }
            y += 8;
        }

        // ── LOG (anchored to bottom area) ──
        var logY = Math.max(y + 12, this.height - 140);
        this._hudLine(ctx, hudX, logY, hudW);
        logY += 16;

        ctx.fillStyle = '#7a6a50';
        ctx.font = '8px monospace';
        ctx.fillText('LOG', hudX, logY);
        logY += 14;

        ctx.font = '9px monospace';
        var logCount = Math.min(agent.log.length, 6);
        for (var li = 0; li < logCount; li++) {
            var entry = agent.log[li];
            var logAlpha = 0.55 - (li * 0.08);
            ctx.fillStyle = 'rgba(170, 155, 130, ' + logAlpha + ')';
            var logText = entry.time + ': ' + entry.message;
            if (logText.length > 36) logText = logText.substring(0, 35) + '...';
            ctx.fillText(logText, hudX, logY);
            logY += 12;
        }

        // ── BOTTOM BAR ──
        var barH = 28;
        ctx.fillStyle = '#120e0a';
        ctx.fillRect(hudLeft, this.height - barH, this.hudWidth, barH);
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(hudLeft, this.height - barH, this.hudWidth, 1);

        var bottomY = this.height - 10;
        ctx.font = '10px monospace';
        var speeds = [1, 2, 5, 10];
        var speedLabels = ['1x', '2x', '5x', '10x'];
        var bsx = hudX;
        for (var si = 0; si < speeds.length; si++) {
            var active = SB.Game.speedMultiplier === speeds[si];
            ctx.fillStyle = active ? '#c8a858' : '#3a3028';
            ctx.fillText(speedLabels[si], bsx, bottomY);
            bsx += 30;
        }
        ctx.fillStyle = '#4a3a28';
        ctx.font = '9px monospace';
        ctx.fillText('[F] follow  [R] reset', bsx + 8, bottomY);
    },

    _hudLine: function(ctx, x, y, w) {
        ctx.fillStyle = 'rgba(100, 80, 50, 0.2)';
        ctx.fillRect(x, y, w, 1);
    },

    _drawSectionHeader: function(ctx, x, y, text) {
        ctx.fillStyle = 'rgba(100, 130, 200, 0.15)';
        ctx.fillRect(x, y + 2, 240, 1);
        ctx.fillStyle = SB.Colors.hud_dim;
        ctx.font = '9px monospace';
        ctx.fillText(text, x + 4, y);
    },

    _drawFancyBar: function(ctx, x, y, w, h, pct, fgColor, bgColor) {
        pct = SB.Utils.clamp(pct, 0, 1);
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 3);
        ctx.fill();
        if (pct > 0.01) {
            ctx.fillStyle = fgColor;
            ctx.beginPath();
            ctx.roundRect(x, y, Math.max(6, w * pct), h, 3);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            ctx.fillRect(x + 2, y + 1, w * pct - 4, h / 3);
        }
    },
};
