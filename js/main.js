/**
 * 메인 진입점 - 캔버스 초기화 및 렌더링
 */

// 기본 설정
const TILESET_CONFIG = {
    tilesetPath: './Modern_Office_Revamped_v1.2/Modern_Office_32x32.png',
    tilesPerRow: 16
};

/**
 * JSON 파일에서 맵 데이터 로드
 */
async function loadMapFromJSON(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load map: ${response.status}`);
    }
    return await response.json();
}

/**
 * 애플리케이션 초기화
 */
async function init() {
    console.log('2D Virtual Office 초기화 중...');

    // 캔버스 설정
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 임시 로딩 화면
    canvas.width = 640;
    canvas.height = 480;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);

    try {
        // JSON 맵 파일 로드
        console.log('맵 파일 로드 중...');
        const mapData = await loadMapFromJSON('./map/office1.json');
        console.log('맵 파일 로드 완료!', mapData.name || 'untitled');

        // 맵 설정 적용
        const mapConfig = mapData.config;
        canvas.width = mapConfig.width * mapConfig.tileSize;
        canvas.height = mapConfig.height * mapConfig.tileSize;
        ctx.imageSmoothingEnabled = false;

        // 타일셋 로드
        const tileset = new TilesetManager(
            TILESET_CONFIG.tilesetPath,
            mapConfig.tileSize,
            TILESET_CONFIG.tilesPerRow
        );
        await tileset.load();
        console.log('타일셋 로드 완료!');

        // 렌더링용 맵 데이터 구성
        const mapLayers = {
            floor: mapData.layers.floor,
            walls: mapData.layers.walls,
            furniture: mapData.layers.furniture,
            decorations: mapData.layers.decorations,
            collision: mapData.collision
        };

        // 렌더러 생성 및 맵 렌더링
        const renderer = new MapRenderer(ctx, tileset, mapConfig);
        renderer.render(mapLayers);

        console.log('사무실 맵 렌더링 완료!');

    } catch (error) {
        console.error('초기화 실패:', error);
        ctx.fillStyle = '#f00';
        ctx.fillText('Failed to load: ' + error.message, canvas.width / 2, canvas.height / 2 + 20);
    }
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', init);
