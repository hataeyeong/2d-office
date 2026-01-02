/**
 * NPCController - NPC AI 컨트롤러
 * NPC의 자동 이동, 행동 관리
 */

// NPC 상태
export const NPC_STATE = {
    IDLE: 'idle',
    WALKING: 'walking',
    WORKING: 'working',
    SITTING: 'sitting',
    PHONE: 'phone'
};

export class NPCController {
    constructor(character, collisionCheck) {
        this.character = character;
        this.collisionCheck = collisionCheck;

        // AI 상태
        this.state = NPC_STATE.IDLE;
        this.stateTimer = 0;
        this.stateDuration = 0;

        // 타일 이동 설정
        this.tileSize = 32;
        this.tileMoveSpeed = 2;

        // 타일 이동 상태
        this.isMovingToTile = false;
        this.nextTileX = null;
        this.nextTileY = null;

        // 최종 목표 타일 좌표
        this.targetTileX = null;
        this.targetTileY = null;

        // 이동 관련 (레거시 - 사용 안함)
        this.targetX = null;
        this.targetY = null;
        this.moveSpeed = character.speed;

        // 행동 패턴
        this.behaviors = ['idle', 'walk', 'work', 'sit', 'phone'];
        this.behaviorWeights = [30, 40, 15, 10, 5]; // 각 행동 확률 가중치

        // 이동 범위 (맵 전체 또는 특정 영역)
        this.wanderArea = {
            minX: 32,
            maxX: 600,
            minY: 32,
            maxY: 440
        };

        // 행동 시작
        this.startBehavior('idle');
    }

    /**
     * NPC 업데이트
     */
    update(deltaTime) {
        this.stateTimer += deltaTime;

        switch (this.state) {
            case NPC_STATE.IDLE:
                this.updateIdle(deltaTime);
                break;
            case NPC_STATE.WALKING:
                this.updateWalking(deltaTime);
                break;
            case NPC_STATE.WORKING:
            case NPC_STATE.SITTING:
            case NPC_STATE.PHONE:
                this.updateAction(deltaTime);
                break;
        }
    }

    /**
     * 대기 상태 업데이트
     */
    updateIdle(deltaTime) {
        // 일정 시간 후 다음 행동 선택
        if (this.stateTimer >= this.stateDuration) {
            this.selectNextBehavior();
        }
    }

    /**
     * 걷기 상태 업데이트 (타일 기반 이동)
     */
    updateWalking(deltaTime) {
        if (this.targetTileX === null || this.targetTileY === null) {
            this.startBehavior('idle');
            return;
        }

        // 현재 타일 좌표
        const currentTileX = Math.floor(this.character.x / this.tileSize);
        const currentTileY = Math.floor(this.character.y / this.tileSize);

        // 목표 타일 도달 체크
        if (currentTileX === this.targetTileX && currentTileY === this.targetTileY && !this.isMovingToTile) {
            this.targetTileX = null;
            this.targetTileY = null;
            this.startBehavior('idle');
            return;
        }

        // 현재 타일로 이동 중인 경우
        if (this.isMovingToTile) {
            // 목표 픽셀 좌표
            const targetPixelX = this.nextTileX * this.tileSize;
            const targetPixelY = this.nextTileY * this.tileSize + this.tileSize / 2;

            const dx = targetPixelX - this.character.x;
            const dy = targetPixelY - this.character.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.tileMoveSpeed) {
                // 타일 도달
                this.character.x = targetPixelX;
                this.character.y = targetPixelY;
                this.isMovingToTile = false;

                // 최종 목표에 도달했는지 체크
                if (this.nextTileX === this.targetTileX && this.nextTileY === this.targetTileY) {
                    this.targetTileX = null;
                    this.targetTileY = null;
                    this.startBehavior('idle');
                    return;
                }

                // 다음 타일로 이동 시작
                this.startNextTileMove();
            } else {
                // 목표로 이동
                const moveX = (dx / distance) * this.tileMoveSpeed;
                const moveY = (dy / distance) * this.tileMoveSpeed;
                this.character.x += moveX;
                this.character.y += moveY;
            }
        } else {
            // 새 타일 이동 시작
            this.startNextTileMove();
        }

        // 타임아웃 체크 (너무 오래 걸리면 중단)
        if (this.stateTimer >= 15000) {
            this.isMovingToTile = false;
            this.startBehavior('idle');
        }
    }

    /**
     * 다음 타일로 이동 시작 (4방향 중 하나 선택)
     */
    startNextTileMove() {
        const currentTileX = Math.floor(this.character.x / this.tileSize);
        const currentTileY = Math.floor(this.character.y / this.tileSize);

        const diffX = this.targetTileX - currentTileX;
        const diffY = this.targetTileY - currentTileY;

        // 이미 목표에 도달
        if (diffX === 0 && diffY === 0) {
            this.startBehavior('idle');
            return;
        }

        // 다음 이동 방향 결정 (X 또는 Y 중 하나만, 대각선 없음)
        let nextTileX = currentTileX;
        let nextTileY = currentTileY;
        let direction = this.character.direction;

        // X와 Y 차이 중 큰 쪽으로 먼저 이동 (또는 랜덤)
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);

        if (absX > 0 && absY > 0) {
            // 둘 다 이동 필요 - 랜덤 선택 또는 큰 쪽 선택
            if (Math.random() < 0.5) {
                // X 방향 이동
                nextTileX = currentTileX + Math.sign(diffX);
                direction = diffX > 0 ? 'right' : 'left';
            } else {
                // Y 방향 이동
                nextTileY = currentTileY + Math.sign(diffY);
                direction = diffY > 0 ? 'down' : 'up';
            }
        } else if (absX > 0) {
            // X 방향만 이동
            nextTileX = currentTileX + Math.sign(diffX);
            direction = diffX > 0 ? 'right' : 'left';
        } else if (absY > 0) {
            // Y 방향만 이동
            nextTileY = currentTileY + Math.sign(diffY);
            direction = diffY > 0 ? 'down' : 'up';
        }

        // 다음 타일 픽셀 좌표
        const nextPixelX = nextTileX * this.tileSize;
        const nextPixelY = nextTileY * this.tileSize + this.tileSize / 2;

        // 충돌 체크
        if (this.collisionCheck && this.collisionCheck(nextPixelX, nextPixelY, this.character)) {
            // 충돌 - 다른 방향 시도
            const altDirection = this.tryAlternativeDirection(currentTileX, currentTileY, diffX, diffY);
            if (altDirection) {
                nextTileX = altDirection.tileX;
                nextTileY = altDirection.tileY;
                direction = altDirection.direction;
            } else {
                // 이동 불가 - idle로 전환
                this.startBehavior('idle');
                return;
            }
        }

        // 이동 시작
        this.nextTileX = nextTileX;
        this.nextTileY = nextTileY;
        this.isMovingToTile = true;
        this.character.direction = direction;
        this.character.animation.setDirection(direction);
        this.character.animation.setAnimation('walk', direction);
    }

    /**
     * 대체 방향 시도 (충돌 시)
     */
    tryAlternativeDirection(currentTileX, currentTileY, diffX, diffY) {
        const directions = [];

        // 가능한 대체 방향들 수집
        if (diffX > 0) directions.push({ dx: 1, dy: 0, dir: 'right' });
        if (diffX < 0) directions.push({ dx: -1, dy: 0, dir: 'left' });
        if (diffY > 0) directions.push({ dx: 0, dy: 1, dir: 'down' });
        if (diffY < 0) directions.push({ dx: 0, dy: -1, dir: 'up' });

        // 셔플하여 랜덤 순서로 시도
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (const dir of directions) {
            const nextTileX = currentTileX + dir.dx;
            const nextTileY = currentTileY + dir.dy;
            const nextPixelX = nextTileX * this.tileSize;
            const nextPixelY = nextTileY * this.tileSize + this.tileSize / 2;

            if (!this.collisionCheck || !this.collisionCheck(nextPixelX, nextPixelY, this.character)) {
                return {
                    tileX: nextTileX,
                    tileY: nextTileY,
                    direction: dir.dir
                };
            }
        }

        return null;
    }

    /**
     * 행동 상태 업데이트 (work, sit, phone)
     */
    updateAction(deltaTime) {
        if (this.stateTimer >= this.stateDuration) {
            this.startBehavior('idle');
        }
    }

    /**
     * 다음 행동 선택
     */
    selectNextBehavior() {
        // 가중치 기반 랜덤 선택
        const totalWeight = this.behaviorWeights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < this.behaviors.length; i++) {
            random -= this.behaviorWeights[i];
            if (random <= 0) {
                this.startBehavior(this.behaviors[i]);
                return;
            }
        }

        this.startBehavior('idle');
    }

    /**
     * 행동 시작
     */
    startBehavior(behavior) {
        this.stateTimer = 0;

        switch (behavior) {
            case 'idle':
                this.state = NPC_STATE.IDLE;
                this.stateDuration = 2000 + Math.random() * 3000; // 2-5초
                this.character.animation.setAnimation('idle', this.character.direction);
                break;

            case 'walk':
                this.state = NPC_STATE.WALKING;
                this.stateDuration = 15000; // 최대 15초
                this.isMovingToTile = false;
                this.setRandomTarget();
                // 애니메이션은 startNextTileMove()에서 설정
                break;

            case 'work':
                this.state = NPC_STATE.WORKING;
                this.stateDuration = 5000 + Math.random() * 10000; // 5-15초
                this.character.animation.setAnimation('work', this.character.direction);
                break;

            case 'sit':
                this.state = NPC_STATE.SITTING;
                this.stateDuration = 5000 + Math.random() * 10000; // 5-15초
                this.character.animation.setAnimation('sit', this.character.direction);
                break;

            case 'phone':
                this.state = NPC_STATE.PHONE;
                this.stateDuration = 3000 + Math.random() * 5000; // 3-8초
                this.character.animation.setAnimation('phone', this.character.direction);
                break;

            default:
                this.startBehavior('idle');
        }
    }

    /**
     * 랜덤 목표 위치 설정 (타일 좌표)
     */
    setRandomTarget() {
        // 타일 좌표로 변환
        const minTileX = Math.floor(this.wanderArea.minX / this.tileSize);
        const maxTileX = Math.floor(this.wanderArea.maxX / this.tileSize);
        const minTileY = Math.floor(this.wanderArea.minY / this.tileSize);
        const maxTileY = Math.floor(this.wanderArea.maxY / this.tileSize);

        // 여러 번 시도하여 유효한 타일 찾기
        for (let i = 0; i < 10; i++) {
            const targetTileX = minTileX + Math.floor(Math.random() * (maxTileX - minTileX + 1));
            const targetTileY = minTileY + Math.floor(Math.random() * (maxTileY - minTileY + 1));

            // 픽셀 좌표로 변환하여 충돌 체크
            const targetPixelX = targetTileX * this.tileSize;
            const targetPixelY = targetTileY * this.tileSize + this.tileSize / 2;

            // 충돌 체크
            if (!this.collisionCheck ||
                !this.collisionCheck(targetPixelX, targetPixelY, this.character)) {
                this.targetTileX = targetTileX;
                this.targetTileY = targetTileY;
                return;
            }
        }

        // 유효한 위치 못 찾으면 idle
        this.startBehavior('idle');
    }

    /**
     * 이동 영역 설정
     */
    setWanderArea(minX, minY, maxX, maxY) {
        this.wanderArea = { minX, minY, maxX, maxY };
    }

    /**
     * 특정 타일로 이동
     * @param {number} tileX - 목표 타일 X 좌표
     * @param {number} tileY - 목표 타일 Y 좌표
     */
    moveTo(tileX, tileY) {
        this.targetTileX = tileX;
        this.targetTileY = tileY;
        this.isMovingToTile = false;
        this.state = NPC_STATE.WALKING;
        this.stateTimer = 0;
        this.stateDuration = 20000;
        // 애니메이션은 startNextTileMove()에서 설정
    }

    /**
     * 즉시 행동 변경
     */
    forceAction(action) {
        this.startBehavior(action);
    }
}
