var SB = window.Starbase = window.Starbase || {};

SB.Utils = {
    distance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan
    },

    euclidean(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    },

    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Check if a tile is walkable (not water, void, or cliff)
    isWalkable(tile) {
        if (!tile) return false;
        return tile.type !== SB.Tiles.WATER &&
               tile.type !== SB.Tiles.VOID &&
               tile.type !== SB.Tiles.CLIFF;
    },

    // BFS pathfinding - returns array of {x, y} steps (excluding start)
    findPath(world, startX, startY, goalX, goalY) {
        if (startX === goalX && startY === goalY) return [];

        var w = SB.WORLD_WIDTH;
        var h = SB.WORLD_HEIGHT;
        var visited = new Set();
        var queue = [{ x: startX, y: startY, path: [] }];
        visited.add(startX + ',' + startY);

        var dirs = [
            { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
        ];

        while (queue.length > 0) {
            var current = queue.shift();

            for (var d = 0; d < dirs.length; d++) {
                var dir = dirs[d];
                var nx = current.x + dir.dx;
                var ny = current.y + dir.dy;
                var key = nx + ',' + ny;

                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
                if (visited.has(key)) continue;

                var tile = world.tiles[ny][nx];
                if (!SB.Utils.isWalkable(tile)) continue;

                var newPath = current.path.concat([{ x: nx, y: ny }]);

                if (nx === goalX && ny === goalY) return newPath;

                visited.add(key);
                queue.push({ x: nx, y: ny, path: newPath });
            }
        }

        return null; // No path found
    },

    // Find nearest tile matching a condition (skips VOID and CLIFF)
    findNearest(world, fromX, fromY, condition, maxDist) {
        if (maxDist === undefined) maxDist = 30;
        var best = null;
        var bestDist = Infinity;

        for (var y = 0; y < SB.WORLD_HEIGHT; y++) {
            for (var x = 0; x < SB.WORLD_WIDTH; x++) {
                var tile = world.tiles[y][x];
                // Skip void and cliff tiles
                if (tile.type === SB.Tiles.VOID || tile.type === SB.Tiles.CLIFF) continue;
                if (condition(tile, x, y)) {
                    var d = SB.Utils.distance(fromX, fromY, x, y);
                    if (d < bestDist && d <= maxDist) {
                        bestDist = d;
                        best = { x: x, y: y };
                    }
                }
            }
        }

        return best;
    },

    // Find valid building placement near a position (skips VOID and CLIFF)
    findBuildingSpot(world, nearX, nearY, width, height) {
        // Spiral outward from the position
        for (var radius = 1; radius < 20; radius++) {
            for (var dy = -radius; dy <= radius; dy++) {
                for (var dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    var bx = nearX + dx;
                    var by = nearY + dy;

                    if (bx < 0 || by < 0 || bx + width > SB.WORLD_WIDTH || by + height > SB.WORLD_HEIGHT) continue;

                    var valid = true;
                    for (var cy = by; cy < by + height && valid; cy++) {
                        for (var cx = bx; cx < bx + width && valid; cx++) {
                            var tile = world.tiles[cy][cx];
                            if (tile.type !== SB.Tiles.GRASS || tile.resource || tile.building) {
                                valid = false;
                            }
                        }
                    }

                    if (valid) return { x: bx, y: by };
                }
            }
        }

        return null;
    },

    // Find building spot near water (for wells)
    findBuildingSpotNearWater(world, nearX, nearY, width, height, waterDist) {
        if (waterDist === undefined) waterDist = 5;
        for (var radius = 1; radius < 20; radius++) {
            for (var dy = -radius; dy <= radius; dy++) {
                for (var dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

                    var bx = nearX + dx;
                    var by = nearY + dy;

                    if (bx < 0 || by < 0 || bx + width > SB.WORLD_WIDTH || by + height > SB.WORLD_HEIGHT) continue;

                    var valid = true;
                    for (var cy = by; cy < by + height && valid; cy++) {
                        for (var cx = bx; cx < bx + width && valid; cx++) {
                            var tile = world.tiles[cy][cx];
                            if (tile.type !== SB.Tiles.GRASS || tile.resource || tile.building) {
                                valid = false;
                            }
                        }
                    }

                    if (!valid) continue;

                    // Check for water within waterDist
                    var nearWater = false;
                    for (var wy = by - waterDist; wy <= by + height + waterDist && !nearWater; wy++) {
                        for (var wx = bx - waterDist; wx <= bx + width + waterDist && !nearWater; wx++) {
                            if (wx >= 0 && wx < SB.WORLD_WIDTH && wy >= 0 && wy < SB.WORLD_HEIGHT) {
                                if (world.tiles[wy][wx].type === SB.Tiles.WATER) {
                                    nearWater = true;
                                }
                            }
                        }
                    }

                    if (nearWater) return { x: bx, y: by };
                }
            }
        }

        return null;
    },

    // Simple noise function for island shape generation
    hash2d(x, y) {
        var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    },

    // Smooth noise using bilinear interpolation
    smoothNoise(x, y, scale) {
        var sx = x / scale;
        var sy = y / scale;
        var ix = Math.floor(sx);
        var iy = Math.floor(sy);
        var fx = sx - ix;
        var fy = sy - iy;

        var v00 = SB.Utils.hash2d(ix, iy);
        var v10 = SB.Utils.hash2d(ix + 1, iy);
        var v01 = SB.Utils.hash2d(ix, iy + 1);
        var v11 = SB.Utils.hash2d(ix + 1, iy + 1);

        // Smoothstep interpolation
        var ux = fx * fx * (3 - 2 * fx);
        var uy = fy * fy * (3 - 2 * fy);

        var a = v00 + (v10 - v00) * ux;
        var b = v01 + (v11 - v01) * ux;
        return a + (b - a) * uy;
    },
};
