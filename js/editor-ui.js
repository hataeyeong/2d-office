/**
 * 2D Office Map Editor - UI Management
 */

/**
 * Update tool button UI
 */
function updateToolUI() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === EditorState.tool) {
            btn.classList.add('active');
        }
    });
}

/**
 * Update brush size button UI
 */
function updateBrushUI() {
    document.querySelectorAll('.brush-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.size) === EditorState.brushSize) {
            btn.classList.add('active');
        }
    });
}

/**
 * Update layer selection UI
 */
function updateLayerUI() {
    document.querySelectorAll('.layer-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.layer === EditorState.currentLayer) {
            item.classList.add('active');
        }
    });
}

/**
 * Update status bar text
 */
function updateStatus(message) {
    document.getElementById('statusText').textContent = message;
}

/**
 * Update map info display
 */
function updateMapInfo() {
    document.getElementById('mapInfo').textContent =
        `Map: ${EditorState.map.width}x${EditorState.map.height}`;
    document.getElementById('mapWidth').value = EditorState.map.width;
    document.getElementById('mapHeight').value = EditorState.map.height;
}

/**
 * Update unsaved changes indicator
 */
function updateUnsavedIndicator() {
    const indicator = document.getElementById('unsavedIndicator');
    if (EditorState.hasUnsavedChanges) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

/**
 * Update zoom display
 */
function updateZoomDisplay() {
    document.getElementById('zoomLevel').textContent =
        `${Math.round(EditorState.zoom * 100)}%`;
}

/**
 * Initialize UI event bindings
 */
function initUI() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectTool(btn.dataset.tool);
        });
    });

    // Brush size buttons
    document.querySelectorAll('.brush-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            EditorState.brushSize = parseInt(btn.dataset.size);
            updateBrushUI();
        });
    });

    // Layer items - click to select
    document.querySelectorAll('.layer-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                selectLayer(item.dataset.layer);
            }
        });
    });

    // Layer visibility checkboxes
    document.querySelectorAll('.layer-visibility').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const layer = checkbox.dataset.layer;
            EditorState.layerVisibility[layer] = checkbox.checked;
            render();
        });
    });

    // Grid toggle
    document.getElementById('showGrid').addEventListener('change', (e) => {
        EditorState.showGrid = e.target.checked;
        render();
    });

    // Collision visibility
    document.getElementById('showCollision').addEventListener('change', (e) => {
        EditorState.showCollision = e.target.checked;
        render();
    });

    // Zoom buttons
    document.getElementById('btnZoomIn').addEventListener('click', () => {
        EditorState.zoom = Math.min(2.0, EditorState.zoom + 0.25);
        applyZoom();
    });

    document.getElementById('btnZoomOut').addEventListener('click', () => {
        EditorState.zoom = Math.max(0.5, EditorState.zoom - 0.25);
        applyZoom();
    });

    // File menu buttons
    document.getElementById('btnNew').addEventListener('click', createNewMap);
    document.getElementById('btnOpen').addEventListener('click', triggerFileOpen);
    document.getElementById('btnSave').addEventListener('click', downloadMapJSON);
    document.getElementById('btnExportJS').addEventListener('click', downloadMapJS);

    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

    // Resize button
    document.getElementById('btnResize').addEventListener('click', resizeMap);

    // Initialize UI state
    updateToolUI();
    updateBrushUI();
    updateLayerUI();
}

/**
 * Apply zoom to canvas
 */
function applyZoom() {
    const { width, height, tileSize } = EditorState.map;
    const scaledSize = tileSize * EditorState.zoom;

    mapCanvas.style.width = `${width * scaledSize}px`;
    mapCanvas.style.height = `${height * scaledSize}px`;

    updateZoomDisplay();
}

/**
 * Trigger file open dialog
 */
function triggerFileOpen() {
    document.getElementById('fileInput').click();
}

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadMapFromFile(file);
    }
    // Reset input for same file selection
    event.target.value = '';
}

// Initialize UI when editor initializes
document.addEventListener('DOMContentLoaded', initUI);
