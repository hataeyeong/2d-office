/**
 * 2D Office Map Editor - Core Logic
 */

// Editor State
const EditorState = {
    map: {
        width: 20,
        height: 15,
        tileSize: 32,
        name: 'untitled'
    },
    layers: {
        floor: [],
        walls: [],
        furniture: [],
        decorations: [],
        collision: []
    },
    currentLayer: 'floor',
    selectedTile: 480,  // Default gray floor
    tool: 'brush',
    brushSize: 1,
    zoom: 1.0,
    showGrid: true,
    showCollision: false,
    layerVisibility: {
        floor: true,
        walls: true,
        furniture: true,
        decorations: true,
        collision: false
    },
    panOffset: { x: 0, y: 0 },
    history: [],
    historyIndex: -1,
    hasUnsavedChanges: false
};

// Tileset Config
const TilesetConfig = {
    imagePath: './Modern_Office_Revamped_v1.2/Modern_Office_32x32.png',
    tileSize: 32,
    tilesPerRow: 16,
    totalTiles: 848,
    paletteColumns: 8
};

// Canvas references
let mapCanvas, mapCtx;
let paletteCanvas, paletteCtx;
let previewCanvas, previewCtx;
let tileset;

// Mouse state
let isMouseDown = false;
let lastPaintPos = { x: -1, y: -1 };

/**
 * Initialize the editor
 */
async function initEditor() {
    console.log('Initializing Map Editor...');

    // Get canvas elements
    mapCanvas = document.getElementById('mapCanvas');
    mapCtx = mapCanvas.getContext('2d');
    paletteCanvas = document.getElementById('paletteCanvas');
    paletteCtx = paletteCanvas.getContext('2d');
    previewCanvas = document.getElementById('previewCanvas');
    previewCtx = previewCanvas.getContext('2d');

    // Disable image smoothing for pixel art
    mapCtx.imageSmoothingEnabled = false;
    paletteCtx.imageSmoothingEnabled = false;
    previewCtx.imageSmoothingEnabled = false;

    // Load tileset
    tileset = new TilesetManager(
        TilesetConfig.imagePath,
        TilesetConfig.tileSize,
        TilesetConfig.tilesPerRow
    );

    try {
        await tileset.load();
        console.log('Tileset loaded!');

        // Initialize layers
        initializeLayers();

        // Setup canvases
        setupMapCanvas();
        setupPaletteCanvas();
        updateTilePreview();

        // Setup event handlers
        setupEventHandlers();

        // Initial render
        render();

        updateStatus('Ready');
    } catch (error) {
        console.error('Failed to initialize editor:', error);
        updateStatus('Error: Failed to load tileset');
    }
}

/**
 * Initialize all layers with empty data
 */
function initializeLayers() {
    const { width, height } = EditorState.map;

    EditorState.layers.floor = createEmptyLayer(width, height, 480); // Default gray floor
    EditorState.layers.walls = createEmptyLayer(width, height, -1);
    EditorState.layers.furniture = createEmptyLayer(width, height, -1);
    EditorState.layers.decorations = createEmptyLayer(width, height, -1);
    EditorState.layers.collision = createEmptyLayer(width, height, 0); // 0 = walkable
}

/**
 * Create empty layer with default value
 */
function createEmptyLayer(width, height, defaultValue) {
    const layer = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(defaultValue);
        }
        layer.push(row);
    }
    return layer;
}

/**
 * Setup map canvas size
 */
function setupMapCanvas() {
    const { width, height, tileSize } = EditorState.map;
    mapCanvas.width = width * tileSize;
    mapCanvas.height = height * tileSize;
    updateMapInfo();
}

/**
 * Setup palette canvas
 */
function setupPaletteCanvas() {
    const { totalTiles, paletteColumns, tileSize } = TilesetConfig;
    const rows = Math.ceil(totalTiles / paletteColumns);

    paletteCanvas.width = paletteColumns * tileSize;
    paletteCanvas.height = rows * tileSize;

    renderPalette();
}

/**
 * Render the tileset palette
 */
function renderPalette() {
    const { totalTiles, paletteColumns, tileSize } = TilesetConfig;

    paletteCtx.fillStyle = '#0d1b2a';
    paletteCtx.fillRect(0, 0, paletteCanvas.width, paletteCanvas.height);

    for (let i = 0; i < totalTiles; i++) {
        const x = (i % paletteColumns) * tileSize;
        const y = Math.floor(i / paletteColumns) * tileSize;

        tileset.drawTile(paletteCtx, i, x, y);

        // Highlight selected tile
        if (i === EditorState.selectedTile) {
            paletteCtx.strokeStyle = '#e94560';
            paletteCtx.lineWidth = 2;
            paletteCtx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }

    // Draw grid
    paletteCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    paletteCtx.lineWidth = 1;
    for (let i = 0; i <= paletteColumns; i++) {
        paletteCtx.beginPath();
        paletteCtx.moveTo(i * tileSize, 0);
        paletteCtx.lineTo(i * tileSize, paletteCanvas.height);
        paletteCtx.stroke();
    }
    const rows = Math.ceil(totalTiles / paletteColumns);
    for (let i = 0; i <= rows; i++) {
        paletteCtx.beginPath();
        paletteCtx.moveTo(0, i * tileSize);
        paletteCtx.lineTo(paletteCanvas.width, i * tileSize);
        paletteCtx.stroke();
    }
}

/**
 * Main render function
 */
function render() {
    const { width, height, tileSize } = EditorState.map;

    // Clear canvas
    mapCtx.fillStyle = '#0d1b2a';
    mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);

    // Render layers in order
    const layerOrder = ['floor', 'walls', 'furniture', 'decorations'];
    layerOrder.forEach(layerName => {
        if (EditorState.layerVisibility[layerName]) {
            renderLayer(layerName);
        }
    });

    // Render collision overlay
    if (EditorState.showCollision || EditorState.currentLayer === 'collision') {
        renderCollisionOverlay();
    }

    // Render grid
    if (EditorState.showGrid) {
        renderGrid();
    }

    // Highlight current layer's editable tiles (optional visual feedback)
    highlightCurrentLayer();
}

/**
 * Render a single layer
 */
function renderLayer(layerName) {
    const layer = EditorState.layers[layerName];
    const { tileSize } = EditorState.map;

    for (let y = 0; y < layer.length; y++) {
        for (let x = 0; x < layer[y].length; x++) {
            const tileIndex = layer[y][x];
            if (tileIndex >= 0) {
                tileset.drawTile(mapCtx, tileIndex, x * tileSize, y * tileSize);
            }
        }
    }
}

/**
 * Render collision overlay
 */
function renderCollisionOverlay() {
    const collision = EditorState.layers.collision;
    const { tileSize } = EditorState.map;

    mapCtx.fillStyle = 'rgba(233, 69, 96, 0.4)';

    for (let y = 0; y < collision.length; y++) {
        for (let x = 0; x < collision[y].length; x++) {
            if (collision[y][x] === 1) {
                mapCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
}

/**
 * Render grid overlay
 */
function renderGrid() {
    const { width, height, tileSize } = EditorState.map;

    mapCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    mapCtx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x++) {
        mapCtx.beginPath();
        mapCtx.moveTo(x * tileSize, 0);
        mapCtx.lineTo(x * tileSize, height * tileSize);
        mapCtx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
        mapCtx.beginPath();
        mapCtx.moveTo(0, y * tileSize);
        mapCtx.lineTo(width * tileSize, y * tileSize);
        mapCtx.stroke();
    }
}

/**
 * Highlight current layer indicator
 */
function highlightCurrentLayer() {
    // Visual indicator for active layer - subtle border
    mapCtx.strokeStyle = '#e94560';
    mapCtx.lineWidth = 2;
    mapCtx.strokeRect(1, 1, mapCanvas.width - 2, mapCanvas.height - 2);
}

/**
 * Paint tile at position
 */
function paintTile(gridX, gridY) {
    if (!isInBounds(gridX, gridY)) return;

    const { currentLayer, selectedTile, brushSize } = EditorState;

    // Apply brush size
    for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
            const x = gridX + dx;
            const y = gridY + dy;

            if (isInBounds(x, y)) {
                if (currentLayer === 'collision') {
                    // Toggle collision
                    EditorState.layers.collision[y][x] =
                        EditorState.layers.collision[y][x] === 1 ? 0 : 1;
                } else {
                    EditorState.layers[currentLayer][y][x] = selectedTile;
                }
            }
        }
    }

    EditorState.hasUnsavedChanges = true;
    updateUnsavedIndicator();
    render();
}

/**
 * Erase tile at position
 */
function eraseTile(gridX, gridY) {
    if (!isInBounds(gridX, gridY)) return;

    const { currentLayer, brushSize } = EditorState;

    for (let dy = 0; dy < brushSize; dy++) {
        for (let dx = 0; dx < brushSize; dx++) {
            const x = gridX + dx;
            const y = gridY + dy;

            if (isInBounds(x, y)) {
                if (currentLayer === 'collision') {
                    EditorState.layers.collision[y][x] = 0;
                } else {
                    EditorState.layers[currentLayer][y][x] = -1;
                }
            }
        }
    }

    EditorState.hasUnsavedChanges = true;
    updateUnsavedIndicator();
    render();
}

/**
 * Fill bucket tool (flood fill)
 */
function fillBucket(startX, startY) {
    if (!isInBounds(startX, startY)) return;

    const { currentLayer, selectedTile } = EditorState;

    if (currentLayer === 'collision') return; // Don't fill collision

    const layer = EditorState.layers[currentLayer];
    const targetTile = layer[startY][startX];

    if (targetTile === selectedTile) return; // Already same tile

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const key = `${x},${y}`;

        if (visited.has(key)) continue;
        if (!isInBounds(x, y)) continue;
        if (layer[y][x] !== targetTile) continue;

        visited.add(key);
        layer[y][x] = selectedTile;

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }

    EditorState.hasUnsavedChanges = true;
    updateUnsavedIndicator();
    render();
}

/**
 * Eyedropper tool - pick tile from map
 */
function eyedropperPick(gridX, gridY) {
    if (!isInBounds(gridX, gridY)) return;

    // Check layers from top to bottom
    const layerOrder = ['decorations', 'furniture', 'walls', 'floor'];

    for (const layerName of layerOrder) {
        const tile = EditorState.layers[layerName][gridY][gridX];
        if (tile >= 0) {
            EditorState.selectedTile = tile;
            updateTilePreview();
            renderPalette();
            updateStatus(`Picked tile #${tile} from ${layerName}`);
            return;
        }
    }
}

/**
 * Apply current tool at position
 */
function applyTool(gridX, gridY) {
    switch (EditorState.tool) {
        case 'brush':
            paintTile(gridX, gridY);
            break;
        case 'eraser':
            eraseTile(gridX, gridY);
            break;
        case 'fill':
            fillBucket(gridX, gridY);
            break;
        case 'eyedropper':
            eyedropperPick(gridX, gridY);
            break;
    }
}

/**
 * Check if position is in bounds
 */
function isInBounds(x, y) {
    return x >= 0 && x < EditorState.map.width &&
           y >= 0 && y < EditorState.map.height;
}

/**
 * Convert screen coordinates to grid position
 */
function screenToGrid(screenX, screenY) {
    const rect = mapCanvas.getBoundingClientRect();
    const x = Math.floor((screenX - rect.left) / EditorState.map.tileSize);
    const y = Math.floor((screenY - rect.top) / EditorState.map.tileSize);
    return { x, y };
}

/**
 * Update tile preview
 */
function updateTilePreview() {
    previewCtx.fillStyle = '#0d1b2a';
    previewCtx.fillRect(0, 0, 64, 64);

    if (EditorState.selectedTile >= 0) {
        // Draw 2x scaled preview
        const { tileSize } = TilesetConfig;
        const srcX = (EditorState.selectedTile % TilesetConfig.tilesPerRow) * tileSize;
        const srcY = Math.floor(EditorState.selectedTile / TilesetConfig.tilesPerRow) * tileSize;

        previewCtx.drawImage(
            tileset.image,
            srcX, srcY, tileSize, tileSize,
            0, 0, 64, 64
        );
    }

    document.getElementById('selectedTileIndex').textContent = EditorState.selectedTile;
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
    // Map canvas events
    mapCanvas.addEventListener('mousedown', handleMapMouseDown);
    mapCanvas.addEventListener('mousemove', handleMapMouseMove);
    mapCanvas.addEventListener('mouseup', handleMapMouseUp);
    mapCanvas.addEventListener('mouseleave', handleMapMouseUp);
    mapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Palette events
    paletteCanvas.addEventListener('click', handlePaletteClick);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

/**
 * Map mouse down handler
 */
function handleMapMouseDown(event) {
    if (event.button === 0) { // Left click
        isMouseDown = true;
        const { x, y } = screenToGrid(event.clientX, event.clientY);
        lastPaintPos = { x, y };
        applyTool(x, y);
    }
}

/**
 * Map mouse move handler
 */
function handleMapMouseMove(event) {
    const { x, y } = screenToGrid(event.clientX, event.clientY);

    // Update position display
    if (isInBounds(x, y)) {
        document.getElementById('cursorPosition').textContent = `Position: (${x}, ${y})`;
    }

    // Paint while dragging
    if (isMouseDown && EditorState.tool !== 'fill') {
        if (x !== lastPaintPos.x || y !== lastPaintPos.y) {
            lastPaintPos = { x, y };
            applyTool(x, y);
        }
    }
}

/**
 * Map mouse up handler
 */
function handleMapMouseUp() {
    isMouseDown = false;
    lastPaintPos = { x: -1, y: -1 };
}

/**
 * Palette click handler
 */
function handlePaletteClick(event) {
    const rect = paletteCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const { tileSize, paletteColumns, totalTiles } = TilesetConfig;
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    const tileIndex = row * paletteColumns + col;

    if (tileIndex >= 0 && tileIndex < totalTiles) {
        EditorState.selectedTile = tileIndex;
        updateTilePreview();
        renderPalette();
        updateStatus(`Selected tile #${tileIndex}`);
    }
}

/**
 * Keyboard shortcut handler
 */
function handleKeyDown(event) {
    // Prevent shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT') return;

    const key = event.key.toLowerCase();

    switch (key) {
        case 'b':
            selectTool('brush');
            break;
        case 'e':
            selectTool('eraser');
            break;
        case 'g':
            selectTool('fill');
            break;
        case 'i':
            selectTool('eyedropper');
            break;
        case '1':
            selectLayer('floor');
            break;
        case '2':
            selectLayer('walls');
            break;
        case '3':
            selectLayer('furniture');
            break;
        case '4':
            selectLayer('decorations');
            break;
        case '5':
            selectLayer('collision');
            break;
        case 'h':
            toggleGrid();
            break;
        case '[':
            changeBrushSize(-1);
            break;
        case ']':
            changeBrushSize(1);
            break;
        case 's':
            if (event.ctrlKey) {
                event.preventDefault();
                downloadMapJSON();
            }
            break;
        case 'n':
            if (event.ctrlKey) {
                event.preventDefault();
                createNewMap();
            }
            break;
        case 'z':
            if (event.ctrlKey) {
                event.preventDefault();
                // TODO: Implement undo
            }
            break;
    }
}

/**
 * Select tool
 */
function selectTool(toolName) {
    EditorState.tool = toolName;
    updateToolUI();
    updateStatus(`Tool: ${toolName}`);
}

/**
 * Select layer
 */
function selectLayer(layerName) {
    EditorState.currentLayer = layerName;
    updateLayerUI();
    updateStatus(`Layer: ${layerName}`);
}

/**
 * Toggle grid visibility
 */
function toggleGrid() {
    EditorState.showGrid = !EditorState.showGrid;
    document.getElementById('showGrid').checked = EditorState.showGrid;
    render();
}

/**
 * Change brush size
 */
function changeBrushSize(delta) {
    const newSize = Math.max(1, Math.min(3, EditorState.brushSize + delta));
    EditorState.brushSize = newSize;
    updateBrushUI();
}

/**
 * Create new empty map
 */
function createNewMap() {
    if (EditorState.hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Create new map anyway?')) {
            return;
        }
    }

    const width = parseInt(document.getElementById('mapWidth').value) || 20;
    const height = parseInt(document.getElementById('mapHeight').value) || 15;

    EditorState.map.width = width;
    EditorState.map.height = height;

    initializeLayers();
    setupMapCanvas();
    render();

    EditorState.hasUnsavedChanges = false;
    updateUnsavedIndicator();
    updateStatus('Created new map');
}

/**
 * Resize existing map
 */
function resizeMap() {
    const newWidth = parseInt(document.getElementById('mapWidth').value) || 20;
    const newHeight = parseInt(document.getElementById('mapHeight').value) || 15;

    const { width: oldWidth, height: oldHeight } = EditorState.map;

    // Resize each layer
    Object.keys(EditorState.layers).forEach(layerName => {
        const oldLayer = EditorState.layers[layerName];
        const defaultValue = layerName === 'floor' ? 480 : (layerName === 'collision' ? 0 : -1);
        const newLayer = createEmptyLayer(newWidth, newHeight, defaultValue);

        // Copy old data
        for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
            for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
                newLayer[y][x] = oldLayer[y][x];
            }
        }

        EditorState.layers[layerName] = newLayer;
    });

    EditorState.map.width = newWidth;
    EditorState.map.height = newHeight;

    setupMapCanvas();
    render();

    EditorState.hasUnsavedChanges = true;
    updateUnsavedIndicator();
    updateStatus(`Resized map to ${newWidth}x${newHeight}`);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initEditor);
