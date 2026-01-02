/**
 * InputManager - 키보드 입력 처리
 */
export class InputManager {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            action: false,  // Space or E
            shift: false
        };

        this.keyMap = {
            // WASD
            'KeyW': 'up',
            'KeyS': 'down',
            'KeyA': 'left',
            'KeyD': 'right',
            // Arrow keys
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            // Action keys
            'Space': 'action',
            'KeyE': 'action',
            'ShiftLeft': 'shift',
            'ShiftRight': 'shift'
        };

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
    }

    /**
     * 이벤트 리스너 등록
     */
    init() {
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
    }

    /**
     * 이벤트 리스너 해제
     */
    destroy() {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);
    }

    handleKeyDown(e) {
        const key = this.keyMap[e.code];
        if (key) {
            this.keys[key] = true;
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        const key = this.keyMap[e.code];
        if (key) {
            this.keys[key] = false;
            e.preventDefault();
        }
    }

    /**
     * 이동 방향 벡터 반환
     * @returns {{x: number, y: number}}
     */
    getMovementVector() {
        let x = 0;
        let y = 0;

        if (this.keys.left) x -= 1;
        if (this.keys.right) x += 1;
        if (this.keys.up) y -= 1;
        if (this.keys.down) y += 1;

        // 대각선 이동시 정규화
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }

        return { x, y };
    }

    /**
     * 이동 방향 반환 (캐릭터가 바라보는 방향)
     * @returns {string|null} 'up', 'down', 'left', 'right' or null
     */
    getDirection() {
        // 우선순위: 가장 최근 방향 또는 수직 > 수평
        if (this.keys.down) return 'down';
        if (this.keys.up) return 'up';
        if (this.keys.left) return 'left';
        if (this.keys.right) return 'right';
        return null;
    }

    /**
     * 이동 중인지 확인
     */
    isMoving() {
        return this.keys.up || this.keys.down || this.keys.left || this.keys.right;
    }

    /**
     * 달리기 중인지 확인
     */
    isRunning() {
        return this.keys.shift && this.isMoving();
    }

    /**
     * 액션 키 눌렀는지 확인
     */
    isActionPressed() {
        return this.keys.action;
    }
}
