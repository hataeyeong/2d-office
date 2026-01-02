/**
 * AnimationManager - 스프라이트 애니메이션 관리
 *
 * 스프라이트 시트 레이아웃:
 * - 각 Row는 64px 높이 (32x64 프레임)
 * - 각 애니메이션은 4방향 (down, left, right, up)으로 구성
 * - 방향별로 여러 프레임
 *
 * 64px Row 레이아웃 (픽셀 분석 결과):
 * - Row 0 (y=0-63): 4방향 정적 포즈 (4프레임)
 * - Row 1 (y=64-127): idle 애니메이션 (~26프레임)
 * - Row 2 (y=128-191): walk 애니메이션 (~27프레임)
 * - Row 3+: 기타 애니메이션
 */

// 애니메이션 정의 (64px Row 기준)
// 프레임 배치: [right×N, up×N, left×N, down×N]
export const ANIMATIONS = {
    // 기본 서있기 - Row 0 (4방향 정적 포즈)
    stand: { row: 0, framesPerDirection: 1, speed: 1000, loop: false },

    // idle - Row 1 (64px Row 기준, y=64-127) - 6프레임 × 4방향 = 24프레임
    idle: { row: 1, framesPerDirection: 6, speed: 200, loop: true },

    // walk - Row 2 (64px Row 기준, y=128-191) - 6프레임 × 4방향 = 24프레임
    walk: { row: 2, framesPerDirection: 6, speed: 100, loop: true },

    // sleep - Row 3 (64px Row 기준)
    sleep: { row: 3, framesPerDirection: 1, speed: 200, loop: true },

    // sit-chair - Row 4 (2방향: right, left만 존재)
    'sit-chair': { row: 4, framesPerDirection: 6, speed: 200, loop: true, directions: 2 },

    // sit-floor - Row 5 (2방향: right, left만 존재)
    'sit-floor': { row: 5, framesPerDirection: 6, speed: 200, loop: true, directions: 2 },

    // phone - Row 6
    phone: { row: 6, framesPerDirection: 1, speed: 150, loop: true },

    // work/typing - Row 7
    work: { row: 7, framesPerDirection: 1, speed: 120, loop: true },

    // 이하 애니메이션은 Row 0 (정적 포즈) 사용
    pushCart: { row: 0, framesPerDirection: 1, speed: 100, loop: true },
    pickUp: { row: 0, framesPerDirection: 1, speed: 100, loop: false },
    gift: { row: 0, framesPerDirection: 1, speed: 150, loop: true },
    lift: { row: 0, framesPerDirection: 1, speed: 100, loop: false },
    throw: { row: 0, framesPerDirection: 1, speed: 80, loop: false },
    hit: { row: 0, framesPerDirection: 1, speed: 80, loop: false },
    punch: { row: 0, framesPerDirection: 1, speed: 80, loop: false },
    stab: { row: 0, framesPerDirection: 1, speed: 60, loop: false },
    grabGun: { row: 0, framesPerDirection: 1, speed: 100, loop: false },
    gunIdle: { row: 0, framesPerDirection: 1, speed: 200, loop: true },
    shoot: { row: 0, framesPerDirection: 1, speed: 60, loop: false },
    hurt: { row: 0, framesPerDirection: 1, speed: 100, loop: false }
};

// 프레임 크기 상수
export const FRAME_WIDTH = 32;
export const FRAME_HEIGHT = 64;

// 방향 인덱스 (스프라이트 시트 순서: right=0, up=1, left=2, down=3)
export const DIRECTIONS = {
    down: 3,   // 정면 = 프레임 3
    left: 2,   // 왼쪽 = 프레임 2
    right: 0,  // 오른쪽 = 프레임 0
    up: 1      // 뒤쪽 = 프레임 1
};

export class AnimationManager {
    constructor() {
        this.currentAnimation = 'idle';
        this.currentDirection = 'down';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.isPlaying = true;
        this.onAnimationEnd = null;
    }

    /**
     * 애니메이션 설정
     */
    setAnimation(animationName, direction = null) {
        if (this.currentAnimation !== animationName) {
            this.currentAnimation = animationName;
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.isPlaying = true;
        }
        if (direction) {
            this.currentDirection = direction;
        }
    }

    /**
     * 방향만 변경
     */
    setDirection(direction) {
        this.currentDirection = direction;
    }

    /**
     * 애니메이션 업데이트
     * @param {number} deltaTime - 프레임 간 시간 (ms)
     */
    update(deltaTime) {
        if (!this.isPlaying) return;

        const anim = ANIMATIONS[this.currentAnimation];
        if (!anim) return;

        this.frameTimer += deltaTime;

        if (this.frameTimer >= anim.speed) {
            this.frameTimer = 0;
            this.currentFrame++;

            if (this.currentFrame >= anim.framesPerDirection) {
                if (anim.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = anim.framesPerDirection - 1;
                    this.isPlaying = false;
                    if (this.onAnimationEnd) {
                        this.onAnimationEnd(this.currentAnimation);
                    }
                }
            }
        }
    }

    /**
     * 스프라이트 시트에서의 소스 좌표 계산
     * @param {number} frameWidth - 프레임 너비 (기본 32px)
     * @param {number} frameHeight - 프레임 높이 (기본 64px)
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getSourceRect(frameWidth = FRAME_WIDTH, frameHeight = FRAME_HEIGHT) {
        const anim = ANIMATIONS[this.currentAnimation];
        if (!anim) {
            return { x: 0, y: 0, width: frameWidth, height: frameHeight };
        }

        let dirIndex;

        // X 좌표: 방향별 프레임 오프셋 + 현재 프레임
        let frameX;
        if (anim.singleDirection) {
            // 단일 방향 애니메이션 (예: sleep)
            frameX = this.currentFrame;
        } else if (anim.directions === 2) {
            // 2방향 애니메이션 (right, left만): right=0, left=1
            // down/up은 가장 가까운 방향으로 매핑
            if (this.currentDirection === 'left' || this.currentDirection === 'up') {
                dirIndex = 1;  // left
            } else {
                dirIndex = 0;  // right (down도 right로 매핑)
            }
            frameX = dirIndex * anim.framesPerDirection + this.currentFrame;
        } else {
            // 4방향 애니메이션: 방향별로 framesPerDirection개씩
            dirIndex = DIRECTIONS[this.currentDirection] || 0;
            frameX = dirIndex * anim.framesPerDirection + this.currentFrame;
        }

        // Y 좌표: 애니메이션 Row (64px 단위)
        const frameY = anim.row;

        return {
            x: frameX * frameWidth,
            y: frameY * frameHeight,
            width: frameWidth,
            height: frameHeight
        };
    }

    /**
     * 현재 애니메이션이 끝났는지 확인
     */
    isFinished() {
        const anim = ANIMATIONS[this.currentAnimation];
        return !anim.loop && !this.isPlaying;
    }

    /**
     * 애니메이션 재시작
     */
    restart() {
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.isPlaying = true;
    }
}
