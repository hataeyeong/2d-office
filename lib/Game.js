/**
 * Game - 메인 게임 클래스
 * 게임 루프, 렌더링, 모든 시스템 관리
 */
import { InputManager } from './InputManager.js';
import { Character } from './Character.js';
import { CollisionManager } from './CollisionManager.js';
import { MultiTilesetManager } from './TilesetManager.js';
import { MapRenderer } from './MapRenderer.js';
import { NPCController } from './NPCController.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // 시스템
        this.input = new InputManager();
        this.collision = null;
        this.mapRenderer = null;
        this.tileset = null;

        // 게임 상태
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;

        // 엔티티
        this.player = null;
        this.npcs = [];
        this.npcControllers = [];

        // 맵 데이터
        this.mapData = null;
        this.mapLayers = null;

        // 설정
        this.debug = false;

        // 프레임 카운터
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTime = 0;
    }

    /**
     * 게임 초기화
     */
    async init(mapUrl = '/map/office1.json') {
        try {
            // 맵 데이터 로드
            const response = await fetch(mapUrl);
            if (!response.ok) throw new Error('Failed to load map');
            this.mapData = await response.json();

            const mapConfig = this.mapData.config;

            // 캔버스 크기 설정
            this.canvas.width = mapConfig.width * mapConfig.tileSize;
            this.canvas.height = mapConfig.height * mapConfig.tileSize;
            this.ctx.imageSmoothingEnabled = false;

            // 다중 타일셋 로드
            this.tileset = new MultiTilesetManager(mapConfig.tileSize);
            await this.tileset.loadAll();

            // 맵 렌더러 초기화
            this.mapRenderer = new MapRenderer(this.ctx, this.tileset, mapConfig);
            this.mapLayers = {
                floor: this.mapData.layers.floor,
                walls: this.mapData.layers.walls,
                furniture: this.mapData.layers.furniture,
                decorations: this.mapData.layers.decorations,
                ySorted: this.mapData.layers.ySorted || [],
                // 이전 버전 호환성: front → frontFurniture
                frontFurniture: this.mapData.layers.frontFurniture || this.mapData.layers.front || [],
                frontDecorations: this.mapData.layers.frontDecorations || [],
                collision: this.mapData.collision
            };

            // Y-sortable 오브젝트 추출 (의자 등)
            this.mapRenderer.extractYSortableObjects(this.mapLayers);

            // 충돌 시스템 초기화
            this.collision = new CollisionManager(this.mapData.collision, mapConfig);

            // 입력 시스템 초기화
            this.input.init();

            // 플레이어 생성
            await this.createPlayer();

            // NPC 생성
            await this.createNPCs();

            console.log('Game initialized successfully!');
            return true;

        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }

    /**
     * 플레이어 캐릭터 생성
     */
    async createPlayer() {
        this.player = new Character({
            x: 320,  // 시작 위치 (타일 10: 10*32)
            y: 240,  // 타일 7 중심: 7*32+16
            isPlayer: true,
            speed: 2,
            runSpeed: 4,
            parts: {
                body: 1,
                eyes: 1,
                outfit: 1,
                outfitVariant: 1,
                hairstyle: 1,
                hairColor: 1,
                accessory: 0
            }
        });

        await this.player.loadParts();
    }

    /**
     * NPC 생성
     */
    async createNPCs() {
        // 기본 NPC 몇 개 생성 (타일 좌표, Y는 중심)
        const npcConfigs = [
            { x: 160, y: 176, body: 2, eyes: 2, outfit: 5, hairstyle: 3, hairColor: 2 },   // 타일 (5,5)
            { x: 384, y: 304, body: 3, eyes: 3, outfit: 10, hairstyle: 7, hairColor: 4 },  // 타일 (12,9)
            { x: 480, y: 208, body: 4, eyes: 1, outfit: 15, hairstyle: 12, hairColor: 3 }  // 타일 (15,6)
        ];

        // 충돌 체크 함수
        const collisionCheck = (x, y, character) => {
            return this.collision.checkCollision(x, y, character);
        };

        for (const config of npcConfigs) {
            const npc = new Character({
                x: config.x,
                y: config.y,
                isPlayer: false,
                speed: 1,
                parts: {
                    body: config.body,
                    eyes: config.eyes,
                    outfit: config.outfit,
                    outfitVariant: 1,
                    hairstyle: config.hairstyle,
                    hairColor: config.hairColor,
                    accessory: 0
                }
            });

            await npc.loadParts();
            this.npcs.push(npc);

            // NPC 컨트롤러 생성
            const controller = new NPCController(npc, collisionCheck);
            this.npcControllers.push(controller);
        }
    }

    /**
     * 게임 루프 시작
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    /**
     * 게임 루프 중지
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * 메인 게임 루프
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        // 델타 타임 계산
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // FPS 계산
        this.frameCount++;
        this.fpsTime += this.deltaTime;
        if (this.fpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        // 업데이트
        this.update(this.deltaTime);

        // 렌더링
        this.render();

        // 다음 프레임 요청
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * 게임 상태 업데이트
     */
    update(deltaTime) {
        // 충돌 체크 함수
        const collisionCheck = (x, y, character) => {
            return this.collision.checkCollision(x, y, character);
        };

        // 플레이어 업데이트
        if (this.player) {
            this.player.update(deltaTime, this.input, collisionCheck);
        }

        // NPC 컨트롤러 업데이트 (AI 로직)
        for (const controller of this.npcControllers) {
            controller.update(deltaTime);
        }

        // NPC 애니메이션 업데이트
        for (const npc of this.npcs) {
            npc.animation.update(deltaTime);
        }
    }

    /**
     * 게임 렌더링
     */
    render() {
        // 캔버스 클리어
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. 베이스 레이어 렌더링 (바닥, 벽, 가구(Y-sortable 제외), 장식)
        if (this.mapRenderer) {
            this.mapRenderer.renderBaseLayers(this.mapLayers);
        }

        // 2. 캐릭터 + Y-sortable 타일 통합 Y-sorting
        const ySortedEntities = [];

        // 캐릭터 추가
        for (const npc of this.npcs) {
            ySortedEntities.push({
                type: 'character',
                entity: npc,
                sortY: npc.y
            });
        }
        if (this.player) {
            ySortedEntities.push({
                type: 'character',
                entity: this.player,
                sortY: this.player.y
            });
        }

        // Y-sortable 타일 추가 (각 타일이 개별 sortY를 가짐)
        if (this.mapRenderer) {
            const ySortableTiles = this.mapRenderer.getYSortableObjects();
            for (const tile of ySortableTiles) {
                ySortedEntities.push({
                    type: 'tile',
                    entity: tile,
                    sortY: tile.sortY
                });
            }
        }

        // Y좌표 기준 정렬 (작은 값 = 화면 위쪽 = 먼저 렌더링)
        ySortedEntities.sort((a, b) => a.sortY - b.sortY);

        // 정렬된 순서로 렌더링
        for (const item of ySortedEntities) {
            if (item.type === 'character') {
                item.entity.render(this.ctx);
                if (this.debug) {
                    item.entity.renderDebug(this.ctx);
                }
            } else if (item.type === 'tile') {
                this.mapRenderer.renderYSortableTile(item.entity);
            }
        }

        // 3. Front 레이어 렌더링 (항상 캐릭터 위)
        if (this.mapRenderer) {
            this.mapRenderer.renderFrontLayers(this.mapLayers);
        }

        // 디버그 정보
        if (this.debug) {
            this.renderDebugInfo();
        }
    }

    /**
     * 디버그 정보 렌더링
     */
    renderDebugInfo() {
        // 충돌 레이어 표시
        if (this.collision) {
            this.collision.renderDebug(this.ctx);
        }

        // FPS 표시
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);

        if (this.player) {
            this.ctx.fillText(
                `Player: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})`,
                10, 40
            );
            this.ctx.fillText(
                `Animation: ${this.player.animation.currentAnimation}`,
                10, 60
            );
        }
    }

    /**
     * 디버그 모드 토글
     */
    toggleDebug() {
        this.debug = !this.debug;
    }

    /**
     * 리소스 정리
     */
    destroy() {
        this.stop();
        this.input.destroy();
    }

    /**
     * 플레이어 파츠 변경
     */
    async setPlayerParts(partConfig) {
        if (this.player) {
            this.player.partConfig = { ...this.player.partConfig, ...partConfig };
            await this.player.loadParts();
        }
    }
}
