/**
 * TilesetManager - 타일셋 이미지 로딩 및 타일 렌더링 관리
 */
class TilesetManager {
    constructor(imagePath, tileSize, tilesPerRow) {
        this.imagePath = imagePath;
        this.tileSize = tileSize;
        this.tilesPerRow = tilesPerRow;
        this.image = new Image();
        this.loaded = false;
    }

    /**
     * 타일셋 이미지 로드
     * @returns {Promise<TilesetManager>}
     */
    load() {
        return new Promise((resolve, reject) => {
            this.image.onload = () => {
                this.loaded = true;
                console.log(`Tileset loaded: ${this.imagePath}`);
                console.log(`Image size: ${this.image.width}x${this.image.height}`);
                console.log(`Tiles per row: ${this.tilesPerRow}`);
                resolve(this);
            };
            this.image.onerror = (err) => {
                console.error('Failed to load tileset:', err);
                reject(err);
            };
            this.image.src = this.imagePath;
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
        if (tileIndex < 0 || !this.loaded) return;

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
