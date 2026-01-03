/**
 * Character - 캐릭터 클래스
 * 위치, 방향, 애니메이션, 파츠 관리
 */
import { AnimationManager, ANIMATIONS, FRAME_WIDTH, FRAME_HEIGHT } from './AnimationManager.js';

export class Character {
    constructor(config) {
        // 위치
        this.x = config.x || 0;
        this.y = config.y || 0;

        // 속도
        this.speed = config.speed || 2;
        this.runSpeed = config.runSpeed || 4;

        // 타일 이동 설정
        this.tileSize = config.tileSize || 32;
        this.moveSpeed = config.moveSpeed || 4; // 타일 이동 속도 (픽셀/프레임)

        // 타일 이동 상태
        this.isMovingToTile = false;
        this.targetX = this.x;
        this.targetY = this.y;

        // 상태
        this.direction = config.direction || 'down';
        this.isPlayer = config.isPlayer || false;

        // 애니메이션
        this.animation = new AnimationManager();
        this.animation.setAnimation('idle', this.direction);

        // 캐릭터 파츠 (스프라이트 시트 이미지들)
        this.parts = {
            body: null,
            eyes: null,
            outfit: null,
            hairstyle: null,
            accessory: null
        };

        // 파츠 설정
        this.partConfig = config.parts || {
            body: 1,
            eyes: 1,
            outfit: 1,
            outfitVariant: 1,
            hairstyle: 1,
            hairColor: 1,
            accessory: 0,
            accessoryVariant: 1
        };

        // 로드된 이미지 캐시
        this.loadedImages = new Map();

        // 크기 (32x64 프레임)
        this.width = FRAME_WIDTH;
        this.height = FRAME_HEIGHT;

        // 충돌 박스 (캐릭터 중심 기준)
        // Y좌표가 타일 중심(row * 32 + 16)이므로 offsetY = 0이면 해당 타일 체크
        this.collisionBox = {
            offsetX: 8,
            offsetY: 0,
            width: 16,
            height: 16
        };
    }

    /**
     * 이미지 로드 (캐싱)
     */
    async loadImage(src) {
        if (this.loadedImages.has(src)) {
            return this.loadedImages.get(src);
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.loadedImages.set(src, img);
                resolve(img);
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * 캐릭터 파츠 로드
     */
    async loadParts() {
        const basePath = '/characters';
        const config = this.partConfig;

        const promises = [];

        // Body
        if (config.body) {
            const bodyFile = `Body_32x32_${String(config.body).padStart(2, '0')}.png`;
            const bodyPath = `${basePath}/bodies/${bodyFile}`;
            console.log(`Loading body: ${bodyPath}`);
            promises.push(
                this.loadImage(bodyPath)
                    .then(img => {
                        console.log(`Body loaded: ${bodyFile}`);
                        this.parts.body = img;
                    })
                    .catch((err) => {
                        console.error(`Failed to load body: ${bodyFile}`, err);
                        this.parts.body = null;
                    })
            );
        }

        // Eyes
        if (config.eyes) {
            const eyesFile = `Eyes_32x32_${String(config.eyes).padStart(2, '0')}.png`;
            const eyesPath = `${basePath}/eyes/${eyesFile}`;
            console.log(`Loading eyes: ${eyesPath}`);
            promises.push(
                this.loadImage(eyesPath)
                    .then(img => {
                        console.log(`Eyes loaded: ${eyesFile}`);
                        this.parts.eyes = img;
                    })
                    .catch((err) => {
                        console.error(`Failed to load eyes: ${eyesFile}`, err);
                        this.parts.eyes = null;
                    })
            );
        }

        // Outfit
        if (config.outfit) {
            const outfitFile = `Outfit_${String(config.outfit).padStart(2, '0')}_32x32_${String(config.outfitVariant || 1).padStart(2, '0')}.png`;
            const outfitPath = `${basePath}/outfits/${outfitFile}`;
            console.log(`Loading outfit: ${outfitPath}`);
            promises.push(
                this.loadImage(outfitPath)
                    .then(img => {
                        console.log(`Outfit loaded: ${outfitFile}`);
                        this.parts.outfit = img;
                    })
                    .catch((err) => {
                        console.error(`Failed to load outfit: ${outfitFile}`, err);
                        this.parts.outfit = null;
                    })
            );
        }

        // Hairstyle
        if (config.hairstyle) {
            const hairFile = `Hairstyle_${String(config.hairstyle).padStart(2, '0')}_32x32_${String(config.hairColor || 1).padStart(2, '0')}.png`;
            promises.push(
                this.loadImage(`${basePath}/hairstyles/${hairFile}`)
                    .then(img => {
                        this.parts.hairstyle = img;
                        console.log(`Hairstyle loaded: ${hairFile}`);
                    })
                    .catch((err) => {
                        console.error(`Failed to load hairstyle: ${hairFile}`, err);
                        this.parts.hairstyle = null;
                    })
            );
        }

        // Accessory
        if (config.accessory && config.accessory > 0) {
            const accessoryNames = [
                null, 'Ladybug', 'Bee', 'Backpack', 'Snapback', 'Dino_Snapback',
                'Policeman_Hat', 'Bataclava', 'Detective_Hat', 'Zombie_Brain', 'Bolt',
                'Beanie', 'Mustache', 'Beard', 'Gloves', 'Glasses',
                'Monocle', 'Medical_Mask', 'Chef', 'Party_Cone'
            ];
            const name = accessoryNames[config.accessory];
            if (name) {
                const accFile = `Accessory_${String(config.accessory).padStart(2, '0')}_${name}_32x32_${String(config.accessoryVariant || 1).padStart(2, '0')}.png`;
                promises.push(
                    this.loadImage(`${basePath}/accessories/${accFile}`)
                        .then(img => this.parts.accessory = img)
                        .catch(() => this.parts.accessory = null)
                );
            }
        }

        await Promise.all(promises);
    }

    /**
     * 캐릭터 업데이트
     * @param {number} deltaTime - 프레임 간 시간 (ms)
     * @param {Object} input - 입력 상태 (플레이어인 경우)
     * @param {Function} collisionCheck - 충돌 체크 함수
     */
    update(deltaTime, input = null, collisionCheck = null) {
        // 애니메이션 업데이트
        this.animation.update(deltaTime);

        // 플레이어 입력 처리
        if (this.isPlayer && input) {
            this.handleInput(input, collisionCheck);
        }
    }

    /**
     * 플레이어 입력 처리 (타일 기반 이동)
     */
    handleInput(input, collisionCheck) {
        const direction = input.getDirection();
        const isMoving = input.isMoving();
        const isRunning = input.isRunning();

        // 방향 오프셋
        const dirOffsets = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };

        // 현재 타일 이동 중인 경우
        if (this.isMovingToTile) {
            const currentSpeed = isRunning ? this.moveSpeed * 1.5 : this.moveSpeed;

            // 목표 방향으로 이동
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= currentSpeed) {
                // 목표 도달
                this.x = this.targetX;
                this.y = this.targetY;
                this.isMovingToTile = false;

                // 키를 계속 누르고 있으면 다음 타일로 이동
                if (isMoving && direction) {
                    this.startTileMove(direction, dirOffsets, collisionCheck);
                } else {
                    // 정지 - idle 애니메이션
                    this.animation.setAnimation('idle', this.direction);
                }
            } else {
                // 목표로 이동
                const moveX = (dx / distance) * currentSpeed;
                const moveY = (dy / distance) * currentSpeed;
                this.x += moveX;
                this.y += moveY;
            }
        } else {
            // 정지 상태에서 새 이동 시작
            if (isMoving && direction) {
                this.direction = direction;
                this.animation.setDirection(direction);
                this.startTileMove(direction, dirOffsets, collisionCheck);
            }
        }
    }

    /**
     * 타일 이동 시작
     */
    startTileMove(direction, dirOffsets, collisionCheck) {
        const offset = dirOffsets[direction];
        if (!offset) return;

        // 현재 타일 좌표
        const currentTileX = Math.floor(this.x / this.tileSize);
        const currentTileY = Math.floor(this.y / this.tileSize);

        // 다음 타일 좌표
        const nextTileX = currentTileX + offset.x;
        const nextTileY = currentTileY + offset.y;

        // 다음 타일 픽셀 좌표
        // X: 캐릭터 너비(32px) = 타일 너비, 왼쪽 가장자리 정렬
        // Y: 캐릭터 중심을 타일 중심에 맞춤
        const nextX = nextTileX * this.tileSize;
        const nextY = nextTileY * this.tileSize + this.tileSize / 2;

        // 충돌 체크
        const isBlocked = collisionCheck && collisionCheck(nextX, nextY, this);

        // 플레이어만 이동 로그 출력
        if (this.isPlayer) {
            console.log(`[이동] 코드row ${currentTileY}→${nextTileY} | y=${this.y.toFixed(0)}→${nextY.toFixed(0)} | ${isBlocked ? '❌ 막힘' : '✅ 이동'}`);
        }

        if (isBlocked) {
            // 충돌 - 이동 불가, 방향만 바라봄
            this.direction = direction;
            this.animation.setDirection(direction);
            this.animation.setAnimation('idle', this.direction);
            return;
        }

        // 이동 시작
        this.targetX = nextX;
        this.targetY = nextY;
        this.isMovingToTile = true;
        this.direction = direction;
        this.animation.setDirection(direction);
        this.animation.setAnimation('walk', this.direction);
    }

    /**
     * 특정 애니메이션 재생
     */
    playAnimation(animationName, onEnd = null) {
        this.animation.setAnimation(animationName, this.direction);
        this.animation.onAnimationEnd = onEnd;
    }

    /**
     * 캐릭터 렌더링
     * 32x64 프레임 사용 - 발 위치 기준으로 Y 좌표 조정
     */
    render(ctx) {
        ctx.imageSmoothingEnabled = false;

        // AnimationManager에서 현재 프레임의 소스 좌표 가져오기
        const srcRect = this.animation.getSourceRect();

        // 화면 좌표 (발이 타일 중심에 위치하도록)
        const destX = Math.floor(this.x);
        const destY = Math.floor(this.y) - FRAME_HEIGHT;  // 발 = y 위치

        // 레이어 순서대로 렌더링: body → eyes → outfit → hairstyle → accessory
        const partOrder = ['body', 'eyes', 'outfit', 'hairstyle', 'accessory'];

        for (const partName of partOrder) {
            const partImage = this.parts[partName];
            if (partImage) {
                ctx.drawImage(
                    partImage,
                    srcRect.x, srcRect.y, srcRect.width, srcRect.height,  // 소스: 32x64
                    destX, destY, srcRect.width, srcRect.height  // 목적지: 32x64
                );
            }
        }
    }

    /**
     * 충돌 박스 반환
     */
    getCollisionBox() {
        return {
            x: this.x + this.collisionBox.offsetX,
            y: this.y + this.collisionBox.offsetY,
            width: this.collisionBox.width,
            height: this.collisionBox.height
        };
    }

    /**
     * 위치 설정
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * 디버그 렌더링 (충돌 박스 표시)
     */
    renderDebug(ctx) {
        const box = this.getCollisionBox();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
    }
}
