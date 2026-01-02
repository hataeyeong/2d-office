/**
 * 타일셋 설정 (맵 에디터와 동일)
 */
const TILESETS = [
    {
        id: 'room_builder',
        imagePath: '/tileset/Room_Builder_Office_32x32.png',
        tileSize: 32,
        tilesPerRow: 16,
        totalTiles: 224,
        offset: 0
    },
    {
        id: 'modern_office',
        imagePath: '/tileset/Modern_Office_32x32.png',
        tileSize: 32,
        tilesPerRow: 16,
        totalTiles: 848,
        offset: 1000
    }
];

/**
 * MultiTilesetManager - 다중 타일셋 지원
 */
export class MultiTilesetManager {
    constructor(tileSize) {
        this.tileSize = tileSize;
        this.tilesets = TILESETS.map(ts => ({
            ...ts,
            image: null,
            loaded: false
        }));
        this.loaded = false;
    }

    /**
     * 모든 타일셋 로드
     */
    async loadAll() {
        const loadPromises = this.tilesets.map((ts, index) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.tilesets[index].image = img;
                    this.tilesets[index].loaded = true;
                    console.log(`Tileset loaded: ${ts.id} (${ts.imagePath})`);
                    resolve();
                };
                img.onerror = (err) => {
                    console.error(`Failed to load tileset ${ts.id}:`, err);
                    reject(err);
                };
                img.src = ts.imagePath;
            });
        });

        await Promise.all(loadPromises);
        this.loaded = true;
        console.log('All tilesets loaded');
        return this;
    }

    /**
     * 글로벌 인덱스로 해당 타일셋 찾기
     */
    getTilesetForIndex(globalIndex) {
        for (const ts of this.tilesets) {
            if (globalIndex >= ts.offset && globalIndex < ts.offset + ts.totalTiles) {
                return {
                    tileset: ts,
                    localIndex: globalIndex - ts.offset
                };
            }
        }
        return null;
    }

    /**
     * 글로벌 인덱스로 타일 그리기
     */
    drawTile(ctx, globalIndex, destX, destY) {
        if (globalIndex < 0 || !this.loaded) return;

        const result = this.getTilesetForIndex(globalIndex);
        if (!result || !result.tileset.image) return;

        const { tileset, localIndex } = result;
        const srcX = (localIndex % tileset.tilesPerRow) * tileset.tileSize;
        const srcY = Math.floor(localIndex / tileset.tilesPerRow) * tileset.tileSize;

        ctx.drawImage(
            tileset.image,
            srcX, srcY, tileset.tileSize, tileset.tileSize,
            destX, destY, this.tileSize, this.tileSize
        );
    }

    /**
     * 글로벌 인덱스로 타일 좌표 계산
     */
    getTileCoords(globalIndex) {
        const result = this.getTilesetForIndex(globalIndex);
        if (!result) return { x: 0, y: 0 };

        const { tileset, localIndex } = result;
        return {
            x: (localIndex % tileset.tilesPerRow) * tileset.tileSize,
            y: Math.floor(localIndex / tileset.tilesPerRow) * tileset.tileSize
        };
    }
}

/**
 * TilesetManager - 단일 타일셋 이미지 로딩 및 타일 렌더링 관리 (레거시)
 */
export class TilesetManager {
    constructor(imagePath, tileSize, tilesPerRow) {
        this.imagePath = imagePath;
        this.tileSize = tileSize;
        this.tilesPerRow = tilesPerRow;
        this.image = null;
        this.loaded = false;
    }

    /**
     * 타일셋 이미지 로드
     * @returns {Promise<TilesetManager>}
     */
    load() {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.loaded = true;
                console.log(`Tileset loaded: ${this.imagePath}`);
                console.log(`Image size: ${img.width}x${img.height}`);
                console.log(`Tiles per row: ${this.tilesPerRow}`);
                resolve(this);
            };
            img.onerror = (err) => {
                console.error('Failed to load tileset:', err);
                reject(err);
            };
            img.src = this.imagePath;
        });
    }

    /**
     * 특정 타일을 캔버스에 그리기
     * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
     * @param {number} tileIndex - 타일 인덱스 (0부터 시작)
     * @param {number} destX - 목적지 X 좌표
     * @param {number} destY - 목적지 Y 좌표
     */
    drawTile(ctx, tileIndex, destX, destY) {
        if (tileIndex < 0 || !this.loaded || !this.image) return;

        const srcX = (tileIndex % this.tilesPerRow) * this.tileSize;
        const srcY = Math.floor(tileIndex / this.tilesPerRow) * this.tileSize;

        ctx.drawImage(
            this.image,
            srcX, srcY, this.tileSize, this.tileSize,
            destX, destY, this.tileSize, this.tileSize
        );
    }

    /**
     * 타일 인덱스로부터 소스 좌표 계산
     * @param {number} tileIndex
     * @returns {{x: number, y: number}}
     */
    getTileCoords(tileIndex) {
        return {
            x: (tileIndex % this.tilesPerRow) * this.tileSize,
            y: Math.floor(tileIndex / this.tilesPerRow) * this.tileSize
        };
    }
}
