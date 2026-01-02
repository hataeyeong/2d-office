/**
 * MapRenderer - 맵 레이어 렌더링 담당
 */
export class MapRenderer {
    constructor(ctx, tileset, mapConfig) {
        this.ctx = ctx;
        this.tileset = tileset;
        this.mapConfig = mapConfig;
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
