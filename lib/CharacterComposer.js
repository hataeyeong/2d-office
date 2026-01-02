/**
 * CharacterComposer - 캐릭터 파츠를 레이어로 합성
 */
export class CharacterComposer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.parts = {
            body: null,
            eyes: null,
            outfit: null,
            hairstyle: null,
            accessory: null
        };
        this.loadedImages = new Map();
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
     * 파츠 로드
     */
    async loadPart(type, filename) {
        if (!filename) {
            this.parts[type] = null;
            return;
        }

        const basePath = '/characters';
        const paths = {
            body: `${basePath}/bodies/${filename}`,
            eyes: `${basePath}/eyes/${filename}`,
            outfit: `${basePath}/outfits/${filename}`,
            hairstyle: `${basePath}/hairstyles/${filename}`,
            accessory: `${basePath}/accessories/${filename}`
        };

        try {
            this.parts[type] = await this.loadImage(paths[type]);
        } catch (error) {
            console.error(`Failed to load ${type}:`, error);
            this.parts[type] = null;
        }
    }

    /**
     * 캔버스 클리어
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 단일 레이어 그리기 (스프라이트 시트에서 추출)
     * 스프라이트 시트 레이아웃:
     * - Row 0 (y=0): 4방향 기본 스프라이트 (헤어 상단 포함)
     * - Row 1 (y=32): idle 애니메이션 (캐릭터 본체)
     * 2개 row를 추출하여 헤어 전체 표시
     */
    drawLayer(image) {
        if (!image) return;

        const frameWidth = 32;
        const frameHeight = 64;  // 2 rows for full character with hair
        const srcX = 0;
        const srcY = 0;  // start from row 0 to include hair above

        // 캔버스 하단에 맞춰 그리기 (상단에 헤어 공간)
        const destHeight = this.canvas.height;
        const destWidth = this.canvas.width;
        const scale = destWidth / frameWidth;
        const scaledHeight = frameHeight * scale;
        const destY = destHeight - scaledHeight;

        this.ctx.drawImage(
            image,
            srcX, srcY, frameWidth, frameHeight,
            0, destY, destWidth, scaledHeight
        );
    }

    /**
     * 모든 레이어 합성
     * 순서: body → eyes → outfit → hairstyle → accessory
     */
    compose() {
        this.clear();
        this.ctx.imageSmoothingEnabled = false;

        // 레이어 순서대로 그리기
        this.drawLayer(this.parts.body);
        this.drawLayer(this.parts.eyes);
        this.drawLayer(this.parts.outfit);
        this.drawLayer(this.parts.hairstyle);
        this.drawLayer(this.parts.accessory);
    }

    /**
     * PNG로 내보내기
     */
    exportPNG(filename = 'character.png') {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Data URL 반환
     */
    toDataURL() {
        return this.canvas.toDataURL('image/png');
    }
}

/**
 * 파일명 생성 헬퍼 함수들
 */
export function getBodyFile(index) {
    return `Body_32x32_${String(index).padStart(2, '0')}.png`;
}

export function getEyesFile(index) {
    return `Eyes_32x32_${String(index).padStart(2, '0')}.png`;
}

export function getHairstyleFile(style, color) {
    return `Hairstyle_${String(style).padStart(2, '0')}_32x32_${String(color).padStart(2, '0')}.png`;
}

export function getOutfitFile(outfit, variant) {
    return `Outfit_${String(outfit).padStart(2, '0')}_32x32_${String(variant).padStart(2, '0')}.png`;
}

export function getAccessoryFile(id, name, variant) {
    const formattedName = name.replace(/ /g, '_');
    return `Accessory_${String(id).padStart(2, '0')}_${formattedName}_32x32_${String(variant).padStart(2, '0')}.png`;
}
