var SB = window.Starbase = window.Starbase || {};

SB.World = {
    tiles: [],
    buildings: [],
    dayCount: 0,
    revealed: [],
    revealRadius: 6,
    fogPulses: [], // { x, y, radius, maxRadius, alpha }
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

        // Init tiles and revealed
        for (var y = 0; y < h; y++) {
            this.tiles[y] = [];
            this.revealed[y] = [];
            for (var x = 0; x < w; x++) {
                this.revealed[y][x] = false;
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

        // Generate island shape using noise (gentle noise for smooth edges)
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);

                // Gentle noise for organic but smooth edge
                var angle = Math.atan2(dy, dx);
                var noise1 = SB.Utils.smoothNoise(x + this.islandSeed, y + this.islandSeed, 15) * 4;
                var noise2 = SB.Utils.smoothNoise(x + this.islandSeed + 500, y + this.islandSeed + 500, 8) * 2;
                var edgeNoise = noise1 + noise2;

                if (dist < islandRadius + edgeNoise) {
                    this.tiles[y][x].type = SB.Tiles.GRASS;
                }
            }
        }

        // Cleanup pass: remove isolated land tiles and fill small holes
        this._cleanupIslandShape();

        // Mark cliff tiles (land tiles bordering void)
        this._markCliffs();

        // Generate ponds (only on land)
        this._generatePond();

        // Generate stone deposit clusters
        this._generateStoneDeposits();

        // Scatter trees (~18% of grass tiles)
        this._scatterResource(SB.Resources.TREE, 0.18, 3);

        // Scatter berry bushes (~5% of remaining grass tiles)
        this._scatterResource(SB.Resources.BERRY_BUSH, 0.05, 3);

        // Re-initialize revealed array
        this.revealed = [];
        for (var ry = 0; ry < h; ry++) {
            this.revealed[ry] = [];
            for (var rx = 0; rx < w; rx++) {
                // VOID tiles are always revealed (show stars)
                this.revealed[ry][rx] = (this.tiles[ry][rx].type === SB.Tiles.VOID);
            }
        }

        // Clear a small area near center for agent start
        for (var sdy = -2; sdy <= 2; sdy++) {
            for (var sdx = -2; sdx <= 2; sdx++) {
                var tile = this.tiles[cy + sdy] ? this.tiles[cy + sdy][cx + sdx] : null;
                if (tile && tile.type !== SB.Tiles.VOID) {
                    tile.type = SB.Tiles.GRASS;
                    tile.resource = null;
                    tile.resourceAmount = 0;
                }
            }
        }

        // Reveal initial area around agent start
        this.revealAround(cx, cy, this.revealRadius);
    },

    _cleanupIslandShape() {
        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var dirs = [[-1,0],[1,0],[0,-1],[0,1]];

        // Multiple passes to smooth the shape
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

                    // Remove isolated land (less than 2 land neighbors)
                    if (tile.type !== SB.Tiles.VOID && landNeighbors < 2) {
                        tile.type = SB.Tiles.VOID;
                        tile.resource = null;
                    }
                    // Fill small holes in land (void surrounded by 3+ land)
                    if (tile.type === SB.Tiles.VOID && landNeighbors >= 3) {
                        tile.type = SB.Tiles.GRASS;
                    }
                }
            }
        }

        // Flood fill from center to keep only the main island mass
        // (removes any disconnected fragments)
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

        // Remove any land not connected to center
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

    _generatePond() {
        var pondCount = SB.Utils.random(2, 3);
        var cx = Math.floor(SB.WORLD_WIDTH / 2);
        var cy = Math.floor(SB.WORLD_HEIGHT / 2);

        for (var p = 0; p < pondCount; p++) {
            // Place ponds within the island interior
            var angle = Math.random() * Math.PI * 2;
            var dist = SB.Utils.random(5, 25);
            var px = Math.floor(cx + Math.cos(angle) * dist);
            var py = Math.floor(cy + Math.sin(angle) * dist);
            px = SB.Utils.clamp(px, 5, SB.WORLD_WIDTH - 6);
            py = SB.Utils.clamp(py, 5, SB.WORLD_HEIGHT - 6);

            // Only place if this is grass
            if (!this.tiles[py] || !this.tiles[py][px] || this.tiles[py][px].type !== SB.Tiles.GRASS) continue;

            var pondSize = SB.Utils.random(8, 15);
            var wx = px, wy = py;
            for (var i = 0; i < pondSize; i++) {
                for (var ddy = -1; ddy <= 1; ddy++) {
                    for (var ddx = -1; ddx <= 1; ddx++) {
                        if (Math.random() > 0.4) {
                            var tx = wx + ddx;
                            var ty = wy + ddy;
                            if (tx > 1 && tx < SB.WORLD_WIDTH - 2 && ty > 1 && ty < SB.WORLD_HEIGHT - 2) {
                                var t = this.tiles[ty][tx];
                                if (t.type === SB.Tiles.GRASS) {
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

    _generateStoneDeposits() {
        var clusterCount = SB.Utils.random(3, 6);
        var centerX = Math.floor(SB.WORLD_WIDTH / 2);
        var centerY = Math.floor(SB.WORLD_HEIGHT / 2);

        for (var c = 0; c < clusterCount; c++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = SB.Utils.random(5, 30);
            var clx = Math.floor(centerX + Math.cos(angle) * dist);
            var cly = Math.floor(centerY + Math.sin(angle) * dist);
            var size = SB.Utils.random(2, 5);

            for (var i = 0; i < size; i++) {
                var sx = clx + SB.Utils.random(-1, 1);
                var sy = cly + SB.Utils.random(-1, 1);
                if (sx >= 0 && sx < SB.WORLD_WIDTH && sy >= 0 && sy < SB.WORLD_HEIGHT) {
                    var tile = this.tiles[sy][sx];
                    if (tile.type === SB.Tiles.GRASS) {
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
                // Only place on GRASS tiles (not void, cliff, water, etc.)
                if (tile.type === SB.Tiles.GRASS && !tile.resource && Math.random() < density) {
                    tile.resource = resource;
                    tile.resourceAmount = amount;
                }
            }
        }
    },

    tick() {
        // Resource regrowth
        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                var tile = this.tiles[y][x];

                // Skip void/cliff
                if (tile.type === SB.Tiles.VOID || tile.type === SB.Tiles.CLIFF) continue;

                // Tree regrowth
                if (tile.type === SB.Tiles.GRASS && !tile.resource && !tile.building && tile.growthTimer > 0) {
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

                // Farm crop growth
                if (tile.type === SB.Tiles.FARMLAND && tile.growthTimer > 0) {
                    tile.growthTimer--;
                }
            }
        }
    },

    getTile(x, y) {
        if (x < 0 || x >= SB.WORLD_WIDTH || y < 0 || y >= SB.WORLD_HEIGHT) return null;
        return this.tiles[y][x];
    },

    addBuilding(type, x, y, width, height) {
        var building = { type: type, x: x, y: y, width: width, height: height };
        this.buildings.push(building);

        // Mark tiles
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

    revealAround(cx, cy, radius) {
        var count = 0;
        for (var dy = -radius; dy <= radius; dy++) {
            for (var dx = -radius; dx <= radius; dx++) {
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    var rx = cx + dx;
                    var ry = cy + dy;
                    if (rx >= 0 && rx < SB.WORLD_WIDTH && ry >= 0 && ry < SB.WORLD_HEIGHT) {
                        if (!this.revealed[ry][rx]) {
                            this.revealed[ry][rx] = true;
                            count++;
                        }
                    }
                }
            }
        }
        return count;
    },

    milestoneReveal(cx, cy, radius) {
        this.revealAround(cx, cy, radius);
        this.fogPulses.push({
            x: cx,
            y: cy,
            radius: 0,
            maxRadius: radius,
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
        if (x < 0 || x >= SB.WORLD_WIDTH || y < 0 || y >= SB.WORLD_HEIGHT) return false;
        return this.revealed[y][x];
    },

    _revealedCache: -1,
    _revealedCacheFrame: -1,

    getRevealedPercent() {
        var frame = SB.Renderer ? SB.Renderer.animFrame : 0;
        if (this._revealedCacheFrame === frame) return this._revealedCache;

        // Only count land tiles (not void) for percentage
        var totalLand = 0;
        var revealedLand = 0;
        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                var tile = this.tiles[y][x];
                if (tile.type !== SB.Tiles.VOID) {
                    totalLand++;
                    if (this.revealed[y] && this.revealed[y][x]) revealedLand++;
                }
            }
        }
        this._revealedCache = totalLand > 0 ? Math.round((revealedLand / totalLand) * 100) : 0;
        this._revealedCacheFrame = frame;
        return this._revealedCache;
    },

    getFogAlpha(x, y) {
        if (this.isRevealed(x, y)) {
            // Void tiles are always fully revealed with no fog
            if (this.tiles[y] && this.tiles[y][x] && this.tiles[y][x].type === SB.Tiles.VOID) {
                return 0;
            }
            var adjacentHidden = 0;
            var dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
            for (var i = 0; i < dirs.length; i++) {
                var nx = x + dirs[i][0];
                var ny = y + dirs[i][1];
                if (!this.isRevealed(nx, ny)) {
                    adjacentHidden++;
                }
            }
            if (adjacentHidden > 0) {
                return adjacentHidden * 0.06;
            }
            return 0;
        }
        for (var r = 1; r <= 2; r++) {
            for (var dy = -r; dy <= r; dy++) {
                for (var dx = -r; dx <= r; dx++) {
                    if (this.isRevealed(x + dx, y + dy)) {
                        return 0.5 + (r - 1) * 0.2;
                    }
                }
            }
        }
        return 1.0;
    },

    // Get void neighbor info for cliff rendering
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
