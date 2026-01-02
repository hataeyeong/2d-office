'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import styles from './page.module.css';

// Multiple Tileset Configuration
const TILESETS = [
    {
        id: 'room_builder',
        name: '바닥/벽',
        imagePath: '/tileset/Room_Builder_Office_32x32.png',
        tileSize: 32,
        tilesPerRow: 16,
        totalTiles: 224,
        offset: 0
    },
    {
        id: 'modern_office',
        name: '가구/장식',
        imagePath: '/tileset/Modern_Office_32x32.png',
        tileSize: 32,
        tilesPerRow: 16,
        totalTiles: 848,
        offset: 1000
    }
];

const PALETTE_COLUMNS = 16;
const STORAGE_KEY = 'map-editor-autosave';

// Lucide cursor icons (24x24) - clean line style
const CURSORS = {
    // Select - crosshair cursor for selection
    select: 'crosshair',

    // Pencil - tip at bottom-left
    brush: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e94560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'/%3E%3Cpath d='m15 5 4 4'/%3E%3C/svg%3E") 2 22, crosshair`,

    // Eraser
    eraser: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e94560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'/%3E%3Cpath d='M22 21H7'/%3E%3Cpath d='m5 11 9 9'/%3E%3C/svg%3E") 4 20, crosshair`,

    // Paint bucket
    fill: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e94560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z'/%3E%3Cpath d='m5 2 5 5'/%3E%3Cpath d='M2 13h15'/%3E%3Cpath d='M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z'/%3E%3C/svg%3E") 2 20, crosshair`,

    // Pipette (eyedropper)
    eyedropper: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e94560' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 22 1-1h3l9-9'/%3E%3Cpath d='M3 21v-3l9-9'/%3E%3Cpath d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/%3E%3C/svg%3E") 2 22, crosshair`
};

// Create empty layer
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

// LocalStorage save/load functions
function saveToLocalStorage(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('Failed to save to LocalStorage:', e);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Failed to load from LocalStorage:', e);
    }
    return null;
}

// Get tileset info for a given tile index
function getTilesetForIndex(tileIndex) {
    if (tileIndex < 0) return null;
    for (let i = TILESETS.length - 1; i >= 0; i--) {
        const ts = TILESETS[i];
        if (tileIndex >= ts.offset && tileIndex < ts.offset + ts.totalTiles) {
            return ts;
        }
    }
    return TILESETS[0];
}

export default function MapEditor() {
    // Refs
    const mapCanvasRef = useRef(null);
    const paletteCanvasRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const tilesetImagesRef = useRef({});
    const fileInputRef = useRef(null);

    // State
    const [loading, setLoading] = useState(true);
    const [activeTileset, setActiveTileset] = useState(0);
    const [mapConfig, setMapConfig] = useState({ width: 20, height: 15, tileSize: 32, name: 'untitled' });
    const [layers, setLayers] = useState({
        floor: [],
        walls: [],
        furniture: [],
        decorations: [],
        frontFurniture: [],
        frontDecorations: [],
        collision: []
    });
    const [currentLayer, setCurrentLayer] = useState('floor');
    const [selectedTile, setSelectedTile] = useState(0);
    // Multi-tile selection: array of {tileIndex, dx, dy} where dx, dy are relative to top-left of selection
    const [multiSelection, setMultiSelection] = useState([]);
    const [tool, setTool] = useState('brush');
    const [mapSelection, setMapSelection] = useState(null); // { startX, startY, endX, endY }
    const [brushSize, setBrushSize] = useState(1);
    const [zoom, setZoom] = useState(1.0);
    const [showGrid, setShowGrid] = useState(true);
    const [showCollision, setShowCollision] = useState(false);
    const [layerVisibility, setLayerVisibility] = useState({
        floor: true, walls: true, furniture: true, decorations: true, frontFurniture: true, frontDecorations: true, collision: false
    });
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [status, setStatus] = useState('Ready');

    // Undo/Redo stacks
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const MAX_HISTORY = 200;

    // Mouse state refs
    const isMouseDownRef = useRef(false);
    const lastPaintPosRef = useRef({ x: -1, y: -1 });
    const isSelectingMapRef = useRef(false);
    const mapSelectionStartRef = useRef({ x: -1, y: -1 });

    // Palette selection refs
    const isPaletteSelectingRef = useRef(false);
    const paletteSelectionStartRef = useRef({ col: -1, row: -1 });
    const [paletteSelectionEnd, setPaletteSelectionEnd] = useState({ col: -1, row: -1 });

    // Auto-save ref
    const saveTimeoutRef = useRef(null);
    const isInitializedRef = useRef(false);

    // Initialize layers
    const initializeLayers = useCallback((width, height) => {
        return {
            floor: createEmptyLayer(width, height, 0),
            walls: createEmptyLayer(width, height, -1),
            furniture: createEmptyLayer(width, height, -1),
            decorations: createEmptyLayer(width, height, -1),
            frontFurniture: createEmptyLayer(width, height, -1),
            frontDecorations: createEmptyLayer(width, height, -1),
            collision: createEmptyLayer(width, height, 0)
        };
    }, []);

    // Load all tilesets and restore from LocalStorage
    useEffect(() => {
        let loadedCount = 0;
        const totalToLoad = TILESETS.length;

        TILESETS.forEach(ts => {
            const img = new Image();
            img.onload = () => {
                tilesetImagesRef.current[ts.id] = img;
                loadedCount++;
                if (loadedCount === totalToLoad) {
                    // Try to restore from LocalStorage
                    const saved = loadFromLocalStorage();
                    if (saved) {
                        if (saved.mapConfig) setMapConfig(saved.mapConfig);
                        if (saved.layers) {
                            // Migrate layers: old 'front' → 'frontFurniture', add 'frontDecorations'
                            const loadedLayers = { ...saved.layers };
                            const width = saved.mapConfig?.width || mapConfig.width;
                            const height = saved.mapConfig?.height || mapConfig.height;
                            // Migrate old 'front' to 'frontFurniture'
                            if (loadedLayers.front && !loadedLayers.frontFurniture) {
                                loadedLayers.frontFurniture = loadedLayers.front;
                                delete loadedLayers.front;
                            }
                            if (!loadedLayers.frontFurniture) {
                                loadedLayers.frontFurniture = createEmptyLayer(width, height, -1);
                            }
                            if (!loadedLayers.frontDecorations) {
                                loadedLayers.frontDecorations = createEmptyLayer(width, height, -1);
                            }
                            setLayers(loadedLayers);
                        }
                        if (saved.activeTileset !== undefined) setActiveTileset(saved.activeTileset);
                        // Migrate currentLayer if it was 'front'
                        if (saved.currentLayer) {
                            const layer = saved.currentLayer === 'front' ? 'frontFurniture' : saved.currentLayer;
                            setCurrentLayer(layer);
                        }
                        if (saved.selectedTile !== undefined) setSelectedTile(saved.selectedTile);
                        if (saved.tool) setTool(saved.tool);
                        if (saved.zoom) setZoom(saved.zoom);
                        if (saved.showGrid !== undefined) setShowGrid(saved.showGrid);
                        if (saved.layerVisibility) {
                            // Migrate visibility: old 'front' → 'frontFurniture', add 'frontDecorations'
                            const visibility = { ...saved.layerVisibility };
                            if (visibility.front !== undefined && visibility.frontFurniture === undefined) {
                                visibility.frontFurniture = visibility.front;
                                delete visibility.front;
                            }
                            if (visibility.frontFurniture === undefined) visibility.frontFurniture = true;
                            if (visibility.frontDecorations === undefined) visibility.frontDecorations = true;
                            setLayerVisibility(visibility);
                        }
                        setStatus('이전 작업 복원됨');
                    } else {
                        setLayers(initializeLayers(mapConfig.width, mapConfig.height));
                        setStatus('Ready');
                    }
                    isInitializedRef.current = true;
                    setLoading(false);
                }
            };
            img.onerror = () => {
                setStatus(`Error: Failed to load ${ts.name} tileset`);
                loadedCount++;
                if (loadedCount === totalToLoad) {
                    setLoading(false);
                }
            };
            img.src = ts.imagePath;
        });
    }, []);

    // Draw tile helper - handles multiple tilesets
    const drawTile = useCallback((ctx, tileIndex, destX, destY) => {
        if (tileIndex < 0) return;

        const ts = getTilesetForIndex(tileIndex);
        if (!ts) return;

        const img = tilesetImagesRef.current[ts.id];
        if (!img) return;

        const localIndex = tileIndex - ts.offset;
        const srcX = (localIndex % ts.tilesPerRow) * ts.tileSize;
        const srcY = Math.floor(localIndex / ts.tilesPerRow) * ts.tileSize;
        ctx.drawImage(img, srcX, srcY, ts.tileSize, ts.tileSize, destX, destY, ts.tileSize, ts.tileSize);
    }, []);

    // Render map
    const renderMap = useCallback(() => {
        const canvas = mapCanvasRef.current;
        const hasImages = Object.keys(tilesetImagesRef.current).length > 0;
        if (!canvas || !hasImages) return;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const { width, height, tileSize } = mapConfig;

        // Clear
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render layers
        const layerOrder = ['floor', 'walls', 'furniture', 'decorations', 'frontFurniture', 'frontDecorations'];
        layerOrder.forEach(layerName => {
            if (layerVisibility[layerName] && layers[layerName]) {
                for (let y = 0; y < layers[layerName].length; y++) {
                    for (let x = 0; x < layers[layerName][y].length; x++) {
                        const tileIndex = layers[layerName][y][x];
                        if (tileIndex >= 0) {
                            drawTile(ctx, tileIndex, x * tileSize, y * tileSize);
                        }
                    }
                }
            }
        });

        // Collision overlay
        if (showCollision || currentLayer === 'collision') {
            ctx.fillStyle = 'rgba(233, 69, 96, 0.4)';
            if (layers.collision) {
                for (let y = 0; y < layers.collision.length; y++) {
                    for (let x = 0; x < layers.collision[y].length; x++) {
                        if (layers.collision[y][x] === 1) {
                            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
                        }
                    }
                }
            }
        }

        // Grid
        if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            for (let x = 0; x <= width; x++) {
                ctx.beginPath();
                ctx.moveTo(x * tileSize, 0);
                ctx.lineTo(x * tileSize, height * tileSize);
                ctx.stroke();
            }
            for (let y = 0; y <= height; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * tileSize);
                ctx.lineTo(width * tileSize, y * tileSize);
                ctx.stroke();
            }
        }

        // Map selection overlay
        if (mapSelection) {
            const minX = Math.min(mapSelection.startX, mapSelection.endX);
            const maxX = Math.max(mapSelection.startX, mapSelection.endX);
            const minY = Math.min(mapSelection.startY, mapSelection.endY);
            const maxY = Math.max(mapSelection.startY, mapSelection.endY);

            // Selection fill
            ctx.fillStyle = 'rgba(100, 149, 237, 0.3)'; // Cornflower blue
            ctx.fillRect(
                minX * tileSize,
                minY * tileSize,
                (maxX - minX + 1) * tileSize,
                (maxY - minY + 1) * tileSize
            );

            // Selection border
            ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(
                minX * tileSize,
                minY * tileSize,
                (maxX - minX + 1) * tileSize,
                (maxY - minY + 1) * tileSize
            );
            ctx.setLineDash([]);
        }

        // Border
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }, [mapConfig, layers, layerVisibility, showGrid, showCollision, currentLayer, drawTile, mapSelection]);

    // Get selection bounds from start and end
    const getSelectionBounds = useCallback(() => {
        const start = paletteSelectionStartRef.current;
        const end = paletteSelectionEnd;
        if (start.col < 0 || end.col < 0) return null;

        return {
            minCol: Math.min(start.col, end.col),
            maxCol: Math.max(start.col, end.col),
            minRow: Math.min(start.row, end.row),
            maxRow: Math.max(start.row, end.row)
        };
    }, [paletteSelectionEnd]);

    // Render palette for active tileset
    const renderPalette = useCallback(() => {
        const canvas = paletteCanvasRef.current;
        const ts = TILESETS[activeTileset];
        const img = tilesetImagesRef.current[ts.id];
        if (!canvas || !img) return;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const { totalTiles, tileSize, tilesPerRow, offset } = ts;

        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Build set of selected tile indices for highlighting
        const selectedIndices = new Set();
        if (multiSelection.length > 0) {
            multiSelection.forEach(sel => selectedIndices.add(sel.tileIndex));
        } else {
            selectedIndices.add(selectedTile);
        }

        // Draw all tiles from active tileset
        for (let i = 0; i < totalTiles; i++) {
            const srcX = (i % tilesPerRow) * tileSize;
            const srcY = Math.floor(i / tilesPerRow) * tileSize;
            const destX = (i % PALETTE_COLUMNS) * tileSize;
            const destY = Math.floor(i / PALETTE_COLUMNS) * tileSize;
            ctx.drawImage(img, srcX, srcY, tileSize, tileSize, destX, destY, tileSize, tileSize);

            // Highlight selected tiles
            const globalIndex = i + offset;
            if (selectedIndices.has(globalIndex)) {
                ctx.strokeStyle = '#e94560';
                ctx.lineWidth = 2;
                ctx.strokeRect(destX + 1, destY + 1, tileSize - 2, tileSize - 2);
            }
        }

        // Draw selection rectangle while dragging
        if (isPaletteSelectingRef.current) {
            const bounds = getSelectionBounds();
            if (bounds) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(
                    bounds.minCol * tileSize,
                    bounds.minRow * tileSize,
                    (bounds.maxCol - bounds.minCol + 1) * tileSize,
                    (bounds.maxRow - bounds.minRow + 1) * tileSize
                );
                ctx.setLineDash([]);
            }
        }

        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        const rows = Math.ceil(totalTiles / PALETTE_COLUMNS);
        for (let i = 0; i <= PALETTE_COLUMNS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * tileSize, 0);
            ctx.lineTo(i * tileSize, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= rows; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * tileSize);
            ctx.lineTo(canvas.width, i * tileSize);
            ctx.stroke();
        }
    }, [selectedTile, multiSelection, activeTileset, getSelectionBounds]);

    // Render preview - show multi-selection if available
    const renderPreview = useCallback(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (multiSelection.length > 1) {
            // Multi-tile selection - calculate bounds and scale to fit
            let maxDx = 0, maxDy = 0;
            multiSelection.forEach(sel => {
                maxDx = Math.max(maxDx, sel.dx);
                maxDy = Math.max(maxDy, sel.dy);
            });

            const selWidth = maxDx + 1;
            const selHeight = maxDy + 1;
            const scale = Math.min(canvas.width / (selWidth * 32), canvas.height / (selHeight * 32));
            const tileDrawSize = 32 * scale;

            multiSelection.forEach(sel => {
                const ts = getTilesetForIndex(sel.tileIndex);
                if (ts) {
                    const img = tilesetImagesRef.current[ts.id];
                    if (img) {
                        const localIndex = sel.tileIndex - ts.offset;
                        const srcX = (localIndex % ts.tilesPerRow) * ts.tileSize;
                        const srcY = Math.floor(localIndex / ts.tilesPerRow) * ts.tileSize;
                        ctx.drawImage(img, srcX, srcY, ts.tileSize, ts.tileSize,
                            sel.dx * tileDrawSize, sel.dy * tileDrawSize, tileDrawSize, tileDrawSize);
                    }
                }
            });
        } else if (selectedTile >= 0) {
            // Single tile
            const ts = getTilesetForIndex(selectedTile);
            if (ts) {
                const img = tilesetImagesRef.current[ts.id];
                if (img) {
                    const localIndex = selectedTile - ts.offset;
                    const srcX = (localIndex % ts.tilesPerRow) * ts.tileSize;
                    const srcY = Math.floor(localIndex / ts.tilesPerRow) * ts.tileSize;
                    ctx.drawImage(img, srcX, srcY, ts.tileSize, ts.tileSize, 0, 0, 64, 64);
                }
            }
        }
    }, [selectedTile, multiSelection]);

    // Setup canvases
    useEffect(() => {
        if (loading) return;

        const mapCanvas = mapCanvasRef.current;
        const paletteCanvas = paletteCanvasRef.current;

        if (mapCanvas) {
            mapCanvas.width = mapConfig.width * mapConfig.tileSize;
            mapCanvas.height = mapConfig.height * mapConfig.tileSize;
        }

        if (paletteCanvas) {
            const ts = TILESETS[activeTileset];
            const rows = Math.ceil(ts.totalTiles / PALETTE_COLUMNS);
            paletteCanvas.width = PALETTE_COLUMNS * ts.tileSize;
            paletteCanvas.height = rows * ts.tileSize;
        }

        renderMap();
        renderPalette();
        renderPreview();
    }, [loading, mapConfig, activeTileset, renderMap, renderPalette, renderPreview]);

    // Re-render on state changes
    useEffect(() => {
        if (!loading) {
            renderMap();
        }
    }, [layers, layerVisibility, showGrid, showCollision, currentLayer, loading, renderMap, mapSelection]);

    useEffect(() => {
        if (!loading) {
            renderPalette();
            renderPreview();
        }
    }, [selectedTile, multiSelection, activeTileset, paletteSelectionEnd, loading, renderPalette, renderPreview]);

    // Auto-save to LocalStorage (debounced)
    useEffect(() => {
        if (!isInitializedRef.current || loading) return;

        // Clear previous timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        setStatus('저장 중...');

        // Debounce save by 500ms
        saveTimeoutRef.current = setTimeout(() => {
            const dataToSave = {
                mapConfig,
                layers,
                activeTileset,
                currentLayer,
                selectedTile,
                tool,
                zoom,
                showGrid,
                layerVisibility,
                savedAt: new Date().toISOString()
            };

            if (saveToLocalStorage(dataToSave)) {
                setStatus('자동 저장됨');
                setHasUnsavedChanges(false);
            } else {
                setStatus('저장 실패');
            }
        }, 500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [mapConfig, layers, activeTileset, currentLayer, selectedTile, tool, zoom, showGrid, layerVisibility, loading]);

    // Check bounds
    const isInBounds = (x, y) => x >= 0 && x < mapConfig.width && y >= 0 && y < mapConfig.height;

    // Screen to grid
    const screenToGrid = (clientX, clientY) => {
        const canvas = mapCanvasRef.current;
        if (!canvas) return { x: -1, y: -1 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((clientX - rect.left) * scaleX / mapConfig.tileSize);
        const y = Math.floor((clientY - rect.top) * scaleY / mapConfig.tileSize);
        return { x, y };
    };

    // Push current state to undo stack
    const pushHistory = useCallback(() => {
        const snapshot = JSON.parse(JSON.stringify(layers));
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > MAX_HISTORY) {
            undoStackRef.current.shift();
        }
        // Clear redo stack when new action is performed
        redoStackRef.current = [];
    }, [layers]);

    // Undo
    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) {
            setStatus('Nothing to undo');
            return;
        }
        // Save current state to redo stack
        const currentSnapshot = JSON.parse(JSON.stringify(layers));
        redoStackRef.current.push(currentSnapshot);
        // Pop and apply previous state
        const prevState = undoStackRef.current.pop();
        setLayers(prevState);
        setHasUnsavedChanges(true);
        setStatus(`Undo (${undoStackRef.current.length} left)`);
    }, [layers]);

    // Redo
    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) {
            setStatus('Nothing to redo');
            return;
        }
        // Save current state to undo stack
        const currentSnapshot = JSON.parse(JSON.stringify(layers));
        undoStackRef.current.push(currentSnapshot);
        // Pop and apply redo state
        const redoState = redoStackRef.current.pop();
        setLayers(redoState);
        setHasUnsavedChanges(true);
        setStatus(`Redo (${redoStackRef.current.length} left)`);
    }, [layers]);

    // Paint tile - supports multi-selection
    const paintTile = useCallback((gridX, gridY) => {
        if (tool === 'select') return;
        if (!isInBounds(gridX, gridY)) return;

        setLayers(prev => {
            const newLayers = { ...prev };

            // Ensure layer exists (safeguard for old maps without front layer)
            if (!newLayers[currentLayer] && currentLayer !== 'collision') {
                newLayers[currentLayer] = createEmptyLayer(mapConfig.width, mapConfig.height, -1);
            }

            if (multiSelection.length > 1) {
                // Multi-tile painting
                multiSelection.forEach(sel => {
                    const x = gridX + sel.dx;
                    const y = gridY + sel.dy;
                    if (isInBounds(x, y) && currentLayer !== 'collision') {
                        newLayers[currentLayer] = newLayers[currentLayer] === prev[currentLayer]
                            ? prev[currentLayer].map(row => [...row])
                            : newLayers[currentLayer];
                        newLayers[currentLayer][y][x] = sel.tileIndex;
                    }
                });
            } else {
                // Single tile or brush size
                for (let dy = 0; dy < brushSize; dy++) {
                    for (let dx = 0; dx < brushSize; dx++) {
                        const x = gridX + dx;
                        const y = gridY + dy;
                        if (isInBounds(x, y)) {
                            if (currentLayer === 'collision') {
                                newLayers.collision = newLayers.collision === prev.collision
                                    ? prev.collision.map(row => [...row])
                                    : newLayers.collision;
                                newLayers.collision[y][x] = prev.collision[y][x] === 1 ? 0 : 1;
                            } else {
                                newLayers[currentLayer] = newLayers[currentLayer] === prev[currentLayer]
                                    ? prev[currentLayer].map(row => [...row])
                                    : newLayers[currentLayer];
                                newLayers[currentLayer][y][x] = selectedTile;
                            }
                        }
                    }
                }
            }
            return newLayers;
        });
        setHasUnsavedChanges(true);
    }, [currentLayer, selectedTile, multiSelection, brushSize, mapConfig.width, mapConfig.height]);

    // Erase tile
    const eraseTile = useCallback((gridX, gridY) => {
        if (!isInBounds(gridX, gridY)) return;

        setLayers(prev => {
            const newLayers = { ...prev };

            // Ensure layer exists (safeguard for old maps without front layer)
            if (!newLayers[currentLayer] && currentLayer !== 'collision') {
                newLayers[currentLayer] = createEmptyLayer(mapConfig.width, mapConfig.height, -1);
            }

            if (multiSelection.length > 1) {
                // Multi-tile erasing
                multiSelection.forEach(sel => {
                    const x = gridX + sel.dx;
                    const y = gridY + sel.dy;
                    if (isInBounds(x, y) && currentLayer !== 'collision') {
                        newLayers[currentLayer] = newLayers[currentLayer] === prev[currentLayer]
                            ? prev[currentLayer].map(row => [...row])
                            : newLayers[currentLayer];
                        newLayers[currentLayer][y][x] = -1;
                    }
                });
            } else {
                for (let dy = 0; dy < brushSize; dy++) {
                    for (let dx = 0; dx < brushSize; dx++) {
                        const x = gridX + dx;
                        const y = gridY + dy;
                        if (isInBounds(x, y)) {
                            if (currentLayer === 'collision') {
                                newLayers.collision = newLayers.collision === prev.collision
                                    ? prev.collision.map(row => [...row])
                                    : newLayers.collision;
                                newLayers.collision[y][x] = 0;
                            } else {
                                newLayers[currentLayer] = newLayers[currentLayer] === prev[currentLayer]
                                    ? prev[currentLayer].map(row => [...row])
                                    : newLayers[currentLayer];
                                newLayers[currentLayer][y][x] = -1;
                            }
                        }
                    }
                }
            }
            return newLayers;
        });
        setHasUnsavedChanges(true);
    }, [currentLayer, multiSelection, brushSize, mapConfig.width, mapConfig.height]);

    // Fill bucket
    const fillBucket = useCallback((startX, startY) => {
        if (!isInBounds(startX, startY) || currentLayer === 'collision') return;

        // Safeguard for old maps without front layer
        if (!layers[currentLayer]) return;

        const targetTile = layers[currentLayer][startY][startX];
        if (targetTile === selectedTile) return;

        setLayers(prev => {
            const newLayers = { ...prev };
            // Ensure layer exists
            if (!prev[currentLayer]) {
                newLayers[currentLayer] = createEmptyLayer(mapConfig.width, mapConfig.height, -1);
            }
            const newLayer = (prev[currentLayer] || newLayers[currentLayer]).map(row => [...row]);
            const stack = [[startX, startY]];
            const visited = new Set();

            while (stack.length > 0) {
                const [x, y] = stack.pop();
                const key = `${x},${y}`;
                if (visited.has(key) || !isInBounds(x, y) || newLayer[y][x] !== targetTile) continue;
                visited.add(key);
                newLayer[y][x] = selectedTile;
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            }

            newLayers[currentLayer] = newLayer;
            return newLayers;
        });
        setHasUnsavedChanges(true);
        setTool('select');
        setStatus('채우기 완료');
    }, [currentLayer, selectedTile, layers, mapConfig.width, mapConfig.height]);

    // Eyedropper
    const eyedropperPick = useCallback((gridX, gridY) => {
        if (!isInBounds(gridX, gridY)) return;
        const layerOrder = ['frontDecorations', 'frontFurniture', 'decorations', 'furniture', 'walls', 'floor'];
        for (const layerName of layerOrder) {
            const tile = layers[layerName]?.[gridY]?.[gridX];
            if (tile >= 0) {
                setSelectedTile(tile);
                setMultiSelection([]);
                // Switch to correct tileset tab
                const ts = getTilesetForIndex(tile);
                if (ts) {
                    const tsIndex = TILESETS.findIndex(t => t.id === ts.id);
                    if (tsIndex >= 0) setActiveTileset(tsIndex);
                }
                setStatus(`Picked tile #${tile} from ${layerName}`);
                return;
            }
        }
    }, [layers, mapConfig.width, mapConfig.height]);

    // Apply fill/erase to map selection
    const applyToSelection = useCallback((action) => {
        if (!mapSelection) return;

        // Save history before applying
        pushHistory();

        const minX = Math.min(mapSelection.startX, mapSelection.endX);
        const maxX = Math.max(mapSelection.startX, mapSelection.endX);
        const minY = Math.min(mapSelection.startY, mapSelection.endY);
        const maxY = Math.max(mapSelection.startY, mapSelection.endY);

        setLayers(prev => {
            const newLayers = { ...prev };
            // Ensure layer exists (safeguard for old maps without front layer)
            if (!prev[currentLayer] && currentLayer !== 'collision') {
                newLayers[currentLayer] = createEmptyLayer(mapConfig.width, mapConfig.height, -1);
            }
            const newLayer = (prev[currentLayer] || newLayers[currentLayer]).map(row => [...row]);

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (isInBounds(x, y)) {
                        if (action === 'fill') {
                            if (currentLayer === 'collision') {
                                newLayer[y][x] = 1;
                            } else {
                                newLayer[y][x] = selectedTile;
                            }
                        } else if (action === 'erase') {
                            if (currentLayer === 'collision') {
                                newLayer[y][x] = 0;
                            } else {
                                newLayer[y][x] = -1;
                            }
                        }
                    }
                }
            }

            newLayers[currentLayer] = newLayer;
            return newLayers;
        });

        setHasUnsavedChanges(true);
        setMapSelection(null);
        setTool('select');
        setStatus(action === 'fill' ? '선택 영역 채우기 완료' : '선택 영역 지우기 완료');
    }, [mapSelection, currentLayer, selectedTile, mapConfig.width, mapConfig.height, pushHistory]);

    // Apply tool
    const applyTool = useCallback((gridX, gridY) => {
        // 선택 영역이 있으면 해당 영역에 적용
        if (mapSelection) {
            switch (tool) {
                case 'fill': applyToSelection('fill'); return;
                case 'eraser': applyToSelection('erase'); return;
            }
        }

        switch (tool) {
            case 'brush': paintTile(gridX, gridY); break;
            case 'eraser': eraseTile(gridX, gridY); break;
            case 'fill': fillBucket(gridX, gridY); break;
            case 'eyedropper': eyedropperPick(gridX, gridY); break;
        }
    }, [tool, paintTile, eraseTile, fillBucket, eyedropperPick, mapSelection, applyToSelection]);

    // Mouse handlers for map
    const handleMapMouseDown = (e) => {
        if (e.button === 0) {
            const { x, y } = screenToGrid(e.clientX, e.clientY);

            if (tool === 'select') {
                // Start map selection
                isSelectingMapRef.current = true;
                mapSelectionStartRef.current = { x, y };
                setMapSelection({ startX: x, startY: y, endX: x, endY: y });
            } else {
                // Save history before drawing starts
                pushHistory();
                isMouseDownRef.current = true;
                lastPaintPosRef.current = { x, y };
                applyTool(x, y);
            }
        }
    };

    const handleMapMouseMove = (e) => {
        const { x, y } = screenToGrid(e.clientX, e.clientY);
        if (isInBounds(x, y)) {
            setCursorPos({ x, y });
        }

        if (isSelectingMapRef.current && tool === 'select') {
            // Update selection area
            setMapSelection(prev => prev ? {
                ...prev,
                endX: x,
                endY: y
            } : null);
        } else if (isMouseDownRef.current && tool !== 'fill' && tool !== 'select') {
            if (x !== lastPaintPosRef.current.x || y !== lastPaintPosRef.current.y) {
                lastPaintPosRef.current = { x, y };
                applyTool(x, y);
            }
        }
    };

    const handleMapMouseUp = () => {
        if (isSelectingMapRef.current) {
            isSelectingMapRef.current = false;
            // Normalize selection bounds
            if (mapSelection) {
                const minX = Math.min(mapSelection.startX, mapSelection.endX);
                const maxX = Math.max(mapSelection.startX, mapSelection.endX);
                const minY = Math.min(mapSelection.startY, mapSelection.endY);
                const maxY = Math.max(mapSelection.startY, mapSelection.endY);
                setMapSelection({ startX: minX, startY: minY, endX: maxX, endY: maxY });
                const count = (maxX - minX + 1) * (maxY - minY + 1);
                setStatus(`${count}개 타일 선택됨`);
            }
        }
        isMouseDownRef.current = false;
        lastPaintPosRef.current = { x: -1, y: -1 };
    };

    // Get palette cell from mouse position
    const getPaletteCell = (clientX, clientY) => {
        const canvas = paletteCanvasRef.current;
        if (!canvas) return { col: -1, row: -1 };
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const ts = TILESETS[activeTileset];
        const col = Math.floor(x / ts.tileSize);
        const row = Math.floor(y / ts.tileSize);
        return { col, row };
    };

    // Palette mouse down - start selection
    const handlePaletteMouseDown = (e) => {
        const { col, row } = getPaletteCell(e.clientX, e.clientY);
        const ts = TILESETS[activeTileset];
        const localIndex = row * PALETTE_COLUMNS + col;

        if (localIndex < 0 || localIndex >= ts.totalTiles) return;

        const globalIndex = localIndex + ts.offset;

        if (e.metaKey || e.ctrlKey) {
            // Cmd/Ctrl+Click: Toggle tile in multi-selection
            setMultiSelection(prev => {
                const existing = prev.find(s => s.tileIndex === globalIndex);
                if (existing) {
                    // Remove from selection
                    const newSel = prev.filter(s => s.tileIndex !== globalIndex);
                    if (newSel.length === 0) {
                        setSelectedTile(globalIndex);
                        return [];
                    }
                    // Recalculate relative positions
                    const minDx = Math.min(...newSel.map(s => s.dx));
                    const minDy = Math.min(...newSel.map(s => s.dy));
                    return newSel.map(s => ({ ...s, dx: s.dx - minDx, dy: s.dy - minDy }));
                } else {
                    // Add to selection
                    if (prev.length === 0) {
                        // Start multi-selection from current selectedTile
                        const currentTs = getTilesetForIndex(selectedTile);
                        if (currentTs && currentTs.id === ts.id) {
                            const currentLocal = selectedTile - ts.offset;
                            const currentCol = currentLocal % PALETTE_COLUMNS;
                            const currentRow = Math.floor(currentLocal / PALETTE_COLUMNS);
                            const newCol = col;
                            const newRow = row;
                            const minCol = Math.min(currentCol, newCol);
                            const minRow = Math.min(currentRow, newRow);
                            return [
                                { tileIndex: selectedTile, dx: currentCol - minCol, dy: currentRow - minRow },
                                { tileIndex: globalIndex, dx: newCol - minCol, dy: newRow - minRow }
                            ];
                        }
                    }
                    // Calculate dx, dy relative to existing selection
                    const existingCols = prev.map(s => {
                        const local = s.tileIndex - ts.offset;
                        return local % PALETTE_COLUMNS;
                    });
                    const existingRows = prev.map(s => {
                        const local = s.tileIndex - ts.offset;
                        return Math.floor(local / PALETTE_COLUMNS);
                    });
                    const minCol = Math.min(...existingCols, col);
                    const minRow = Math.min(...existingRows, row);

                    const newSelection = prev.map(s => {
                        const local = s.tileIndex - ts.offset;
                        const sCol = local % PALETTE_COLUMNS;
                        const sRow = Math.floor(local / PALETTE_COLUMNS);
                        return { tileIndex: s.tileIndex, dx: sCol - minCol, dy: sRow - minRow };
                    });
                    newSelection.push({ tileIndex: globalIndex, dx: col - minCol, dy: row - minRow });
                    return newSelection;
                }
            });
            setSelectedTile(globalIndex);
        } else {
            // Regular click or drag start
            isPaletteSelectingRef.current = true;
            paletteSelectionStartRef.current = { col, row };
            setPaletteSelectionEnd({ col, row });
            setSelectedTile(globalIndex);
            setMultiSelection([]);
        }
    };

    // Palette mouse move - update selection
    const handlePaletteMouseMove = (e) => {
        if (!isPaletteSelectingRef.current) return;

        const { col, row } = getPaletteCell(e.clientX, e.clientY);
        const ts = TILESETS[activeTileset];
        const maxRow = Math.ceil(ts.totalTiles / PALETTE_COLUMNS) - 1;

        // Clamp to valid range
        const clampedCol = Math.max(0, Math.min(PALETTE_COLUMNS - 1, col));
        const clampedRow = Math.max(0, Math.min(maxRow, row));

        setPaletteSelectionEnd({ col: clampedCol, row: clampedRow });
    };

    // Palette mouse up - finalize selection
    const handlePaletteMouseUp = () => {
        if (!isPaletteSelectingRef.current) return;

        isPaletteSelectingRef.current = false;
        const bounds = getSelectionBounds();

        if (bounds) {
            const ts = TILESETS[activeTileset];
            const selections = [];

            for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
                for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
                    const localIndex = row * PALETTE_COLUMNS + col;
                    if (localIndex >= 0 && localIndex < ts.totalTiles) {
                        selections.push({
                            tileIndex: localIndex + ts.offset,
                            dx: col - bounds.minCol,
                            dy: row - bounds.minRow
                        });
                    }
                }
            }

            if (selections.length > 1) {
                setMultiSelection(selections);
                setStatus(`Selected ${selections.length} tiles`);
            } else if (selections.length === 1) {
                setSelectedTile(selections[0].tileIndex);
                setMultiSelection([]);
                setStatus(`Selected tile #${selections[0].tileIndex}`);
            }
        }

        paletteSelectionStartRef.current = { col: -1, row: -1 };
        setPaletteSelectionEnd({ col: -1, row: -1 });
    };

    // Palette mouse leave
    const handlePaletteMouseLeave = () => {
        if (isPaletteSelectingRef.current) {
            handlePaletteMouseUp();
        }
    };

    // Keyboard shortcuts (uses e.code for language-independent detection)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return;

            // Use e.code for letter keys (works regardless of input language)
            switch (e.code) {
                case 'KeyV':
                    setTool('select');
                    setStatus('Tool: Select (V)');
                    return;
                case 'KeyB':
                    setMapSelection(null);
                    setTool('brush');
                    setStatus('Tool: Brush (B)');
                    return;
                case 'KeyE':
                    if (mapSelection) {
                        applyToSelection('erase');
                    } else {
                        setTool('eraser');
                        setStatus('Tool: Eraser (E)');
                    }
                    return;
                case 'KeyG':
                    if (mapSelection) {
                        applyToSelection('fill');
                    } else {
                        setTool('fill');
                        setStatus('Tool: Fill (G)');
                    }
                    return;
                case 'KeyI':
                    setMapSelection(null);
                    setTool('eyedropper');
                    setStatus('Tool: Eyedropper (I)');
                    return;
                case 'KeyH': setShowGrid(prev => !prev); return;
                case 'KeyZ':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            redo();
                        } else {
                            undo();
                        }
                    }
                    return;
                case 'KeyY':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        redo();
                    }
                    return;
                case 'KeyS':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        downloadMapJSON();
                    }
                    return;
                case 'Digit1': setCurrentLayer('floor'); setStatus('Layer: Floor'); return;
                case 'Digit2': setCurrentLayer('walls'); setStatus('Layer: Walls'); return;
                case 'Digit3': setCurrentLayer('furniture'); setStatus('Layer: Furniture'); return;
                case 'Digit4': setCurrentLayer('decorations'); setStatus('Layer: Decorations'); return;
                case 'Digit5': setCurrentLayer('frontFurniture'); setStatus('Layer: Front Furniture (캐릭터 위)'); return;
                case 'Digit6': setCurrentLayer('frontDecorations'); setStatus('Layer: Front Decorations (가구 위)'); return;
                case 'Digit7': setCurrentLayer('collision'); setStatus('Layer: Collision'); return;
                case 'BracketLeft': setBrushSize(prev => Math.max(1, prev - 1)); return;
                case 'BracketRight': setBrushSize(prev => Math.min(3, prev + 1)); return;
                case 'Escape':
                    if (mapSelection) {
                        setMapSelection(null);
                        setStatus('선택 해제');
                    } else {
                        setTool('select');
                        setMultiSelection([]);
                        setStatus('일반 모드 (ESC)');
                    }
                    return;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mapSelection, applyToSelection, undo, redo]);

    // Export JSON
    const exportToJSON = () => {
        return JSON.stringify({
            version: '1.1',
            name: mapConfig.name,
            created: new Date().toISOString(),
            config: { width: mapConfig.width, height: mapConfig.height, tileSize: mapConfig.tileSize },
            layers: { floor: layers.floor, walls: layers.walls, furniture: layers.furniture, decorations: layers.decorations, frontFurniture: layers.frontFurniture, frontDecorations: layers.frontDecorations },
            collision: layers.collision
        }, null, 2);
    };

    // Download JSON
    const downloadMapJSON = () => {
        const json = exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapConfig.name || 'map'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setHasUnsavedChanges(false);
        setStatus('Map saved as JSON');
    };

    // Import JSON
    const importFromJSON = (jsonString) => {
        try {
            const data = JSON.parse(jsonString);
            if (!data.config || !data.layers) throw new Error('Invalid map format');

            setMapConfig({
                width: data.config.width || 20,
                height: data.config.height || 15,
                tileSize: data.config.tileSize || 32,
                name: data.name || 'untitled'
            });

            // Handle migration from old 'front' to new 'frontFurniture'/'frontDecorations'
            const frontFurniture = data.layers.frontFurniture || data.layers.front || createEmptyLayer(data.config.width, data.config.height, -1);
            const frontDecorations = data.layers.frontDecorations || createEmptyLayer(data.config.width, data.config.height, -1);

            setLayers({
                floor: data.layers.floor || createEmptyLayer(data.config.width, data.config.height, 0),
                walls: data.layers.walls || createEmptyLayer(data.config.width, data.config.height, -1),
                furniture: data.layers.furniture || createEmptyLayer(data.config.width, data.config.height, -1),
                decorations: data.layers.decorations || createEmptyLayer(data.config.width, data.config.height, -1),
                frontFurniture: frontFurniture,
                frontDecorations: frontDecorations,
                collision: data.collision || createEmptyLayer(data.config.width, data.config.height, 0)
            });

            setHasUnsavedChanges(false);
            return true;
        } catch (error) {
            setStatus('Error: Failed to load map');
            return false;
        }
    };

    // Load file
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const text = await file.text();
            if (importFromJSON(text)) {
                setStatus(`Loaded: ${file.name}`);
            }
        }
        e.target.value = '';
    };

    // New map
    const createNewMap = () => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Create new map anyway?')) return;
        setLayers(initializeLayers(mapConfig.width, mapConfig.height));
        setHasUnsavedChanges(false);
        setStatus('Created new map');
    };

    // Resize map
    const handleResize = () => {
        const newWidth = parseInt(document.getElementById('mapWidthInput').value) || 20;
        const newHeight = parseInt(document.getElementById('mapHeightInput').value) || 15;

        setLayers(prev => {
            const newLayers = {};
            Object.keys(prev).forEach(layerName => {
                const defaultValue = layerName === 'floor' ? 0 : (layerName === 'collision' ? 0 : -1);
                const newLayer = createEmptyLayer(newWidth, newHeight, defaultValue);
                for (let y = 0; y < Math.min(prev[layerName].length, newHeight); y++) {
                    for (let x = 0; x < Math.min(prev[layerName][y].length, newWidth); x++) {
                        newLayer[y][x] = prev[layerName][y][x];
                    }
                }
                newLayers[layerName] = newLayer;
            });
            return newLayers;
        });

        setMapConfig(prev => ({ ...prev, width: newWidth, height: newHeight }));
        setHasUnsavedChanges(true);
        setStatus(`Resized map to ${newWidth}x${newHeight}`);
    };

    // Toggle layer visibility
    const toggleLayerVisibility = (layer) => {
        setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
    };

    if (loading) {
        return <div className={styles.loading}>Loading tilesets...</div>;
    }

    return (
        <div className={styles.editorContainer}>
            {/* Header */}
            <header className={styles.editorHeader}>
                <div className={styles.logo}>2D Office Map Editor</div>
                <nav className={styles.menu}>
                    <button className={styles.menuBtn} onClick={createNewMap}>New</button>
                    <button className={styles.menuBtn} onClick={() => fileInputRef.current?.click()}>Open</button>
                    <button className={styles.menuBtn} onClick={downloadMapJSON}>Save JSON</button>
                    <a href="/" className={styles.backLink}>Game</a>
                </nav>
                <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileSelect} />
            </header>

            {/* Main */}
            <main className={styles.editorMain}>
                {/* Left Panel - Tileset */}
                <aside className={`${styles.panel} ${styles.panelLeft}`}>
                    <div className={styles.panelHeader}><h3>Tileset</h3></div>
                    {/* Tileset Tabs */}
                    <div className={styles.tilesetTabs}>
                        {TILESETS.map((ts, idx) => (
                            <button
                                key={ts.id}
                                className={`${styles.tilesetTab} ${activeTileset === idx ? styles.tilesetTabActive : ''}`}
                                onClick={() => { setActiveTileset(idx); setMultiSelection([]); }}
                            >
                                {ts.name}
                            </button>
                        ))}
                    </div>
                    <div className={styles.paletteContainer}>
                        <canvas
                            ref={paletteCanvasRef}
                            className={styles.paletteCanvas}
                            onMouseDown={handlePaletteMouseDown}
                            onMouseMove={handlePaletteMouseMove}
                            onMouseUp={handlePaletteMouseUp}
                            onMouseLeave={handlePaletteMouseLeave}
                        />
                    </div>
                    <div className={styles.tilePreview}>
                        <span>Selected: <strong>{multiSelection.length > 1 ? `${multiSelection.length} tiles` : selectedTile}</strong></span>
                        <canvas ref={previewCanvasRef} className={styles.previewCanvas} width={64} height={64} />
                    </div>
                </aside>

                {/* Center - Map Canvas */}
                <section className={`${styles.panel} ${styles.panelCenter}`}>
                    <div className={styles.canvasWrapper}>
                        <div className={styles.canvasContainer}>
                            <canvas
                                ref={mapCanvasRef}
                                className={styles.mapCanvas}
                                onMouseDown={handleMapMouseDown}
                                onMouseMove={handleMapMouseMove}
                                onMouseUp={handleMapMouseUp}
                                onMouseLeave={handleMapMouseUp}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    width: mapConfig.width * mapConfig.tileSize * zoom,
                                    height: mapConfig.height * mapConfig.tileSize * zoom,
                                    cursor: CURSORS[tool] || 'crosshair'
                                }}
                            />
                        </div>
                    </div>
                    <div className={styles.canvasControls}>
                        <button className={styles.controlBtn} onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>-</button>
                        <span>{Math.round(zoom * 100)}%</span>
                        <button className={styles.controlBtn} onClick={() => setZoom(z => Math.min(2, z + 0.25))}>+</button>
                        <label className={styles.controlLabel}>
                            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Grid
                        </label>
                        <label className={styles.controlLabel}>
                            <input type="checkbox" checked={showCollision} onChange={(e) => setShowCollision(e.target.checked)} /> Collision
                        </label>
                        <span className={styles.cursorPosition}>Position: ({cursorPos.x}, {cursorPos.y})</span>
                    </div>
                </section>

                {/* Right Panel - Tools */}
                <aside className={`${styles.panel} ${styles.panelRight}`}>
                    {/* Tools */}
                    <div className={styles.section}>
                        <h3>Tools</h3>
                        <div className={styles.toolButtons}>
                            {['select', 'brush', 'eraser', 'fill', 'eyedropper'].map(t => (
                                <button key={t} className={`${styles.toolBtn} ${tool === t ? styles.toolBtnActive : ''}`} onClick={() => { setTool(t); setStatus(`Tool: ${t}`); }}>
                                    {t === 'select' ? 'Select' : t === 'brush' ? 'Brush' : t === 'eraser' ? 'Eraser' : t === 'fill' ? 'Fill' : 'Pick'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Brush Size */}
                    <div className={styles.section}>
                        <h3>Brush Size</h3>
                        <div className={styles.brushSizes}>
                            {[1, 2, 3].map(s => (
                                <button key={s} className={`${styles.brushBtn} ${brushSize === s ? styles.brushBtnActive : ''}`} onClick={() => setBrushSize(s)}>
                                    {s}x{s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Layers */}
                    <div className={styles.section}>
                        <h3>Layers</h3>
                        <ul className={styles.layerList}>
                            {[['frontDecorations', '6. Front Deco (가구 위)'], ['frontFurniture', '5. Front Furniture (캐릭터 위)'], ['decorations', '4. Decorations'], ['furniture', '3. Furniture'], ['walls', '2. Walls'], ['floor', '1. Floor']].map(([layer, name]) => (
                                <li key={layer} className={`${styles.layerItem} ${currentLayer === layer ? styles.layerItemActive : ''}`} onClick={() => setCurrentLayer(layer)}>
                                    <input type="checkbox" className={styles.layerVisibility} checked={layerVisibility[layer]} onChange={() => toggleLayerVisibility(layer)} onClick={(e) => e.stopPropagation()} />
                                    <span className={styles.layerName}>{name}</span>
                                </li>
                            ))}
                            <li className={`${styles.layerItem} ${styles.layerCollision} ${currentLayer === 'collision' ? styles.layerItemActive : ''}`} onClick={() => setCurrentLayer('collision')}>
                                <input type="checkbox" className={styles.layerVisibility} checked={layerVisibility.collision} onChange={() => toggleLayerVisibility('collision')} onClick={(e) => e.stopPropagation()} />
                                <span className={styles.layerName}>Collision</span>
                            </li>
                        </ul>
                    </div>

                    {/* Map Size */}
                    <div className={styles.section}>
                        <h3>Map Size</h3>
                        <div className={styles.settingRow}>
                            <label>Width:</label>
                            <input id="mapWidthInput" type="number" className={styles.settingInput} defaultValue={mapConfig.width} min={5} max={100} />
                        </div>
                        <div className={styles.settingRow}>
                            <label>Height:</label>
                            <input id="mapHeightInput" type="number" className={styles.settingInput} defaultValue={mapConfig.height} min={5} max={100} />
                        </div>
                        <button className={styles.btnFull} onClick={handleResize}>Resize Map</button>
                    </div>

                    {/* Selection Info */}
                    {multiSelection.length > 1 && (
                        <div className={styles.section}>
                            <h3>Selection</h3>
                            <p style={{ fontSize: '12px', margin: '0 0 8px 0' }}>
                                {multiSelection.length} tiles selected
                            </p>
                            <button className={styles.btnFull} onClick={() => { setMultiSelection([]); setStatus('Selection cleared'); }}>
                                Clear (ESC)
                            </button>
                        </div>
                    )}
                </aside>
            </main>

            {/* Footer */}
            <footer className={styles.editorFooter}>
                <span>{status}</span>
                <span>Map: {mapConfig.width}x{mapConfig.height}</span>
                {hasUnsavedChanges && <span className={styles.unsavedIndicator}>* Unsaved</span>}
            </footer>
        </div>
    );
}
