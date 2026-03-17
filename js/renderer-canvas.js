var SB = window.Starbase = window.Starbase || {};

SB.Renderer = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    animFrame: 0,
    grassNoise: null,

    // Camera system (positions in iso screen space)
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
    farStars: [],
    nearStars: [],

    // ═══════════════════════════════════════════
    // ISO HELPERS
    // ═══════════════════════════════════════════

    tileToScreen: function(tx, ty) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        return {
            x: (tx - ty) * hw,
            y: (tx + ty) * hh
        };
    },

    screenToTile: function(sx, sy) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        return {
            x: (sx / hw + sy / hh) / 2,
            y: (sy / hh - sx / hw) / 2
        };
    },

    _fillDiamond: function(ctx, sx, sy, color) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, sy - hh);
        ctx.lineTo(sx + hw, sy);
        ctx.lineTo(sx, sy + hh);
        ctx.lineTo(sx - hw, sy);
        ctx.closePath();
        ctx.fill();
    },

    _strokeDiamond: function(ctx, sx, sy, color, lineWidth) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth || 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - hh);
        ctx.lineTo(sx + hw, sy);
        ctx.lineTo(sx, sy + hh);
        ctx.lineTo(sx - hw, sy);
        ctx.closePath();
        ctx.stroke();
    },

    // Draw an isometric box (walls + top face)
    // bx,by = tile origin, bw,bh = size in tiles, wallH = wall height px
    _drawIsoBox: function(ctx, bx, by, bw, bh, wallH, topColor, leftColor, rightColor) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;

        // Footprint vertices at ground level
        var north = { x: (bx - by) * hw, y: (bx + by) * hh - hh };
        var east  = { x: (bx + bw - 1 - by) * hw + hw, y: (bx + bw - 1 + by) * hh };
        var south = { x: (bx + bw - 1 - by - bh + 1) * hw, y: (bx + bw - 1 + by + bh - 1) * hh + hh };
        var west  = { x: (bx - by - bh + 1) * hw - hw, y: (bx + by + bh - 1) * hh };

        // Left wall (south-facing): west → south
        ctx.fillStyle = leftColor;
        ctx.beginPath();
        ctx.moveTo(west.x, west.y - wallH);
        ctx.lineTo(south.x, south.y - wallH);
        ctx.lineTo(south.x, south.y);
        ctx.lineTo(west.x, west.y);
        ctx.closePath();
        ctx.fill();

        // Right wall (east-facing): south → east
        ctx.fillStyle = rightColor;
        ctx.beginPath();
        ctx.moveTo(south.x, south.y - wallH);
        ctx.lineTo(east.x, east.y - wallH);
        ctx.lineTo(east.x, east.y);
        ctx.lineTo(south.x, south.y);
        ctx.closePath();
        ctx.fill();

        // Top face (raised)
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.moveTo(north.x, north.y - wallH);
        ctx.lineTo(east.x, east.y - wallH);
        ctx.lineTo(south.x, south.y - wallH);
        ctx.lineTo(west.x, west.y - wallH);
        ctx.closePath();
        ctx.fill();
    },

    // ═══════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════

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
            fctx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 1, 1);
        }
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
                    flowerX: (Math.random() - 0.5) * 16,
                    flowerY: (Math.random() - 0.5) * 6,
                };
            }
        }
    },

    regenerateGrassNoise: function() {
        this._generateGrassNoise();
        this._generateFogPattern();
        this._generateStarfield();
    },

    // ═══════════════════════════════════════════
    // CAMERA & CONTROLS
    // ═══════════════════════════════════════════

    _createZoomButtons: function() {
        var container = document.getElementById('gameContainer');
        var self = this;

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
            // Fit entire iso world in view
            var W = SB.WORLD_WIDTH;
            var H = SB.WORLD_HEIGHT;
            var hw = SB.ISO_TW / 2;
            var hh = SB.ISO_TH / 2;
            var worldPxW = (W + H) * hw;
            var worldPxH = (W + H) * hh;
            var zoomX = self.viewportW / worldPxW;
            var zoomY = self.viewportH / worldPxH;
            self.camera.zoom = Math.min(zoomX, zoomY) * 0.85;
            self.camera.zoom = SB.Utils.clamp(self.camera.zoom, 0.15, 2.5);
            // Center on world center tile
            var center = self.tileToScreen(W / 2, H / 2);
            self.camera.x = center.x;
            self.camera.y = center.y;
            self.camera.targetX = self.camera.x;
            self.camera.targetY = self.camera.y;
            self.camera.followAgent = false;
        });
        fitBtn.title = 'Fit island';

        var followBtn = makeBtn('\uD83C\uDFAF', function() {
            self.camera.followAgent = true;
        });
        followBtn.title = 'Follow agent (F)';

        btnContainer.appendChild(zoomIn);
        btnContainer.appendChild(zoomOut);
        btnContainer.appendChild(fitBtn);
        btnContainer.appendChild(followBtn);
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
        if (this.camera.followAgent && agent) {
            var pos = this.tileToScreen(agent.x, agent.y);
            this.camera.targetX = pos.x;
            this.camera.targetY = pos.y;
        }
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.lerpSpeed;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.lerpSpeed;
    },

    // ═══════════════════════════════════════════
    // VISIBLE RANGE (iso culling)
    // ═══════════════════════════════════════════

    _getVisibleRange: function(camX, camY, zoom) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        var vpW = this.viewportW / zoom;
        var vpH = this.viewportH / zoom;

        var corners = [
            { x: camX, y: camY },
            { x: camX + vpW, y: camY },
            { x: camX, y: camY + vpH },
            { x: camX + vpW, y: camY + vpH }
        ];

        var minTX = Infinity, maxTX = -Infinity;
        var minTY = Infinity, maxTY = -Infinity;

        for (var i = 0; i < 4; i++) {
            var c = corners[i];
            var tx = (c.x / hw + c.y / hh) / 2;
            var ty = (c.y / hh - c.x / hw) / 2;
            minTX = Math.min(minTX, Math.floor(tx));
            maxTX = Math.max(maxTX, Math.ceil(tx));
            minTY = Math.min(minTY, Math.floor(ty));
            maxTY = Math.max(maxTY, Math.ceil(ty));
        }

        var pad = 14; // extra padding for deep cliff underside
        return {
            minTX: Math.max(0, minTX - pad),
            maxTX: Math.min(SB.WORLD_WIDTH - 1, maxTX + pad),
            minTY: Math.max(0, minTY - pad),
            maxTY: Math.min(SB.WORLD_HEIGHT - 1, maxTY + pad),
        };
    },

    // ═══════════════════════════════════════════
    // STARFIELD
    // ═══════════════════════════════════════════

    _drawStarfield: function(ctx) {
        var frame = this.animFrame;

        for (var i = 0; i < this.farStars.length; i++) {
            var star = this.farStars[i];
            var twinkle = Math.sin(frame * star.twinkleSpeed + star.twinkleOffset);
            var alpha = star.baseAlpha + twinkle * 0.25;
            if (alpha < 0.1) continue;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        var camOffX = this.camera.x * 0.02;
        var camOffY = this.camera.y * 0.02;

        for (var j = 0; j < this.nearStars.length; j++) {
            var nstar = this.nearStars[j];
            var ntwinkle = Math.sin(frame * nstar.twinkleSpeed + nstar.twinkleOffset);
            var nalpha = nstar.baseAlpha + ntwinkle * 0.3;
            if (nalpha < 0.1) continue;

            var sx = nstar.x - camOffX * nstar.parallaxFactor * 20;
            var sy = nstar.y - camOffY * nstar.parallaxFactor * 20;
            sx = ((sx % this.viewportW) + this.viewportW) % this.viewportW;
            sy = ((sy % this.viewportH) + this.viewportH) % this.viewportH;

            ctx.globalAlpha = nalpha;
            ctx.fillStyle = nstar.color;
            if (nstar.size >= 3) {
                ctx.beginPath();
                ctx.arc(sx, sy, nstar.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(sx, sy, nstar.size, nstar.size);
            }
        }
        ctx.globalAlpha = 1;
    },

    // ═══════════════════════════════════════════
    // MAIN DRAW
    // ═══════════════════════════════════════════

    draw: function(world, agent, time) {
        this.animFrame++;
        var ctx = this.ctx;

        this._updateCamera(agent);
        world.updateFogPulses();

        // Clear
        ctx.fillStyle = SB.Colors.void_bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Clip viewport
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, this.viewportW, this.viewportH);
        ctx.clip();

        // Starfield (screen space)
        this._drawStarfield(ctx);

        // Camera transform
        var zoom = this.camera.zoom;
        var camX = this.camera.x - (this.viewportW / 2) / zoom;
        var camY = this.camera.y - (this.viewportH / 2) / zoom;

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-camX, -camY);

        var range = this._getVisibleRange(camX, camY, zoom);

        // Pre-compute building draw points (draw at front-most tile)
        var buildingDrawMap = {};
        for (var bi = 0; bi < world.buildings.length; bi++) {
            var b = world.buildings[bi];
            var dty = b.y + b.height - 1;
            var dtx = b.x + b.width - 1;
            var key = dty * SB.WORLD_WIDTH + dtx;
            if (!buildingDrawMap[key]) buildingDrawMap[key] = [];
            buildingDrawMap[key].push(b);
        }

        // PASS 0: Massive island underside (one cohesive rock mass)
        this._drawIslandUnderside(ctx, world);

        // PASS 1: Ground tiles (all diamonds, back to front)
        for (var ty = range.minTY; ty <= range.maxTY; ty++) {
            for (var tx = range.minTX; tx <= range.maxTX; tx++) {
                var tile = world.tiles[ty][tx];
                if (tile.type === SB.Tiles.VOID) continue;

                var pos = this.tileToScreen(tx, ty);
                this._drawTile(ctx, tile, pos.x, pos.y, tx, ty);
            }
        }

        // PASS 2: Cliff rim detail (thin edge where land meets void)
        for (var cty = range.minTY; cty <= range.maxTY; cty++) {
            for (var clx = range.minTX; clx <= range.maxTX; clx++) {
                var ctile = world.tiles[cty][clx];
                if (ctile.type === SB.Tiles.CLIFF) {
                    var cpos = this.tileToScreen(clx, cty);
                    this._drawCliffRim(ctx, clx, cty, cpos.x, cpos.y);
                }
            }
        }

        // PASS 3: Objects (resources, buildings, agent) — back to front
        for (var oty = range.minTY; oty <= range.maxTY; oty++) {
            for (var otx = range.minTX; otx <= range.maxTX; otx++) {
                var otile = world.tiles[oty][otx];

                // Resources
                if (otile.resource && !otile.building && world.isRevealed(otx, oty)) {
                    var rpos = this.tileToScreen(otx, oty);
                    this._drawResource(ctx, otile, rpos.x, rpos.y);
                }

                // Buildings at this draw point
                var bkey = oty * SB.WORLD_WIDTH + otx;
                if (buildingDrawMap[bkey]) {
                    for (var bdi = 0; bdi < buildingDrawMap[bkey].length; bdi++) {
                        var building = buildingDrawMap[bkey][bdi];
                        if (world.isRevealed(building.x, building.y)) {
                            this._drawBuilding(ctx, building);
                        }
                    }
                }

                // Agent
                if (agent.x === otx && agent.y === oty) {
                    var apos = this.tileToScreen(otx, oty);
                    this._drawAgent(ctx, agent, apos.x, apos.y);
                }
            }
        }

        // Day/night overlay
        this._drawDayNight(ctx, world, agent, time, range);

        // Fog overlay
        this._drawFog(ctx, world, range);

        // Fog pulses
        this._drawFogPulses(ctx, world);

        ctx.restore(); // camera
        ctx.restore(); // clip

        // HUD
        this._drawHUD(ctx, world, agent, time);
    },

    // ═══════════════════════════════════════════
    // TILE DRAWING
    // ═══════════════════════════════════════════

    _drawTile: function(ctx, tile, sx, sy, tx, ty) {
        var noise = this.grassNoise[ty] ? this.grassNoise[ty][tx] : null;

        switch (tile.type) {
            case SB.Tiles.GRASS: {
                var colors = [SB.Colors.grass1, SB.Colors.grass2, SB.Colors.grass3, SB.Colors.grass4];
                var ci = noise ? Math.floor(noise.color * 4) : 0;
                this._fillDiamond(ctx, sx, sy, colors[ci]);

                // Subtle edge highlight
                ctx.strokeStyle = 'rgba(255,255,255,0.04)';
                ctx.lineWidth = 0.5;
                var hw = SB.ISO_TW / 2;
                var hh = SB.ISO_TH / 2;
                ctx.beginPath();
                ctx.moveTo(sx - hw, sy);
                ctx.lineTo(sx, sy - hh);
                ctx.lineTo(sx + hw, sy);
                ctx.stroke();

                // Flower
                if (noise && noise.hasFlower && !tile.resource && !tile.building) {
                    var flowerColors = [SB.Colors.grass_flower1, SB.Colors.grass_flower2, SB.Colors.grass_flower3];
                    ctx.fillStyle = flowerColors[noise.flowerType];
                    ctx.beginPath();
                    ctx.arc(sx + noise.flowerX, sy + noise.flowerY, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(sx + noise.flowerX, sy + noise.flowerY, 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case SB.Tiles.CLIFF: {
                this._fillDiamond(ctx, sx, sy, SB.Colors.cliff_top);
                // Rocky texture dots
                ctx.fillStyle = SB.Colors.cliff_edge;
                ctx.fillRect(sx - 4, sy - 1, 2, 1);
                ctx.fillRect(sx + 3, sy + 1, 2, 1);
                ctx.fillRect(sx - 1, sy + 3, 2, 1);
                break;
            }
            case SB.Tiles.WATER: {
                var t = this.animFrame * 0.03;
                var wave = Math.sin(t + tx * 0.8 + ty * 0.6) * 0.3 + 0.5;
                var wave2 = Math.sin(t * 0.7 + tx * 0.5 - ty * 0.9) * 0.2;

                var waterColor = wave > 0.5 ? SB.Colors.water_light : SB.Colors.water_mid;
                if (wave + wave2 < 0.4) waterColor = SB.Colors.water_deep;
                this._fillDiamond(ctx, sx, sy, waterColor);

                // Shimmer highlight
                if (wave > 0.7) {
                    ctx.fillStyle = 'rgba(150, 210, 255, 0.15)';
                    ctx.beginPath();
                    ctx.ellipse(sx, sy - 1, 6, 2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case SB.Tiles.STONE_DEPOSIT: {
                // Slightly elevated rocky terrain
                var mh = 6; // subtle elevation
                var hw = SB.ISO_TW / 2;
                var hh = SB.ISO_TH / 2;

                // South wall face (left-front)
                ctx.fillStyle = '#6a6068';
                ctx.beginPath();
                ctx.moveTo(sx - hw, sy);
                ctx.lineTo(sx, sy + hh);
                ctx.lineTo(sx, sy + hh + mh);
                ctx.lineTo(sx - hw, sy + mh);
                ctx.closePath();
                ctx.fill();

                // East wall face (right-front, darker)
                ctx.fillStyle = '#4a4248';
                ctx.beginPath();
                ctx.moveTo(sx, sy + hh);
                ctx.lineTo(sx + hw, sy);
                ctx.lineTo(sx + hw, sy + mh);
                ctx.lineTo(sx, sy + hh + mh);
                ctx.closePath();
                ctx.fill();

                // Top face (elevated diamond)
                this._fillDiamond(ctx, sx, sy, SB.Colors.stone_deposit);

                // Rocky texture on top
                ctx.fillStyle = SB.Colors.stone_deposit_dark;
                ctx.fillRect(sx - 6, sy - 1, 3, 2);
                ctx.fillRect(sx + 2, sy + 1, 4, 2);
                ctx.fillStyle = SB.Colors.stone_highlight;
                ctx.fillRect(sx - 3, sy - 4, 5, 1);
                ctx.fillRect(sx + 1, sy - 2, 3, 1);
                break;
            }
            case SB.Tiles.DIRT: {
                this._fillDiamond(ctx, sx, sy, SB.Colors.dirt);
                ctx.fillStyle = SB.Colors.dirt_dark;
                ctx.fillRect(sx - 3, sy - 1, 2, 1);
                ctx.fillRect(sx + 2, sy + 2, 2, 1);
                break;
            }
            case SB.Tiles.FARMLAND: {
                this._fillDiamond(ctx, sx, sy, SB.Colors.farmland);
                // Furrow lines (iso-aligned)
                ctx.strokeStyle = SB.Colors.farmland_dark;
                ctx.lineWidth = 1;
                for (var row = -2; row <= 2; row++) {
                    var fy = sy + row * 3;
                    ctx.beginPath();
                    ctx.moveTo(sx - 8 + Math.abs(row) * 2, fy);
                    ctx.lineTo(sx + 8 - Math.abs(row) * 2, fy);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                break;
            }
            case SB.Tiles.SAND: {
                var sandColors = [SB.Colors.sand1, SB.Colors.sand2, SB.Colors.sand3];
                var sci = noise ? Math.floor(noise.color * 3) : 0;
                this._fillDiamond(ctx, sx, sy, sandColors[sci]);

                // Sandy texture dots
                ctx.fillStyle = SB.Colors.sand_dark;
                ctx.fillRect(sx - 5, sy - 1, 1, 1);
                ctx.fillRect(sx + 3, sy + 2, 1, 1);
                ctx.fillRect(sx - 2, sy + 3, 1, 1);

                // Subtle edge
                var hw = SB.ISO_TW / 2;
                var hh = SB.ISO_TH / 2;
                ctx.strokeStyle = 'rgba(0,0,0,0.06)';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx, sy + hh);
                ctx.lineTo(sx + hw, sy);
                ctx.stroke();
                break;
            }
            case SB.Tiles.HILL: {
                var hillColors = [SB.Colors.hill1, SB.Colors.hill2, SB.Colors.hill3, SB.Colors.hill4];
                var hci = noise ? Math.floor(noise.color * 4) : 0;
                var hw = SB.ISO_TW / 2;
                var hh = SB.ISO_TH / 2;
                var elev = 3; // subtle hill elevation

                // South wall face (earthy)
                ctx.fillStyle = '#6a5a40';
                ctx.beginPath();
                ctx.moveTo(sx - hw, sy);
                ctx.lineTo(sx, sy + hh);
                ctx.lineTo(sx, sy + hh + elev);
                ctx.lineTo(sx - hw, sy + elev);
                ctx.closePath();
                ctx.fill();

                // East wall face (darker)
                ctx.fillStyle = '#4a3a28';
                ctx.beginPath();
                ctx.moveTo(sx, sy + hh);
                ctx.lineTo(sx + hw, sy);
                ctx.lineTo(sx + hw, sy + elev);
                ctx.lineTo(sx, sy + hh + elev);
                ctx.closePath();
                ctx.fill();

                // Top face (elevated diamond)
                this._fillDiamond(ctx, sx, sy, hillColors[hci]);

                // Highlight on north edges
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx - hw, sy);
                ctx.lineTo(sx, sy - hh);
                ctx.lineTo(sx + hw, sy);
                ctx.stroke();

                // Flower on hill
                if (noise && noise.hasFlower && !tile.resource && !tile.building) {
                    var flowerColors = [SB.Colors.grass_flower1, SB.Colors.grass_flower2, SB.Colors.grass_flower3];
                    ctx.fillStyle = flowerColors[noise.flowerType];
                    ctx.beginPath();
                    ctx.arc(sx + noise.flowerX * 0.7, sy + noise.flowerY * 0.5, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.lineWidth = 1;
                break;
            }
        }
    },

    // ═══════════════════════════════════════════
    // ISLAND UNDERSIDE (one massive rock formation)
    // ═══════════════════════════════════════════

    // Massive underside: oversized wall + tapered cone (drawn before ground tiles)
    _drawIslandUnderside: function(ctx, world) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        var cx = Math.floor(SB.WORLD_WIDTH / 2);
        var cy = Math.floor(SB.WORLD_HEIGHT / 2);
        var center = this.tileToScreen(cx, cy);

        // Oversized so ground tiles cover the excess on top
        var isoRX = 52 * hw * 1.5;
        var isoRY = 52 * hh * 1.5;
        var wallH = 80;

        // 1) Thick rock wall band — same depth everywhere
        // SW wall face (lit)
        ctx.fillStyle = '#5a4a38';
        ctx.beginPath();
        ctx.moveTo(center.x - isoRX, center.y);
        ctx.lineTo(center.x, center.y + isoRY);
        ctx.lineTo(center.x, center.y + isoRY + wallH);
        ctx.lineTo(center.x - isoRX, center.y + wallH);
        ctx.closePath();
        ctx.fill();
        // SE wall face (shadow)
        ctx.fillStyle = '#3a2a1e';
        ctx.beginPath();
        ctx.moveTo(center.x, center.y + isoRY);
        ctx.lineTo(center.x + isoRX, center.y);
        ctx.lineTo(center.x + isoRX, center.y + wallH);
        ctx.lineTo(center.x, center.y + isoRY + wallH);
        ctx.closePath();
        ctx.fill();

        // Strata lines on wall
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (var s = 1; s <= 3; s++) {
            var sy = center.y + wallH * s * 0.25;
            ctx.beginPath();
            ctx.moveTo(center.x - isoRX + 10, sy);
            ctx.lineTo(center.x - 10, sy + isoRY);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.10)';
        for (var s = 1; s <= 2; s++) {
            var sy = center.y + wallH * s * 0.33;
            ctx.beginPath();
            ctx.moveTo(center.x + 10, sy + isoRY);
            ctx.lineTo(center.x + isoRX - 10, sy);
            ctx.stroke();
        }

        // 2) Below wall: tapered cone converging to a point
        var taperDepth = 350;
        var bandCount = 14;
        for (var i = 0; i < bandCount; i++) {
            var t0 = i / bandCount;
            var t1 = (i + 1) / bandCount;
            var scale0 = 1.0 - t0 * t0 * 0.97;
            var scale1 = 1.0 - t1 * t1 * 0.97;
            var d0 = wallH + t0 * taperDepth;
            var d1 = wallH + t1 * taperDepth;
            var rx0 = isoRX * scale0, ry0 = isoRY * scale0;
            var rx1 = isoRX * scale1, ry1 = isoRY * scale1;
            var cy0 = center.y + d0, cy1 = center.y + d1;

            var brightness = 38 - t0 * 34;
            // SW taper
            ctx.fillStyle = 'rgb(' + Math.max(Math.floor(brightness * 1.0), 4) + ',' +
                Math.max(Math.floor(brightness * 0.75), 3) + ',' +
                Math.max(Math.floor(brightness * 0.55), 2) + ')';
            ctx.beginPath();
            ctx.moveTo(center.x - rx0, cy0);
            ctx.lineTo(center.x, cy0 + ry0);
            ctx.lineTo(center.x, cy1 + ry1);
            ctx.lineTo(center.x - rx1, cy1);
            ctx.closePath();
            ctx.fill();
            // SE taper
            ctx.fillStyle = 'rgb(' + Math.max(Math.floor(brightness * 0.6), 3) + ',' +
                Math.max(Math.floor(brightness * 0.45), 2) + ',' +
                Math.max(Math.floor(brightness * 0.35), 2) + ')';
            ctx.beginPath();
            ctx.moveTo(center.x, cy0 + ry0);
            ctx.lineTo(center.x + rx0, cy0);
            ctx.lineTo(center.x + rx1, cy1);
            ctx.lineTo(center.x, cy1 + ry1);
            ctx.closePath();
            ctx.fill();
        }
        ctx.lineWidth = 1;
    },

    // Per-tile cliff rim — thin rocky edge detail on top of the underside
    _drawCliffRim: function(ctx, tx, ty, sx, sy) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        var neighbors = SB.World.getVoidNeighbors(tx, ty);
        var rimH = 6;

        if (neighbors.bottom) {
            ctx.fillStyle = '#6a5a45';
            ctx.beginPath();
            ctx.moveTo(sx - hw, sy);
            ctx.lineTo(sx, sy + hh);
            ctx.lineTo(sx, sy + hh + rimH);
            ctx.lineTo(sx - hw, sy + rimH);
            ctx.closePath();
            ctx.fill();
        }
        if (neighbors.right) {
            ctx.fillStyle = '#4a3a2a';
            ctx.beginPath();
            ctx.moveTo(sx, sy + hh);
            ctx.lineTo(sx + hw, sy);
            ctx.lineTo(sx + hw, sy + rimH);
            ctx.lineTo(sx, sy + hh + rimH);
            ctx.closePath();
            ctx.fill();
        }
        ctx.lineWidth = 1;
    },

    // ═══════════════════════════════════════════
    // RESOURCES
    // ═══════════════════════════════════════════

    _drawResource: function(ctx, tile, sx, sy) {
        switch (tile.resource) {
            case SB.Resources.TREE: {
                var sway = Math.sin(this.animFrame * 0.02 + sx * 0.1) * 0.5;

                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.beginPath();
                ctx.ellipse(sx + 2, sy + 6, 8, 3, 0.3, 0, Math.PI * 2);
                ctx.fill();

                // Trunk
                ctx.fillStyle = SB.Colors.tree_trunk;
                ctx.fillRect(sx - 1.5, sy - 8, 3, 16);
                ctx.fillStyle = SB.Colors.tree_trunk_dark;
                ctx.fillRect(sx - 0.5, sy - 6, 1, 12);

                // Canopy
                ctx.fillStyle = SB.Colors.tree_canopy1;
                ctx.beginPath();
                ctx.arc(sx + sway, sy - 10, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = SB.Colors.tree_canopy2;
                ctx.beginPath();
                ctx.arc(sx + 2 + sway, sy - 8, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = SB.Colors.tree_highlight;
                ctx.beginPath();
                ctx.arc(sx - 3 + sway, sy - 13, 3.5, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case SB.Resources.BERRY_BUSH: {
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.14)';
                ctx.beginPath();
                ctx.ellipse(sx + 1, sy + 5, 8, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Bush body
                ctx.fillStyle = SB.Colors.berry_bush;
                ctx.beginPath();
                ctx.arc(sx, sy - 1, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = SB.Colors.berry_bush_dark;
                ctx.beginPath();
                ctx.arc(sx + 2, sy + 2, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(100, 200, 80, 0.3)';
                ctx.beginPath();
                ctx.arc(sx - 3, sy - 4, 3, 0, Math.PI * 2);
                ctx.fill();

                // Berries
                if (tile.resourceAmount > 0) {
                    var positions = [
                        { x: -5, y: -3 }, { x: 4, y: -4 }, { x: 0, y: 3 },
                        { x: -4, y: 2 }, { x: 5, y: 1 },
                    ];
                    for (var i = 0; i < Math.min(tile.resourceAmount, 4); i++) {
                        var p = positions[i];
                        ctx.fillStyle = SB.Colors.berry;
                        ctx.beginPath();
                        ctx.arc(sx + p.x, sy + p.y, 2.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = SB.Colors.berry_highlight;
                        ctx.beginPath();
                        ctx.arc(sx + p.x - 0.5, sy + p.y - 1, 1, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                break;
            }
            case SB.Resources.STONE: {
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(sx + 2, sy + 6, 10, 4, 0.2, 0, Math.PI * 2);
                ctx.fill();

                // Mountain boulder — tall rocky peak
                // Left face (lit)
                ctx.fillStyle = '#999';
                ctx.beginPath();
                ctx.moveTo(sx - 9, sy + 4);
                ctx.lineTo(sx - 2, sy - 14);
                ctx.lineTo(sx + 1, sy - 10);
                ctx.lineTo(sx, sy + 4);
                ctx.closePath();
                ctx.fill();

                // Right face (shadow)
                ctx.fillStyle = '#6a6a6a';
                ctx.beginPath();
                ctx.moveTo(sx + 1, sy - 10);
                ctx.lineTo(sx - 2, sy - 14);
                ctx.lineTo(sx + 4, sy - 11);
                ctx.lineTo(sx + 9, sy + 2);
                ctx.lineTo(sx, sy + 4);
                ctx.closePath();
                ctx.fill();

                // Snow/highlight cap on top
                ctx.fillStyle = SB.Colors.stone_highlight;
                ctx.beginPath();
                ctx.moveTo(sx - 2, sy - 14);
                ctx.lineTo(sx + 4, sy - 11);
                ctx.lineTo(sx + 1, sy - 9);
                ctx.closePath();
                ctx.fill();

                // Smaller secondary rock
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.moveTo(sx + 4, sy + 4);
                ctx.lineTo(sx + 6, sy - 4);
                ctx.lineTo(sx + 10, sy + 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(sx + 6, sy - 4);
                ctx.lineTo(sx + 10, sy + 2);
                ctx.lineTo(sx + 8, sy + 4);
                ctx.closePath();
                ctx.fill();
                break;
            }
            case SB.Resources.TALL_GRASS: {
                if (tile.resourceAmount <= 0) break;
                // Several grass blades
                var bladePositions = [
                    {x: -6, y: -2}, {x: -2, y: -4}, {x: 3, y: -1},
                    {x: -4, y: 2}, {x: 1, y: 3}, {x: 5, y: 0}
                ];
                for (var gi = 0; gi < Math.min(tile.resourceAmount * 3, bladePositions.length); gi++) {
                    var bp = bladePositions[gi];
                    var sway = Math.sin(this.animFrame * 0.03 + bp.x * 0.5) * 1;
                    ctx.strokeStyle = SB.Colors.tall_grass_blade;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(sx + bp.x, sy + bp.y + 2);
                    ctx.quadraticCurveTo(sx + bp.x + sway, sy + bp.y - 4, sx + bp.x + sway * 1.5, sy + bp.y - 8);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                break;
            }
        }
    },

    // ═══════════════════════════════════════════
    // BUILDINGS
    // ═══════════════════════════════════════════

    _drawBuilding: function(ctx, building) {
        var hw = SB.ISO_TW / 2;
        var hh = SB.ISO_TH / 2;
        var bx = building.x;
        var by = building.y;
        var bw = building.width;
        var bh = building.height;

        // Building center in screen space
        var centerTX = bx + (bw - 1) / 2;
        var centerTY = by + (bh - 1) / 2;
        var center = this.tileToScreen(centerTX, centerTY);

        switch (building.type) {
            case SB.BuildingTypes.SHELTER: {
                var wallH = 18;

                // Shadow
                var south = this.tileToScreen(bx + bw - 1, by + bh - 1);
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(south.x, south.y + hh + 6, bw * hw * 0.7, bh * hh * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Main box (walls)
                this._drawIsoBox(ctx, bx, by, bw, bh, wallH,
                    SB.Colors.shelter_roof, SB.Colors.shelter_wall, SB.Colors.shelter_wall_dark);

                // Roof ridge highlight
                var north = { x: (bx - by) * hw, y: (bx + by) * hh - hh - wallH };
                var east = { x: (bx + bw - 1 - by) * hw + hw, y: (bx + bw - 1 + by) * hh - wallH };
                var southR = { x: (bx + bw - 1 - by - bh + 1) * hw, y: (bx + bw - 1 + by + bh - 1) * hh + hh - wallH };
                var west = { x: (bx - by - bh + 1) * hw - hw, y: (bx + by + bh - 1) * hh - wallH };

                // Roof shingle lines
                ctx.strokeStyle = SB.Colors.shelter_roof_dark;
                ctx.lineWidth = 0.5;
                for (var ri = 1; ri <= 2; ri++) {
                    var t = ri / 3;
                    var y1 = north.y + (southR.y - north.y) * t;
                    var x1l = north.x + (west.x - north.x) * t;
                    var x1r = north.x + (east.x - north.x) * t;
                    ctx.beginPath();
                    ctx.moveTo(x1l, y1);
                    ctx.lineTo(x1r, y1);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;

                // Door on south (left) wall
                var doorMidX = (west.x + southR.x) / 2;
                var doorMidY = (west.y + southR.y) / 2;
                ctx.fillStyle = SB.Colors.shelter_door;
                ctx.fillRect(doorMidX - 3, doorMidY + wallH - 12, 6, 10);
                ctx.fillStyle = SB.Colors.shelter_wall;
                ctx.fillRect(doorMidX + 2, doorMidY + wallH - 6, 1.5, 1.5);

                // Windows on south wall
                ctx.fillStyle = SB.Colors.shelter_window;
                var winOff = (southR.x - west.x) * 0.2;
                ctx.fillRect(west.x + winOff - 2, west.y + wallH - 10, 5, 4);
                ctx.fillRect(southR.x - winOff - 3, southR.y + wallH - 10, 5, 4);

                // Windows on east wall
                var ewinMidX = (southR.x + east.x) / 2;
                var ewinMidY = (southR.y + east.y) / 2;
                ctx.fillStyle = SB.Colors.shelter_window;
                ctx.fillRect(ewinMidX - 2, ewinMidY + wallH - 10, 5, 4);
                break;
            }
            case SB.BuildingTypes.FARM: {
                // Farm is flat — fence posts and rails only
                var north = { x: (bx - by) * hw, y: (bx + by) * hh - hh };
                var east = { x: (bx + bw - 1 - by) * hw + hw, y: (bx + bw - 1 + by) * hh };
                var south = { x: (bx + bw - 1 - by - bh + 1) * hw, y: (bx + bw - 1 + by + bh - 1) * hh + hh };
                var west = { x: (bx - by - bh + 1) * hw - hw, y: (bx + by + bh - 1) * hh };

                // Fence rails
                ctx.strokeStyle = SB.Colors.shelter_wall;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(north.x, north.y);
                ctx.lineTo(east.x, east.y);
                ctx.lineTo(south.x, south.y);
                ctx.lineTo(west.x, west.y);
                ctx.closePath();
                ctx.stroke();
                ctx.lineWidth = 1;

                // Fence posts at corners
                var posts = [north, east, south, west];
                ctx.fillStyle = SB.Colors.shelter_wall;
                for (var pi = 0; pi < posts.length; pi++) {
                    ctx.fillRect(posts[pi].x - 1.5, posts[pi].y - 5, 3, 7);
                }

                // Draw crops on farmland tiles
                for (var fdy = 0; fdy < bh; fdy++) {
                    for (var fdx = 0; fdx < bw; fdx++) {
                        var ftile = SB.World.tiles[by + fdy] ? SB.World.tiles[by + fdy][bx + fdx] : null;
                        if (!ftile || ftile.type !== SB.Tiles.FARMLAND) continue;

                        var fpos = this.tileToScreen(bx + fdx, by + fdy);
                        if (ftile.growthTimer <= 0) {
                            // Mature crops
                            for (var fc = -1; fc <= 1; fc++) {
                                var cpx = fpos.x + fc * 6;
                                var cpy = fpos.y;
                                ctx.fillStyle = SB.Colors.farm_crop;
                                ctx.fillRect(cpx, cpy - 6, 2, 8);
                                ctx.fillStyle = SB.Colors.farm_crop_grain;
                                ctx.beginPath();
                                ctx.arc(cpx + 1, cpy - 7, 2.5, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        } else {
                            // Growing sprouts
                            var growth = 1 - (ftile.growthTimer / 50);
                            ctx.fillStyle = SB.Colors.farm_crop_young;
                            for (var gc = -1; gc <= 1; gc++) {
                                var gpx = fpos.x + gc * 6;
                                var sproutH = Math.max(2, growth * 8);
                                ctx.fillRect(gpx, fpos.y - sproutH, 2, sproutH);
                            }
                        }
                    }
                }
                break;
            }
            case SB.BuildingTypes.STORAGE: {
                var wallH = 14;
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(center.x + 2, center.y + hh + 5, hw * 0.8, hh * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();

                this._drawIsoBox(ctx, bx, by, bw, bh, wallH,
                    SB.Colors.storage_roof, SB.Colors.storage_wood, SB.Colors.storage_wood_dark);

                // Crate slat lines on left wall
                var west = { x: (bx - by - bh + 1) * hw - hw, y: (bx + by + bh - 1) * hh };
                var southV = { x: (bx + bw - 1 - by - bh + 1) * hw, y: (bx + bw - 1 + by + bh - 1) * hh + hh };
                ctx.strokeStyle = SB.Colors.storage_wood_dark;
                ctx.lineWidth = 0.5;
                for (var si = 1; si <= 2; si++) {
                    var sly = west.y + (si / 3) * wallH - wallH;
                    ctx.beginPath();
                    ctx.moveTo(west.x, sly + wallH * 0.3);
                    ctx.lineTo(southV.x, sly + (southV.y - west.y) / wallH * (si / 3) * wallH + wallH * 0.3);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
                break;
            }
            case SB.BuildingTypes.WELL: {
                // Draw as a circular stone structure at ground level
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(center.x + 2, center.y + 5, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Stone ring outer
                ctx.fillStyle = SB.Colors.well_stone;
                ctx.beginPath();
                ctx.ellipse(center.x, center.y - 2, 10, 7, 0, 0, Math.PI * 2);
                ctx.fill();

                // Inner water
                ctx.fillStyle = SB.Colors.well_water;
                ctx.beginPath();
                ctx.ellipse(center.x, center.y - 2, 6, 4.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Water shimmer
                var wt = this.animFrame * 0.04;
                ctx.fillStyle = 'rgba(100,180,255,0.3)';
                ctx.beginPath();
                ctx.ellipse(center.x - 1, center.y - 3 + Math.sin(wt) * 0.5, 3, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();

                // Stone rim detail
                ctx.fillStyle = SB.Colors.well_stone_dark;
                ctx.fillRect(center.x - 9, center.y - 3, 2, 2);
                ctx.fillRect(center.x + 7, center.y - 1, 2, 2);

                // Rope post
                ctx.fillStyle = SB.Colors.storage_wood_dark;
                ctx.fillRect(center.x + 8, center.y - 16, 2, 16);
                ctx.fillRect(center.x + 4, center.y - 16, 10, 2);
                // Rope
                ctx.strokeStyle = '#8a7a60';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(center.x + 9, center.y - 14);
                ctx.lineTo(center.x + 9, center.y - 5);
                ctx.stroke();
                break;
            }
            case SB.BuildingTypes.WORKSHOP: {
                var wallH = 20;
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(center.x + 2, center.y + hh + 6, bw * hw * 0.6, bh * hh * 0.35, 0, 0, Math.PI * 2);
                ctx.fill();

                this._drawIsoBox(ctx, bx, by, bw, bh, wallH,
                    SB.Colors.workshop_roof, SB.Colors.workshop_wall, SB.Colors.workshop_wall_dark);

                // Door on south wall
                var west = { x: (bx - by - bh + 1) * hw - hw, y: (bx + by + bh - 1) * hh };
                var southV = { x: (bx + bw - 1 - by - bh + 1) * hw, y: (bx + bw - 1 + by + bh - 1) * hh + hh };
                var doorMidX = (west.x + southV.x) / 2;
                var doorMidY = (west.y + southV.y) / 2;
                ctx.fillStyle = SB.Colors.shelter_door;
                ctx.fillRect(doorMidX - 3, doorMidY - 2, 6, 10);

                // Windows
                ctx.fillStyle = SB.Colors.shelter_window;
                var winOff = (southV.x - west.x) * 0.2;
                ctx.fillRect(west.x + winOff, west.y - 6, 5, 4);
                ctx.fillRect(southV.x - winOff - 5, southV.y - 6, 5, 4);

                // Anvil on east wall area
                var east = { x: (bx + bw - 1 - by) * hw + hw, y: (bx + bw - 1 + by) * hh };
                var anvX = (southV.x + east.x) / 2;
                var anvY = (southV.y + east.y) / 2;
                ctx.fillStyle = '#555';
                ctx.fillRect(anvX - 3, anvY - 4, 6, 2);
                ctx.fillRect(anvX - 2, anvY - 6, 4, 2);
                break;
            }
            case SB.BuildingTypes.CAMPFIRE: {
                var pos = this.tileToScreen(bx, by);
                // Logs
                ctx.fillStyle = SB.Colors.campfire_log;
                ctx.fillRect(pos.x - 6, pos.y + 1, 12, 3);
                ctx.fillRect(pos.x - 4, pos.y - 1, 8, 3);
                // Flames (animated)
                var ft = this.animFrame * 0.12;
                var flameH = 8 + Math.sin(ft) * 3;
                var flameH2 = 6 + Math.sin(ft * 1.3 + 1) * 2;
                ctx.fillStyle = SB.Colors.campfire_flame;
                ctx.beginPath();
                ctx.moveTo(pos.x - 3, pos.y);
                ctx.quadraticCurveTo(pos.x - 1, pos.y - flameH, pos.x + 1, pos.y);
                ctx.fill();
                ctx.fillStyle = SB.Colors.campfire_ember;
                ctx.beginPath();
                ctx.moveTo(pos.x + 1, pos.y + 1);
                ctx.quadraticCurveTo(pos.x + 3, pos.y - flameH2, pos.x + 5, pos.y + 1);
                ctx.fill();
                // Glow
                ctx.fillStyle = 'rgba(255, 150, 50, 0.08)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y - 2, 15, 0, Math.PI * 2);
                ctx.fill();
                // Embers/sparks
                ctx.fillStyle = SB.Colors.campfire_ember;
                var spark1y = (ft * 3) % 12;
                ctx.globalAlpha = Math.max(0, 1 - spark1y / 12);
                ctx.fillRect(pos.x - 2 + Math.sin(ft * 2) * 3, pos.y - 4 - spark1y, 1.5, 1.5);
                ctx.globalAlpha = 1;
                break;
            }
            case SB.BuildingTypes.WORKBENCH: {
                var pos = this.tileToScreen(bx, by);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(pos.x + 1, pos.y + 5, 10, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                // Legs
                ctx.fillStyle = SB.Colors.workbench_leg;
                ctx.fillRect(pos.x - 8, pos.y - 2, 2, 8);
                ctx.fillRect(pos.x + 6, pos.y - 2, 2, 8);
                // Table top
                ctx.fillStyle = SB.Colors.workbench_top;
                ctx.fillRect(pos.x - 10, pos.y - 5, 20, 5);
                ctx.fillStyle = SB.Colors.workbench_top_dark;
                ctx.fillRect(pos.x - 9, pos.y - 4, 18, 1);
                // Tool on top
                ctx.fillStyle = '#888';
                ctx.fillRect(pos.x - 4, pos.y - 7, 2, 5);
                ctx.fillStyle = '#aaa';
                ctx.fillRect(pos.x - 6, pos.y - 8, 6, 2);
                break;
            }
            case SB.BuildingTypes.BED: {
                var pos = this.tileToScreen(bx, by);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.beginPath();
                ctx.ellipse(pos.x, pos.y + 4, 10, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                // Frame
                ctx.fillStyle = SB.Colors.bed_frame;
                ctx.fillRect(pos.x - 9, pos.y - 3, 18, 3);
                ctx.fillRect(pos.x - 9, pos.y - 3, 2, 6);
                ctx.fillRect(pos.x + 7, pos.y - 3, 2, 6);
                // Sheet
                ctx.fillStyle = SB.Colors.bed_sheet;
                ctx.fillRect(pos.x - 7, pos.y - 5, 14, 3);
                // Pillow
                ctx.fillStyle = SB.Colors.bed_pillow;
                ctx.fillRect(pos.x - 7, pos.y - 6, 5, 3);
                break;
            }
            case SB.BuildingTypes.FURNACE: {
                var pos = this.tileToScreen(bx, by);
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.beginPath();
                ctx.ellipse(pos.x + 1, pos.y + 5, 9, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                // Stone body
                ctx.fillStyle = SB.Colors.furnace_stone;
                ctx.fillRect(pos.x - 8, pos.y - 8, 16, 14);
                ctx.fillStyle = SB.Colors.furnace_dark;
                ctx.fillRect(pos.x - 7, pos.y - 7, 14, 2);
                // Opening
                ctx.fillStyle = '#222';
                ctx.fillRect(pos.x - 4, pos.y - 2, 8, 5);
                // Fire inside (animated)
                var ff = this.animFrame * 0.1;
                ctx.fillStyle = SB.Colors.furnace_opening;
                ctx.globalAlpha = 0.6 + Math.sin(ff) * 0.3;
                ctx.fillRect(pos.x - 3, pos.y - 1, 6, 3);
                ctx.globalAlpha = 1;
                // Chimney smoke
                ctx.fillStyle = 'rgba(100,100,110,0.3)';
                var smokeY = (this.animFrame * 0.5) % 15;
                ctx.beginPath();
                ctx.arc(pos.x + 2, pos.y - 10 - smokeY, 3 + smokeY * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case SB.BuildingTypes.SMOKEHOUSE: {
                var wallH = 16;
                // Shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.ellipse(center.x + 2, center.y + hh + 5, hw * 0.8, hh * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                this._drawIsoBox(ctx, bx, by, bw, bh, wallH,
                    SB.Colors.smokehouse_wall, SB.Colors.storage_wood, SB.Colors.storage_wood_dark);
                // Chimney
                ctx.fillStyle = SB.Colors.smokehouse_chimney;
                var chimX = center.x + 4;
                ctx.fillRect(chimX - 2, center.y - wallH - 10, 5, 12);
                // Smoke (animated)
                ctx.fillStyle = 'rgba(120,120,130,0.25)';
                for (var si = 0; si < 3; si++) {
                    var sft = this.animFrame * 0.04 + si * 2;
                    var smokeRise = (sft * 5) % 20;
                    var smokeAlpha = Math.max(0, 0.25 - smokeRise * 0.012);
                    ctx.globalAlpha = smokeAlpha;
                    ctx.beginPath();
                    ctx.arc(chimX + Math.sin(sft + si) * 3, center.y - wallH - 12 - smokeRise, 3 + smokeRise * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
                break;
            }
            case SB.BuildingTypes.WALL: {
                var wallH = 12;
                this._drawIsoBox(ctx, bx, by, 1, 1, wallH,
                    SB.Colors.wall_stone_light, SB.Colors.wall_stone, SB.Colors.wall_stone_dark);

                // Mortar lines on top face
                var pos = this.tileToScreen(bx, by);
                ctx.strokeStyle = '#444455';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(pos.x - 8, pos.y - wallH);
                ctx.lineTo(pos.x + 8, pos.y - wallH);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y - wallH - 4);
                ctx.lineTo(pos.x, pos.y - wallH + 4);
                ctx.stroke();
                ctx.lineWidth = 1;
                break;
            }
        }
    },

    // ═══════════════════════════════════════════
    // AGENT
    // ═══════════════════════════════════════════

    _drawAgent: function(ctx, agent, sx, sy) {
        var walking = agent.status && agent.status.indexOf('Walk') >= 0;
        var legAnim = walking ? Math.sin(agent.walkFrame * 0.8) : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath();
        ctx.ellipse(sx + 1, sy + 5, 7, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (agent.isSleeping) {
            var ly = sy - 2;
            ctx.fillStyle = '#5577bb';
            ctx.beginPath();
            ctx.roundRect(sx - 10, ly - 2, 20, 7, 3);
            ctx.fill();
            ctx.fillStyle = '#4466aa';
            ctx.beginPath();
            ctx.roundRect(sx - 8, ly - 1, 16, 5, 2);
            ctx.fill();
            ctx.fillStyle = SB.Colors.agent_skin;
            ctx.beginPath();
            ctx.arc(sx - 9, ly - 1, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ddd';
            ctx.beginPath();
            ctx.ellipse(sx - 9, ly + 2, 5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = SB.Colors.agent_eye;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(sx - 11, ly - 2);
            ctx.lineTo(sx - 8, ly - 2);
            ctx.stroke();
            ctx.lineWidth = 1;

            // Zzz
            ctx.fillStyle = '#aaccff';
            var zt = this.animFrame * 0.06;
            var z1y = Math.sin(zt) * 3;
            ctx.globalAlpha = 0.8;
            ctx.font = 'bold 10px monospace';
            ctx.fillText('z', sx, ly - 12 + z1y);
            ctx.font = '7px monospace';
            ctx.globalAlpha = 0.5;
            ctx.fillText('z', sx + 6, ly - 19 + z1y * 0.7);
            ctx.globalAlpha = 1;
        } else {
            var bodyTop = sy - 16;

            // Legs
            ctx.fillStyle = '#4a6a9a';
            var legSpread = walking ? legAnim * 3 : 0;
            ctx.fillRect(sx - 3.5, bodyTop + 12, 2.5, 7 + legSpread);
            ctx.fillRect(sx + 1, bodyTop + 12, 2.5, 7 - legSpread);
            // Boots
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(sx - 4, bodyTop + 18 + Math.max(0, legSpread), 3.5, 2);
            ctx.fillRect(sx + 0.5, bodyTop + 18 + Math.max(0, -legSpread), 3.5, 2);

            // Torso
            ctx.fillStyle = '#dd6644';
            ctx.beginPath();
            ctx.roundRect(sx - 5, bodyTop + 5, 10, 9, 2);
            ctx.fill();
            ctx.fillStyle = '#cc5533';
            ctx.fillRect(sx - 2, bodyTop + 5, 4, 2);

            // Arms
            ctx.fillStyle = SB.Colors.agent_skin;
            var armSwing = walking ? legAnim * 2.5 : 0;
            ctx.fillRect(sx - 7, bodyTop + 6 - armSwing, 2.5, 8);
            ctx.fillRect(sx + 4.5, bodyTop + 6 + armSwing, 2.5, 8);

            // Tool in hand
            if (agent.status) {
                if (agent.status.indexOf('Chop') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(sx + 6, bodyTop + 3 + armSwing, 2, 10);
                    ctx.fillStyle = '#aaa';
                    ctx.fillRect(sx + 5, bodyTop + 2 + armSwing, 4, 3);
                } else if (agent.status.indexOf('Mining') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(sx + 6, bodyTop + 3 + armSwing, 2, 10);
                    ctx.fillStyle = '#999';
                    ctx.fillRect(sx + 4, bodyTop + 2 + armSwing, 6, 2);
                } else if (agent.status.indexOf('Build') >= 0) {
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(sx + 6, bodyTop + 4 + armSwing, 2, 8);
                    ctx.fillStyle = '#888';
                    ctx.fillRect(sx + 5, bodyTop + 3 + armSwing, 4, 3);
                }
            }

            // Head
            ctx.fillStyle = SB.Colors.agent_skin;
            ctx.beginPath();
            ctx.arc(sx, bodyTop + 1, 6, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = SB.Colors.agent_hair;
            ctx.beginPath();
            ctx.arc(sx, bodyTop - 2, 6, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(sx - 6, bodyTop - 2, 2, 4);
            ctx.fillRect(sx + 4, bodyTop - 2, 2, 4);

            // Face
            var blink = Math.sin(this.animFrame * 0.05) > 0.95;
            if (agent.facing === 'up') {
                // Back of head - no face
            } else if (agent.facing === 'left') {
                if (!blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(sx - 3, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(sx - 3.5, bodyTop - 0.8, 0.8, 0.8);
                }
            } else if (agent.facing === 'right') {
                if (!blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(sx + 3, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(sx + 2.5, bodyTop - 0.8, 0.8, 0.8);
                }
            } else {
                if (blink) {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.fillRect(sx - 4, bodyTop, 2.5, 0.8);
                    ctx.fillRect(sx + 1.5, bodyTop, 2.5, 0.8);
                } else {
                    ctx.fillStyle = SB.Colors.agent_eye;
                    ctx.beginPath();
                    ctx.arc(sx - 2.5, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.arc(sx + 2.5, bodyTop, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(sx - 3, bodyTop - 0.8, 0.8, 0.8);
                    ctx.fillRect(sx + 2, bodyTop - 0.8, 0.8, 0.8);
                }
                ctx.strokeStyle = SB.Colors.agent_eye;
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.arc(sx, bodyTop + 3, 1.5, 0.2, Math.PI - 0.2);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        }

        // Action bubble
        if (agent.status && !agent.isSleeping) {
            var bob = Math.sin(this.animFrame * 0.08) * 2;
            var bubbleY = sy - 24 + bob;

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(sx + 3, bubbleY + 6, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + 5, bubbleY + 2, 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.roundRect(sx + 2, bubbleY - 12, 18, 14, 5);
            ctx.fill();

            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this._getActionIcon(agent.status), sx + 11, bubbleY - 1);
        }
    },

    _getActionIcon: function(status) {
        if (status.indexOf('Chop') >= 0) return '\uD83E\uDE93';
        if (status.indexOf('Mining') >= 0 || status.indexOf('stone') >= 0) return '\u26CF';
        if (status.indexOf('berries') >= 0 || status.indexOf('Gather') >= 0) return '\uD83E\uDED0';
        if (status.indexOf('Eat') >= 0) return '\uD83C\uDF56';
        if (status.indexOf('Sleep') >= 0) return '\uD83D\uDCA4';
        if (status.indexOf('Fiber') >= 0 || status.indexOf('fiber') >= 0) return '\uD83C\uDF3F';
        if (status.indexOf('Craft') >= 0) return '\uD83D\uDD27';
        if (status.indexOf('campfire') >= 0 || status.indexOf('Campfire') >= 0) return '\uD83D\uDD25';
        if (status.indexOf('furnace') >= 0 || status.indexOf('Furnace') >= 0) return '\u2668\uFE0F';
        if (status.indexOf('Build') >= 0) return '\uD83D\uDD28';
        if (status.indexOf('Harvest') >= 0) return '\uD83C\uDF3E';
        if (status.indexOf('Walk') >= 0) return '\uD83D\uDEB6';
        if (status.indexOf('Explor') >= 0) return '\uD83E\uDDED';
        if (status.indexOf('Wander') >= 0) return '\uD83D\uDC40';
        return '\uD83D\uDCAD';
    },

    // ═══════════════════════════════════════════
    // DAY/NIGHT
    // ═══════════════════════════════════════════

    _drawDayNight: function(ctx, world, agent, time, range) {
        if (time.darkness <= 0.02) return;

        var overlayColor = SB.Colors.night_overlay + time.darkness + ')';

        for (var y = range.minTY; y <= range.maxTY; y++) {
            for (var x = range.minTX; x <= range.maxTX; x++) {
                var tile = world.tiles[y][x];
                if (tile.type === SB.Tiles.VOID) continue;
                var pos = this.tileToScreen(x, y);
                this._fillDiamond(ctx, pos.x, pos.y, overlayColor);
            }
        }

        // Firelight near shelter
        var shelter = world.getBuilding(SB.BuildingTypes.SHELTER);
        if (shelter && time.darkness > 0.1) {
            var spos = this.tileToScreen(
                shelter.x + shelter.width / 2,
                shelter.y + shelter.height / 2
            );
            var flicker = 1 + Math.sin(this.animFrame * 0.15) * 0.1;
            var glowRadius = 60 * flicker;
            var gradient = ctx.createRadialGradient(spos.x, spos.y, 5, spos.x, spos.y, glowRadius);
            var glowAlpha = Math.min(time.darkness * 0.9, 0.35);
            gradient.addColorStop(0, SB.Colors.firelight + glowAlpha + ')');
            gradient.addColorStop(0.4, SB.Colors.firelight + (glowAlpha * 0.4) + ')');
            gradient.addColorStop(1, SB.Colors.firelight + '0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(spos.x, spos.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Agent glow
        if (agent.alive && time.darkness > 0.2) {
            var apos = this.tileToScreen(agent.x, agent.y);
            var agentGlow = ctx.createRadialGradient(apos.x, apos.y, 2, apos.x, apos.y, 35);
            agentGlow.addColorStop(0, 'rgba(255, 220, 150, 0.12)');
            agentGlow.addColorStop(1, 'rgba(255, 220, 150, 0)');
            ctx.fillStyle = agentGlow;
            ctx.beginPath();
            ctx.arc(apos.x, apos.y, 35, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ═══════════════════════════════════════════
    // FOG OF WAR
    // ═══════════════════════════════════════════

    _drawFog: function(ctx, world, range) {
        // No fog — world is fully revealed
    },

    _drawFogPulses: function(ctx, world) {
        var hh = SB.ISO_TH / 2;
        for (var i = 0; i < world.fogPulses.length; i++) {
            var pulse = world.fogPulses[i];
            var ppos = this.tileToScreen(pulse.x, pulse.y);
            var pr = pulse.radius * SB.ISO_TW * 0.5;

            ctx.beginPath();
            ctx.arc(ppos.x, ppos.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = SB.Colors.fog_pulse + (pulse.alpha * 0.6) + ')';
            ctx.lineWidth = 3;
            ctx.stroke();

            var gradient = ctx.createRadialGradient(ppos.x, ppos.y, pr * 0.8, ppos.x, ppos.y, pr);
            gradient.addColorStop(0, 'rgba(120, 180, 255, 0)');
            gradient.addColorStop(1, SB.Colors.fog_pulse + (pulse.alpha * 0.15) + ')');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.lineWidth = 1;
        }
    },

    // ═══════════════════════════════════════════
    // HUD
    // ═══════════════════════════════════════════

    _drawHUD: function(ctx, world, agent, time) {
        var hudLeft = this.viewportW;
        var hudX = hudLeft + 20;
        var hudW = this.hudWidth - 40;
        var hudRight = hudX + hudW;

        // Background
        ctx.fillStyle = '#1a1612';
        ctx.fillRect(hudLeft, 0, this.hudWidth, this.height);

        // Wood grain texture
        ctx.fillStyle = 'rgba(60, 45, 30, 0.15)';
        for (var gi = 0; gi < 20; gi++) {
            var gy = gi * (this.height / 20) + ((gi * 37) % 15);
            ctx.fillRect(hudLeft, gy, this.hudWidth, 1);
        }

        // Left border
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(hudLeft, 0, 3, this.height);
        ctx.fillStyle = 'rgba(120, 90, 50, 0.3)';
        ctx.fillRect(hudLeft + 3, 0, 1, this.height);

        var y = 32;
        ctx.textAlign = 'left';

        // Agent name
        ctx.fillStyle = '#e8d5a8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(agent.agentName || 'Agent', hudX, y);

        // LLM badge
        if (SB.LLM && SB.LLM.available) {
            var nameWidth = ctx.measureText(agent.agentName || 'Agent').width;
            var badgeX = hudX + nameWidth + 8;
            if (SB.LLMPlanner && SB.LLMPlanner.isThinking) {
                var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
                ctx.fillStyle = 'rgba(120, 200, 255, ' + (0.4 + pulse * 0.4) + ')';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('THINKING...', badgeX, y);
            } else {
                ctx.fillStyle = 'rgba(100, 220, 160, 0.7)';
                ctx.font = 'bold 9px monospace';
                ctx.fillText('AI', badgeX, y);
            }
        }

        // Day counter
        ctx.fillStyle = '#8a7a60';
        ctx.font = '11px monospace';
        var timeIcon = time.isNight ? '\uD83C\uDF19' : '\u2600\uFE0F';
        var dayStr = timeIcon + ' Day ' + (time.dayCount + 1);
        ctx.fillText(dayStr, hudRight - ctx.measureText(dayStr).width, y);
        y += 22;

        // Traits
        if (agent.personalityTraits && agent.personalityTraits.length > 0) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#6a5a44';
            var traitStr = '';
            for (var ti = 0; ti < agent.personalityTraits.length; ti++) {
                var trait = SB.Personalities ? SB.Personalities[agent.personalityTraits[ti]] : null;
                if (trait) traitStr += trait.icon + ' ' + trait.name + '  ';
            }
            if (traitStr) ctx.fillText(traitStr.trim(), hudX, y);
            y += 12;
        }

        // Time bar
        this._drawFancyBar(ctx, hudX, y, hudW, 3, time.progress,
            time.isNight ? '#3a4a6a' : '#b8922a', '#0d0a06');
        y += 14;

        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        // STATUS
        ctx.fillStyle = '#7a6a50';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('STATUS', hudX, y);
        y += 14;

        var alive = agent.alive;
        ctx.fillStyle = alive ? '#6aaa55' : '#cc4444';
        ctx.beginPath();
        ctx.arc(hudX + 4, y - 3, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = alive ? '#c8e8a8' : '#ff6666';
        ctx.font = 'bold 13px monospace';
        var statusText = alive ? agent.status : 'DEAD';
        if (statusText.length > 26) statusText = statusText.substring(0, 25) + '...';
        ctx.fillText(statusText, hudX + 14, y);
        y += 14;

        ctx.fillStyle = '#a08850';
        ctx.font = '10px monospace';
        var goalStr = 'Goal: ' + (agent.currentGoal || 'Idle');
        ctx.fillText(goalStr, hudX + 14, y);

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

        // VITALS
        ctx.fillStyle = '#7a6a50';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('VITALS', hudX, y);
        y += 14;

        ctx.fillStyle = '#8a7a60';
        ctx.font = '10px monospace';
        ctx.fillText('Hunger', hudX, y);
        var hColor = agent.hunger < 25 ? '#cc3333' : agent.hunger < 50 ? '#cc7744' : '#bb6644';
        this._drawFancyBar(ctx, hudX + 55, y - 8, hudW - 85, 10, agent.hunger / 100,
            hColor, '#1a0d0a');
        ctx.fillStyle = agent.hunger < 25 ? '#ee5544' : '#9a8a70';
        ctx.fillText(Math.round(agent.hunger), hudRight - 22, y);
        y += 18;

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

        // INVENTORY
        ctx.fillStyle = '#7a6a50';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('INVENTORY', hudX, y);
        y += 16;

        ctx.font = '11px monospace';
        var colW = Math.floor(hudW / 2);
        // Row 1
        ctx.fillStyle = '#aa9966';
        ctx.fillText('\uD83E\uDEB5 ' + agent.inventory.wood, hudX, y);
        ctx.fillStyle = '#999999';
        ctx.fillText('\uD83E\uDEA8 ' + agent.inventory.stone, hudX + colW, y);
        y += 16;
        // Row 2
        ctx.fillStyle = '#7aaa55';
        ctx.fillText('\uD83C\uDF3F ' + agent.inventory.fiber, hudX, y);
        ctx.fillStyle = '#bb7766';
        ctx.fillText('\uD83C\uDF4E ' + agent.inventory.food, hudX + colW, y);
        y += 20;

        // Tools
        if (agent.axeTier > 0 || agent.pickaxeTier > 0 || agent.hasHoe) {
            ctx.fillStyle = '#8a7a60';
            ctx.font = '10px monospace';
            var toolStr = '';
            if (agent.axeTier > 0) toolStr += (agent.axeTier >= 2 ? 'Stone' : 'Wood') + ' Axe  ';
            if (agent.pickaxeTier > 0) toolStr += (agent.pickaxeTier >= 2 ? 'Stone' : 'Wood') + ' Pick  ';
            if (agent.hasHoe) toolStr += 'Hoe';
            ctx.fillText(toolStr.trim(), hudX, y);
            y += 14;
        }

        // BUILDINGS
        if (world.buildings.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#9a8868';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('BUILDINGS', hudX, y);
            y += 14;

            ctx.font = '11px monospace';
            var buildingIcons = { campfire: '\uD83D\uDD25', workbench: '\uD83D\uDD27', shelter: '\uD83C\uDFE0', bed: '\uD83D\uDECF', farm: '\uD83C\uDF3E', well: '\uD83D\uDCA7', furnace: '\u2668\uFE0F', smokehouse: '\uD83C\uDF2B\uFE0F', storage: '\uD83D\uDCE6', workshop: '\uD83D\uDD28' };
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

        // EXPLORATION
        this._hudLine(ctx, hudX, y, hudW);
        y += 16;

        ctx.fillStyle = '#9a8868';
        ctx.font = 'bold 10px monospace';
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

        // THOUGHTS
        if (agent.thoughts && agent.thoughts.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#9a8868';
            ctx.font = 'bold 10px monospace';
            var thoughtsLabel = 'THOUGHTS';
            if (SB.LLM && SB.LLM.available) {
                thoughtsLabel = 'AI THOUGHTS';
                ctx.fillStyle = '#6aaa88';
            }
            ctx.fillText(thoughtsLabel, hudX, y);
            y += 14;

            ctx.font = '10px monospace';
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

        // KNOWLEDGE
        if (agent.knowledge && agent.knowledge.length > 0) {
            this._hudLine(ctx, hudX, y, hudW);
            y += 16;

            ctx.fillStyle = '#9a8868';
            ctx.font = 'bold 10px monospace';
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
            y += 18;
        }

        // LOG
        this._hudLine(ctx, hudX, y, hudW);
        y += 18;

        ctx.fillStyle = '#9a8868';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('LOG', hudX, y);
        y += 16;

        ctx.font = '10px monospace';
        var logCount = Math.min(agent.log.length, 6);
        for (var li = 0; li < logCount; li++) {
            var entry = agent.log[li];
            var logAlpha = 0.6 - (li * 0.08);
            ctx.fillStyle = 'rgba(180, 165, 140, ' + logAlpha + ')';
            var logText = entry.time + ': ' + entry.message;
            if (logText.length > 34) logText = logText.substring(0, 33) + '...';
            ctx.fillText(logText, hudX, y);
            y += 14;
        }
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
