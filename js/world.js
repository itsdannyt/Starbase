var SB = window.Starbase = window.Starbase || {};

SB.World = {
    tiles: [],
    buildings: [],
    dayCount: 0,
    revealed: [],
    revealRadius: 6,
    fogPulses: [],
    islandSeed: 0,

    generate() {
        this.tiles = [];
        this.buildings = [];
        this.dayCount = 0;
        this.revealed = [];
        this.fogPulses = [];
        this.islandSeed = Math.random() * 10000;

        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var cx = Math.floor(w / 2);
        var cy = Math.floor(h / 2);
        var islandRadius = 42;

        // Init tiles
        for (var y = 0; y < h; y++) {
            this.tiles[y] = [];
            for (var x = 0; x < w; x++) {
                this.tiles[y][x] = {
                    type: SB.Tiles.VOID,
                    resource: null,
                    resourceAmount: 0,
                    building: null,
                    growthTimer: 0,
                    variant: Math.random(),
                };
            }
        }

        // Generate island shape using noise
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                var noise1 = SB.Utils.smoothNoise(x + this.islandSeed, y + this.islandSeed, 15) * 4;
                var noise2 = SB.Utils.smoothNoise(x + this.islandSeed + 500, y + this.islandSeed + 500, 8) * 2;
                var edgeNoise = noise1 + noise2;

                if (dist < islandRadius + edgeNoise) {
                    this.tiles[y][x].type = SB.Tiles.GRASS;
                }
            }
        }

        // Cleanup: smooth edges, remove fragments
        this._cleanupIslandShape();

        // Mark cliff tiles (land bordering void)
        this._markCliffs();

        // Elevation-based hills
        this._generateHills();

        // Generate rivers
        this._generateRivers();

        // Generate ponds
        this._generatePond();

        // Generate stone deposit clusters
        this._generateStoneDeposits();

        // Add sand beaches around all water
        this._addSandBeaches();

        // Scatter trees (~18% of grass/hill tiles)
        this._scatterResource(SB.Resources.TREE, 0.18, 3);

        // Scatter berry bushes (~5%)
        this._scatterResource(SB.Resources.BERRY_BUSH, 0.05, 3);

        // Scatter tall grass (~12% of remaining grass/hill tiles)
        this._scatterResource(SB.Resources.TALL_GRASS, 0.12, 2);

        // ALL TILES REVEALED from start (no fog of war)
        this.revealed = [];
        for (var ry = 0; ry < h; ry++) {
            this.revealed[ry] = [];
            for (var rx = 0; rx < w; rx++) {
                this.revealed[ry][rx] = true;
            }
        }

        // Clear a small area near center for agent start
        for (var sdy = -2; sdy <= 2; sdy++) {
            for (var sdx = -2; sdx <= 2; sdx++) {
                var tile = this.tiles[cy + sdy] ? this.tiles[cy + sdy][cx + sdx] : null;
                if (tile && tile.type !== SB.Tiles.VOID && tile.type !== SB.Tiles.CLIFF) {
                    tile.type = SB.Tiles.GRASS;
                    tile.resource = null;
                    tile.resourceAmount = 0;
                }
            }
        }
    },

    // ═══════════════════════════════════════════
    // TERRAIN GENERATION
    // ═══════════════════════════════════════════

    _cleanupIslandShape() {
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];

        for (var pass = 0; pass < 3; pass++) {
            for (var y = 1; y < h - 1; y++) {
                for (var x = 1; x < w - 1; x++) {
                    var tile = this.tiles[y][x];
                    var landNeighbors = 0;
                    for (var d = 0; d < dirs.length; d++) {
                        var nx = x + dirs[d][0];
                        var ny = y + dirs[d][1];
                        if (this.tiles[ny][nx].type !== SB.Tiles.VOID) landNeighbors++;
                    }
                    if (tile.type !== SB.Tiles.VOID && landNeighbors < 2) {
                        tile.type = SB.Tiles.VOID;
                        tile.resource = null;
                    }
                    if (tile.type === SB.Tiles.VOID && landNeighbors >= 3) {
                        tile.type = SB.Tiles.GRASS;
                    }
                }
            }
        }

        // Flood fill from center to keep only the main island
        var cx = Math.floor(w / 2);
        var cy = Math.floor(h / 2);
        var connected = [];
        for (var y = 0; y < h; y++) {
            connected[y] = [];
            for (var x = 0; x < w; x++) {
                connected[y][x] = false;
            }
        }

        var queue = [{ x: cx, y: cy }];
        connected[cy][cx] = true;
        while (queue.length > 0) {
            var cur = queue.shift();
            for (var d = 0; d < dirs.length; d++) {
                var nx = cur.x + dirs[d][0];
                var ny = cur.y + dirs[d][1];
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && !connected[ny][nx]) {
                    if (this.tiles[ny][nx].type !== SB.Tiles.VOID) {
                        connected[ny][nx] = true;
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                if (this.tiles[y][x].type !== SB.Tiles.VOID && !connected[y][x]) {
                    this.tiles[y][x].type = SB.Tiles.VOID;
                    this.tiles[y][x].resource = null;
                }
            }
        }
    },

    _markCliffs() {
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var tile = this.tiles[y][x];
                if (tile.type !== SB.Tiles.GRASS) continue;

                var bordersVoid = false;
                for (var d = 0; d < dirs.length; d++) {
                    var nx = x + dirs[d][0];
                    var ny = y + dirs[d][1];
                    if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
                        bordersVoid = true;
                        break;
                    }
                    if (this.tiles[ny][nx].type === SB.Tiles.VOID) {
                        bordersVoid = true;
                        break;
                    }
                }

                if (bordersVoid) {
                    tile.type = SB.Tiles.CLIFF;
                    tile.resource = null;
                    tile.resourceAmount = 0;
                }
            }
        }
    },

    _generateHills() {
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var cx = Math.floor(w / 2);
        var cy = Math.floor(h / 2);
        var islandRadius = 42;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var tile = this.tiles[y][x];
                if (tile.type !== SB.Tiles.GRASS) continue;

                var dx = x - cx;
                var dy = y - cy;
                var distFromCenter = Math.sqrt(dx * dx + dy * dy);

                // Only place hills in the inner 60% of the island
                if (distFromCenter > islandRadius * 0.6) continue;

                // Elevation noise
                var e = SB.Utils.smoothNoise(x + this.islandSeed + 1000, y + this.islandSeed + 1000, 12);
                e += SB.Utils.smoothNoise(x + this.islandSeed + 2000, y + this.islandSeed + 2000, 6) * 0.5;

                // Strong boost toward center
                var centerBoost = Math.max(0, 1 - distFromCenter / 22) * 0.4;
                e += centerBoost;

                if (e > 0.75) {
                    tile.type = SB.Tiles.HILL;
                }
            }
        }
    },

    _generateRivers() {
        var riverCount = SB.Utils.random(1, 2);
        var cx = Math.floor(SB.WORLD_WIDTH / 2);
        var cy = Math.floor(SB.WORLD_HEIGHT / 2);

        for (var r = 0; r < riverCount; r++) {
            // Start from near center
            var startAngle = Math.random() * Math.PI * 2;
            if (r === 1) startAngle = startAngle + Math.PI * 0.8; // second river in different direction
            var startDist = SB.Utils.random(4, 10);
            var rx = Math.round(cx + Math.cos(startAngle) * startDist);
            var ry = Math.round(cy + Math.sin(startAngle) * startDist);

            // Flow generally outward
            var flowAngle = startAngle + (Math.random() - 0.5) * 1.0;

            for (var i = 0; i < 70; i++) {
                // River widens as it flows
                var width = i < 8 ? 0 : (i < 20 ? 1 : 2);

                for (var ddy = -width; ddy <= width; ddy++) {
                    for (var ddx = -width; ddx <= width; ddx++) {
                        if (Math.abs(ddx) + Math.abs(ddy) > width + 1) continue;
                        var tx = rx + ddx;
                        var ty = ry + ddy;
                        if (tx > 1 && tx < SB.WORLD_WIDTH - 2 && ty > 1 && ty < SB.WORLD_HEIGHT - 2) {
                            var tile = this.tiles[ty][tx];
                            if (tile.type === SB.Tiles.GRASS || tile.type === SB.Tiles.HILL || tile.type === SB.Tiles.DIRT) {
                                tile.type = SB.Tiles.WATER;
                                tile.resource = null;
                                tile.resourceAmount = 0;
                            }
                        }
                    }
                }

                // Meander
                flowAngle += (Math.random() - 0.5) * 0.5;
                rx += Math.round(Math.cos(flowAngle));
                ry += Math.round(Math.sin(flowAngle));

                // Stop at cliff or void
                if (rx < 3 || rx >= SB.WORLD_WIDTH - 3 || ry < 3 || ry >= SB.WORLD_HEIGHT - 3) break;
                var nextTile = this.tiles[ry] ? this.tiles[ry][rx] : null;
                if (!nextTile || nextTile.type === SB.Tiles.VOID || nextTile.type === SB.Tiles.CLIFF) break;
            }
        }
    },

    _generatePond() {
        var pondCount = SB.Utils.random(2, 4);
        var cx = Math.floor(SB.WORLD_WIDTH / 2);
        var cy = Math.floor(SB.WORLD_HEIGHT / 2);

        for (var p = 0; p < pondCount; p++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = SB.Utils.random(5, 28);
            var px = Math.floor(cx + Math.cos(angle) * dist);
            var py = Math.floor(cy + Math.sin(angle) * dist);
            px = SB.Utils.clamp(px, 5, SB.WORLD_WIDTH - 6);
            py = SB.Utils.clamp(py, 5, SB.WORLD_HEIGHT - 6);

            if (!this.tiles[py] || !this.tiles[py][px]) continue;
            if (this.tiles[py][px].type === SB.Tiles.VOID || this.tiles[py][px].type === SB.Tiles.CLIFF) continue;

            var pondSize = SB.Utils.random(8, 18);
            var wx = px, wy = py;
            for (var i = 0; i < pondSize; i++) {
                for (var ddy = -1; ddy <= 1; ddy++) {
                    for (var ddx = -1; ddx <= 1; ddx++) {
                        if (Math.random() > 0.4) {
                            var tx = wx + ddx;
                            var ty = wy + ddy;
                            if (tx > 1 && tx < SB.WORLD_WIDTH - 2 && ty > 1 && ty < SB.WORLD_HEIGHT - 2) {
                                var t = this.tiles[ty][tx];
                                if (t.type === SB.Tiles.GRASS || t.type === SB.Tiles.HILL) {
                                    t.type = SB.Tiles.WATER;
                                    t.resource = null;
                                }
                            }
                        }
                    }
                }
                wx += SB.Utils.random(-1, 1);
                wy += SB.Utils.random(-1, 1);
                wx = SB.Utils.clamp(wx, 2, SB.WORLD_WIDTH - 3);
                wy = SB.Utils.clamp(wy, 2, SB.WORLD_HEIGHT - 3);
            }
        }
    },

    _addSandBeaches() {
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

        // Two passes — creates a 2-tile wide beach
        for (var pass = 0; pass < 2; pass++) {
            var toSand = [];
            for (var y = 0; y < h; y++) {
                for (var x = 0; x < w; x++) {
                    var tile = this.tiles[y][x];
                    if (tile.type !== SB.Tiles.GRASS && tile.type !== SB.Tiles.HILL) continue;

                    for (var d = 0; d < dirs.length; d++) {
                        var nx = x + dirs[d][0];
                        var ny = y + dirs[d][1];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            var nt = this.tiles[ny][nx].type;
                            if (nt === SB.Tiles.WATER || nt === SB.Tiles.SAND) {
                                toSand.push({ x: x, y: y });
                                break;
                            }
                        }
                    }
                }
            }

            for (var i = 0; i < toSand.length; i++) {
                var tile = this.tiles[toSand[i].y][toSand[i].x];
                if (!tile.resource && !tile.building) {
                    tile.type = SB.Tiles.SAND;
                }
            }
        }
    },

    _generateStoneDeposits() {
        var clusterCount = SB.Utils.random(4, 8);
        var centerX = Math.floor(SB.WORLD_WIDTH / 2);
        var centerY = Math.floor(SB.WORLD_HEIGHT / 2);

        for (var c = 0; c < clusterCount; c++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = SB.Utils.random(5, 32);
            var clx = Math.floor(centerX + Math.cos(angle) * dist);
            var cly = Math.floor(centerY + Math.sin(angle) * dist);
            var size = SB.Utils.random(3, 7);

            for (var i = 0; i < size; i++) {
                var sx = clx + SB.Utils.random(-2, 2);
                var sy = cly + SB.Utils.random(-2, 2);
                if (sx >= 0 && sx < SB.WORLD_WIDTH && sy >= 0 && sy < SB.WORLD_HEIGHT) {
                    var tile = this.tiles[sy][sx];
                    if (tile.type === SB.Tiles.GRASS || tile.type === SB.Tiles.HILL) {
                        tile.type = SB.Tiles.STONE_DEPOSIT;
                        tile.resource = SB.Resources.STONE;
                        tile.resourceAmount = SB.Utils.random(3, 6);
                    }
                }
            }
        }
    },

    _scatterResource(resource, density, amount) {
        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                var tile = this.tiles[y][x];
                var canPlace = (tile.type === SB.Tiles.GRASS || tile.type === SB.Tiles.HILL);
                // Fewer trees on sand, some berry bushes
                if (tile.type === SB.Tiles.SAND) {
                    canPlace = (resource === SB.Resources.BERRY_BUSH && Math.random() < 0.3);
                }
                if (canPlace && !tile.resource && Math.random() < density) {
                    tile.resource = resource;
                    tile.resourceAmount = amount;
                }
            }
        }
    },

    // ═══════════════════════════════════════════
    // TICK / GAME LOGIC
    // ═══════════════════════════════════════════

    tick() {
        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                var tile = this.tiles[y][x];
                if (tile.type === SB.Tiles.VOID || tile.type === SB.Tiles.CLIFF) continue;

                // Tree regrowth
                if ((tile.type === SB.Tiles.GRASS || tile.type === SB.Tiles.HILL) &&
                    !tile.resource && !tile.building && tile.growthTimer > 0) {
                    tile.growthTimer--;
                    if (tile.growthTimer <= 0) {
                        tile.resource = SB.Resources.TREE;
                        tile.resourceAmount = 3;
                    }
                }

                // Berry regrowth
                if (tile.resource === SB.Resources.BERRY_BUSH && tile.resourceAmount <= 0) {
                    tile.growthTimer--;
                    if (tile.growthTimer <= 0) {
                        tile.resourceAmount = 3;
                    }
                }

                // Tall grass regrowth
                if (tile.resource === SB.Resources.TALL_GRASS && tile.resourceAmount <= 0) {
                    tile.growthTimer--;
                    if (tile.growthTimer <= 0) {
                        tile.resourceAmount = 2;
                    }
                }

                // Farm crop growth
                if (tile.type === SB.Tiles.FARMLAND && tile.growthTimer > 0) {
                    tile.growthTimer--;
                }
            }
        }
    },

    // ═══════════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════════

    getTile(x, y) {
        if (x < 0 || x >= SB.WORLD_WIDTH || y < 0 || y >= SB.WORLD_HEIGHT) return null;
        return this.tiles[y][x];
    },

    addBuilding(type, x, y, width, height) {
        var building = { type: type, x: x, y: y, width: width, height: height };
        this.buildings.push(building);

        for (var dy = 0; dy < height; dy++) {
            for (var dx = 0; dx < width; dx++) {
                var tile = this.tiles[y + dy][x + dx];
                tile.building = building;
                tile.resource = null;
                if (type === SB.BuildingTypes.FARM) {
                    tile.type = SB.Tiles.FARMLAND;
                    tile.growthTimer = 50;
                }
            }
        }

        return building;
    },

    hasBuilding(type) {
        return this.buildings.some(function(b) { return b.type === type; });
    },

    getBuilding(type) {
        return this.buildings.find(function(b) { return b.type === type; });
    },

    getBuildingCount(type) {
        var count = 0;
        for (var i = 0; i < this.buildings.length; i++) {
            if (this.buildings[i].type === type) count++;
        }
        return count;
    },

    isFarmReady() {
        var farm = this.getBuilding(SB.BuildingTypes.FARM);
        if (!farm) return false;
        for (var dy = 0; dy < farm.height; dy++) {
            for (var dx = 0; dx < farm.width; dx++) {
                var tile = this.tiles[farm.y + dy][farm.x + dx];
                if (tile.type === SB.Tiles.FARMLAND && tile.growthTimer <= 0) {
                    return true;
                }
            }
        }
        return false;
    },

    harvestFarm() {
        var farm = this.getBuilding(SB.BuildingTypes.FARM);
        if (!farm) return 0;
        var harvested = 0;
        for (var dy = 0; dy < farm.height; dy++) {
            for (var dx = 0; dx < farm.width; dx++) {
                var tile = this.tiles[farm.y + dy][farm.x + dx];
                if (tile.type === SB.Tiles.FARMLAND && tile.growthTimer <= 0) {
                    harvested += 3;
                    tile.growthTimer = 40;
                }
            }
        }
        return harvested;
    },

    // ═══════════════════════════════════════════
    // FOG (kept for milestone pulses, but all revealed)
    // ═══════════════════════════════════════════

    revealAround(cx, cy, radius) {
        // Everything already revealed, but keep for compatibility
        return 0;
    },

    milestoneReveal(cx, cy, radius) {
        // Still fire the pulse animation
        this.fogPulses.push({
            x: cx, y: cy,
            radius: 0, maxRadius: radius,
            alpha: 0.8,
        });
    },

    updateFogPulses() {
        for (var i = this.fogPulses.length - 1; i >= 0; i--) {
            var pulse = this.fogPulses[i];
            pulse.radius += 0.4;
            pulse.alpha -= 0.015;
            if (pulse.alpha <= 0 || pulse.radius > pulse.maxRadius + 3) {
                this.fogPulses.splice(i, 1);
            }
        }
    },

    isRevealed(x, y) {
        return true; // Everything visible
    },

    getRevealedPercent() {
        return 100;
    },

    getFogAlpha(x, y) {
        return 0; // No fog
    },

    isBuildingNear(type, x, y, range) {
        range = range || 2;
        for (var i = 0; i < this.buildings.length; i++) {
            var b = this.buildings[i];
            if (b.type !== type) continue;
            var dx = Math.abs(x - b.x);
            var dy = Math.abs(y - b.y);
            if (dx <= range + b.width - 1 && dy <= range + b.height - 1) return true;
        }
        return false;
    },

    getVoidNeighbors(x, y) {
        var result = { top: false, bottom: false, left: false, right: false };
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;

        if (y <= 0 || this.tiles[y-1][x].type === SB.Tiles.VOID) result.top = true;
        if (y >= h-1 || this.tiles[y+1][x].type === SB.Tiles.VOID) result.bottom = true;
        if (x <= 0 || this.tiles[y][x-1].type === SB.Tiles.VOID) result.left = true;
        if (x >= w-1 || this.tiles[y][x+1].type === SB.Tiles.VOID) result.right = true;

        return result;
    },
};
