/**
 * MapRenderer - 맵 레이어 렌더링 담당
 */
export class MapRenderer {
    constructor(ctx, tileset, mapConfig) {
        this.ctx = ctx;
        this.tileset = tileset;
        this.mapConfig = mapConfig;

        // 추출된 Y-sortable 오브젝트 캐시
        this.ySortableObjects = [];
    }

    /**
     * ySorted 레이어에서 Y-sortable 타일 추출
     * 각 타일은 개별 sortY를 가짐
     * - 뒷면 의자: 상단 기준 (캐릭터가 앞에 보이도록)
     * - 기타 타일: 하단 기준 (기본)
     * 맵 로드 시 한 번 호출
     */
    extractYSortableObjects(mapData) {
        this.ySortableObjects = [];
        const tileSize = this.mapConfig.tileSize;
        const ySortedLayer = mapData.ySorted;

        if (!ySortedLayer || ySortedLayer.length === 0) {
            return;
        }

        // 뒷면 의자 타일: 헤드는 의자 하단 기준, 몸체는 상단 기준
        const backChairHeadTiles = new Set([1129, 1161]);  // 의자 헤드 (등받이)
        const backChairBodyTiles = new Set([1145, 1177]);  // 의자 몸체 (좌석)

        const height = ySortedLayer.length;
        const width = ySortedLayer[0]?.length || 0;

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const tileIndex = ySortedLayer[row][col];
                if (tileIndex < 0) continue;

                let sortY;
                if (backChairHeadTiles.has(tileIndex)) {
                    // 의자 헤드: 의자 전체 하단 기준 (캐릭터가 의자에 있으면 헤드가 앞에)
                    sortY = (row + 2) * tileSize;  // 의자 몸체 아래 = row+2
                } else if (backChairBodyTiles.has(tileIndex)) {
                    // 의자 몸체: row 6 캐릭터(208)보다 크고, row 7 캐릭터(240)보다 작게
                    sortY = (row + 1) * tileSize;  // row 6: 224
                } else {
                    // 기타 타일: 하단 기준 (기본)
                    sortY = (row + 1) * tileSize;
                }

                this.ySortableObjects.push({
                    type: 'tile',
                    tileIndex,
                    x: col * tileSize,
                    y: row * tileSize,
                    sortY
                });
            }
        }
    }

    /**
     * Y-sortable 오브젝트 목록 반환
     */
    getYSortableObjects() {
        return this.ySortableObjects;
    }

    /**
     * 단일 Y-sortable 타일 렌더링
     */
    renderYSortableTile(tileObj) {
        this.tileset.drawTile(this.ctx, tileObj.tileIndex, tileObj.x, tileObj.y);
    }

    /**
     * 단일 레이어 렌더링
     * @param {number[][]} layer - 2D 타일 인덱스 배열
     */
    renderLayer(layer) {
        const tileSize = this.mapConfig.tileSize;

        for (let y = 0; y < layer.length; y++) {
            for (let x = 0; x < layer[y].length; x++) {
                const tileIndex = layer[y][x];
                if (tileIndex >= 0) {
                    this.tileset.drawTile(
                        this.ctx,
                        tileIndex,
                        x * tileSize,
                        y * tileSize
                    );
                }
            }
        }
    }

    /**
     * 베이스 레이어 렌더링 (캐릭터 아래)
     * floor → walls → furniture → decorations 순서로 렌더링
     * ySorted 레이어는 Game.js에서 캐릭터와 함께 Y-sorting 처리
     * @param {Object} mapData - 레이어 데이터 객체
     */
    renderBaseLayers(mapData) {
        if (mapData.floor) this.renderLayer(mapData.floor);
        if (mapData.walls) this.renderLayer(mapData.walls);
        if (mapData.furniture) this.renderLayer(mapData.furniture);
        if (mapData.decorations) this.renderLayer(mapData.decorations);
    }

    /**
     * Front 레이어들 렌더링 (캐릭터 위)
     * frontFurniture → frontDecorations 순서로 렌더링
     * @param {Object} mapData - 레이어 데이터 객체
     */
    renderFrontLayers(mapData) {
        if (mapData.frontFurniture) this.renderLayer(mapData.frontFurniture);
        if (mapData.frontDecorations) this.renderLayer(mapData.frontDecorations);
        // 이전 버전 호환성 (단일 front 레이어)
        if (mapData.front) this.renderLayer(mapData.front);
    }

    /**
     * 전체 맵 렌더링 (모든 레이어)
     * @param {Object} mapData - 레이어 데이터 객체
     */
    render(mapData) {
        const { width, height, tileSize } = this.mapConfig;

        // 캔버스 클리어
        this.ctx.clearRect(0, 0, width * tileSize, height * tileSize);

        // 베이스 레이어 렌더링
        this.renderBaseLayers(mapData);

        // Front 레이어도 함께 렌더링 (캐릭터 없이 전체 렌더링 시)
        this.renderFrontLayers(mapData);
    }
}
