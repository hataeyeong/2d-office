/**
 * CollisionManager - 충돌 감지
 * 맵의 collision 레이어를 사용하여 타일 기반 충돌 체크
 */
export class CollisionManager {
    constructor(collisionLayer, mapConfig) {
        this.collisionLayer = collisionLayer; // 2D 배열 (1 = 충돌, 0 = 통과)
        this.tileSize = mapConfig.tileSize;
        this.mapWidth = mapConfig.width;
        this.mapHeight = mapConfig.height;
    }

    /**
     * 특정 타일이 충돌 타일인지 확인
     * @param {number} tileX - 타일 X 좌표
     * @param {number} tileY - 타일 Y 좌표
     * @returns {boolean}
     */
    isTileBlocked(tileX, tileY) {
        // 맵 범위 체크
        if (tileX < 0 || tileX >= this.mapWidth ||
            tileY < 0 || tileY >= this.mapHeight) {
            return true; // 맵 밖은 충돌
        }

        return this.collisionLayer[tileY][tileX] === 1;
    }

    /**
     * 캐릭터가 특정 위치에서 충돌하는지 체크
     * @param {number} x - 캐릭터 X 위치
     * @param {number} y - 캐릭터 Y 위치
     * @param {Character} character - 캐릭터 객체
     * @returns {boolean} 충돌 여부
     */
    checkCollision(x, y, character) {
        const box = character.collisionBox;

        // 충돌 박스의 네 모서리 좌표
        const left = x + box.offsetX;
        const right = left + box.width - 1;
        const top = y + box.offsetY;
        const bottom = top + box.height - 1;

        // 각 모서리가 충돌 타일에 있는지 확인
        const corners = [
            { x: left, y: top },
            { x: right, y: top },
            { x: left, y: bottom },
            { x: right, y: bottom }
        ];

        for (const corner of corners) {
            const tileX = Math.floor(corner.x / this.tileSize);
            const tileY = Math.floor(corner.y / this.tileSize);

            if (this.isTileBlocked(tileX, tileY)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 두 충돌 박스가 겹치는지 확인 (캐릭터 간 충돌)
     */
    boxIntersects(box1, box2) {
        return !(
            box1.x + box1.width <= box2.x ||
            box2.x + box2.width <= box1.x ||
            box1.y + box1.height <= box2.y ||
            box2.y + box2.height <= box1.y
        );
    }

    /**
     * 경로에 충돌이 있는지 확인 (직선 이동)
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @param {Character} character
     * @returns {boolean}
     */
    checkPathCollision(startX, startY, endX, endY, character) {
        const steps = Math.max(
            Math.abs(endX - startX),
            Math.abs(endY - startY)
        );

        if (steps === 0) return this.checkCollision(endX, endY, character);

        const dx = (endX - startX) / steps;
        const dy = (endY - startY) / steps;

        for (let i = 0; i <= steps; i++) {
            const x = startX + dx * i;
            const y = startY + dy * i;

            if (this.checkCollision(x, y, character)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 맵 경계 내에서 위치 제한
     */
    clampToMap(x, y, character) {
        const box = character.collisionBox;
        const minX = -box.offsetX;
        const minY = -box.offsetY;
        const maxX = (this.mapWidth * this.tileSize) - box.offsetX - box.width;
        const maxY = (this.mapHeight * this.tileSize) - box.offsetY - box.height;

        return {
            x: Math.max(minX, Math.min(maxX, x)),
            y: Math.max(minY, Math.min(maxY, y))
        };
    }

    /**
     * 충돌 레이어 디버그 렌더링
     */
    renderDebug(ctx) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.collisionLayer[y][x] === 1) {
                    ctx.fillRect(
                        x * this.tileSize,
                        y * this.tileSize,
                        this.tileSize,
                        this.tileSize
                    );
                }
            }
        }
    }
}
