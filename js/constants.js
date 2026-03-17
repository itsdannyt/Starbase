var SB = window.Starbase = window.Starbase || {};

SB.TILE_SIZE = 24; // legacy, used by non-rendering systems
SB.ISO_TW = 48;    // isometric tile width (diamond)
SB.ISO_TH = 24;    // isometric tile height (diamond)
SB.WORLD_WIDTH = 100;
SB.WORLD_HEIGHT = 100;
SB.TICK_RATE = 200; // ms per game tick

// Day/night: one full day = 120 seconds real time
SB.DAY_LENGTH = 120000; // ms

SB.Tiles = {
    GRASS: 'grass',
    TALL_GRASS: 'tall_grass',
    WATER: 'water',
    DIRT: 'dirt',
    STONE_DEPOSIT: 'stone_deposit',
    FARMLAND: 'farmland',
    VOID: 'void',
    CLIFF: 'cliff',
    SAND: 'sand',
    HILL: 'hill',
};

SB.Resources = {
    TREE: 'tree',
    BERRY_BUSH: 'berry_bush',
    STONE: 'stone',
    TALL_GRASS: 'tall_grass',
    NONE: null,
};

SB.BuildingTypes = {
    CAMPFIRE: 'campfire',
    WORKBENCH: 'workbench',
    SHELTER: 'shelter',
    BED: 'bed',
    FARM: 'farm',
    WELL: 'well',
    FURNACE: 'furnace',
    SMOKEHOUSE: 'smokehouse',
    STORAGE: 'storage',
    WORKSHOP: 'workshop',
    WALL: 'wall',
};

SB.Colors = {
    // Tiles - richer, more natural palette
    grass1: '#5a9b47',
    grass2: '#4e8c3d',
    grass3: '#528f42',
    grass4: '#4b8539',
    grass_flower1: '#d4a843',
    grass_flower2: '#c47a5a',
    grass_flower3: '#8a7cc4',
    water_light: '#4a90c4',
    water_mid: '#3d7db5',
    water_deep: '#3068a0',
    water_foam: '#7abde0',
    dirt: '#9b8060',
    dirt_dark: '#7a6545',
    stone_deposit: '#8a8888',
    stone_deposit_dark: '#6a6868',
    farmland: '#6b5535',
    farmland_dark: '#5a4528',
    sand1: '#d4b878',
    sand2: '#c8aa6a',
    sand3: '#ccae70',
    sand_dark: '#b89858',
    hill1: '#6aad50',
    hill2: '#5ea048',
    hill3: '#62a44c',
    hill4: '#589942',

    // Island / Cliff / Void
    cliff_top: '#7a6a55',
    cliff_face: '#4a3a2a',
    cliff_shadow: '#2a1e14',
    cliff_edge: '#5a4a38',
    void_bg: '#050510',

    // Stars
    star_white: '#ffffff',
    star_blue: '#aaccff',
    star_yellow: '#ffeedd',
    star_dim: '#667788',

    // Resources - more vibrant
    tree_trunk: '#6b4430',
    tree_trunk_dark: '#4a2e1e',
    tree_canopy1: '#2d6b1e',
    tree_canopy2: '#3a7d28',
    tree_canopy3: '#258a18',
    tree_highlight: '#5aad3a',
    berry_bush: '#3a8a3a',
    berry_bush_dark: '#2a6a2a',
    berry: '#ee3355',
    berry_highlight: '#ff6680',
    stone_resource: '#aaaaaa',
    stone_shadow: '#777777',
    stone_highlight: '#cccccc',

    // Agent - warmer
    agent_body: '#f0cc78',
    agent_skin: '#e8b860',
    agent_outline: '#c49440',
    agent_eye: '#2a2a2a',
    agent_sleep: '#7799dd',
    agent_hair: '#8b5a2b',

    // Buildings - more detailed
    shelter_wall: '#a07828',
    shelter_wall_dark: '#7a5a18',
    shelter_roof: '#b06030',
    shelter_roof_dark: '#8a4820',
    shelter_door: '#5a3810',
    shelter_window: '#88ccee',
    farm_soil: '#5a4528',
    farm_soil_light: '#6b5535',
    farm_crop: '#4aaa2a',
    farm_crop_dark: '#388820',
    farm_crop_young: '#7ab842',
    farm_crop_grain: '#ddb030',

    // Tall grass
    tall_grass1: '#6aaa50',
    tall_grass2: '#5e9d48',
    tall_grass3: '#62a04a',
    tall_grass_blade: '#7abf58',

    // New building colors
    campfire_log: '#6b4430',
    campfire_ember: '#ff6622',
    campfire_flame: '#ffaa33',
    campfire_glow: '#ff8800',
    workbench_top: '#c49a50',
    workbench_leg: '#7a5a30',
    workbench_top_dark: '#a07838',
    bed_frame: '#8a6a38',
    bed_sheet: '#ccbbaa',
    bed_pillow: '#ddccbb',
    furnace_stone: '#888899',
    furnace_opening: '#ff5522',
    furnace_dark: '#555566',
    smokehouse_wall: '#8a7058',
    smokehouse_chimney: '#666677',
    storage_wood: '#9a7040',
    storage_wood_dark: '#6a4a28',
    storage_roof: '#8a5530',
    well_stone: '#888899',
    well_stone_dark: '#666677',
    well_water: '#4488cc',
    workshop_wall: '#8a7050',
    workshop_wall_dark: '#5a4830',
    workshop_roof: '#7a4a28',
    wall_stone: '#777788',
    wall_stone_dark: '#555566',
    wall_stone_light: '#9999aa',

    // UI
    hud_bg: 'rgba(15, 15, 30, 0.85)',
    hud_border: 'rgba(80, 80, 120, 0.4)',
    hud_text: '#d8d8e8',
    hud_dim: '#8888aa',
    hunger_bar: '#dd5555',
    hunger_bar_bg: '#442222',
    energy_bar: '#55bb55',
    energy_bar_bg: '#224422',

    // Day/night
    night_overlay: 'rgba(8, 8, 35, ',
    firelight: 'rgba(255, 190, 90, ',

    // Fog of war
    fog_dark: 'rgba(8, 8, 20, 0.95)',
    fog_edge: 'rgba(8, 8, 20, ',
    fog_pulse: 'rgba(120, 180, 255, ',
};
