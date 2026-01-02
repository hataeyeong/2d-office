'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
    CharacterComposer,
    getBodyFile,
    getEyesFile,
    getHairstyleFile,
    getOutfitFile,
    getAccessoryFile
} from '../../lib/CharacterComposer';
import styles from './page.module.css';

const ACCESSORY_NAMES = [
    null,
    'Ladybug', 'Bee', 'Backpack', 'Snapback', 'Dino_Snapback',
    'Policeman_Hat', 'Bataclava', 'Detective_Hat', 'Zombie_Brain', 'Bolt',
    'Beanie', 'Mustache', 'Beard', 'Gloves', 'Glasses',
    'Monocle', 'Medical_Mask', 'Chef', 'Party_Cone'
];

export default function Generator() {
    const canvasRef = useRef(null);
    const composerRef = useRef(null);

    // 선택 상태
    const [body, setBody] = useState(1);
    const [eyes, setEyes] = useState(1);
    const [hairstyle, setHairstyle] = useState(1);
    const [hairColor, setHairColor] = useState(1);
    const [outfit, setOutfit] = useState(1);
    const [outfitVariant, setOutfitVariant] = useState(1);
    const [accessory, setAccessory] = useState(0);
    const [accessoryVariant, setAccessoryVariant] = useState(1);

    // 캐릭터 합성
    const updateCharacter = useCallback(async () => {
        if (!composerRef.current) return;

        const composer = composerRef.current;

        await Promise.all([
            composer.loadPart('body', getBodyFile(body)),
            composer.loadPart('eyes', getEyesFile(eyes)),
            composer.loadPart('outfit', getOutfitFile(outfit, outfitVariant)),
            composer.loadPart('hairstyle', getHairstyleFile(hairstyle, hairColor)),
            composer.loadPart('accessory', accessory > 0
                ? getAccessoryFile(accessory, ACCESSORY_NAMES[accessory], accessoryVariant)
                : null
            )
        ]);

        composer.compose();
    }, [body, eyes, hairstyle, hairColor, outfit, outfitVariant, accessory, accessoryVariant]);

    // 초기화
    useEffect(() => {
        if (canvasRef.current && !composerRef.current) {
            canvasRef.current.width = 96;
            canvasRef.current.height = 192;  // 64px 높이 스프라이트 * 3배 스케일
            composerRef.current = new CharacterComposer(canvasRef.current);
        }
    }, []);

    // 파츠 변경시 업데이트
    useEffect(() => {
        updateCharacter();
    }, [updateCharacter]);

    // 랜덤 캐릭터
    const randomize = () => {
        setBody(Math.floor(Math.random() * 9) + 1);
        setEyes(Math.floor(Math.random() * 7) + 1);
        setHairstyle(Math.floor(Math.random() * 29) + 1);
        setHairColor(Math.floor(Math.random() * 7) + 1);
        setOutfit(Math.floor(Math.random() * 33) + 1);
        setOutfitVariant(Math.floor(Math.random() * 4) + 1);
        setAccessory(Math.floor(Math.random() * 20));
        setAccessoryVariant(Math.floor(Math.random() * 4) + 1);
    };

    // PNG 내보내기
    const exportPNG = () => {
        if (composerRef.current) {
            composerRef.current.exportPNG('character.png');
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Character Generator</h1>
                <div className={styles.actions}>
                    <button onClick={randomize} className={styles.btnRandom}>
                        Random
                    </button>
                    <button onClick={exportPNG} className={styles.btnExport}>
                        Export PNG
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                {/* 미리보기 */}
                <section className={styles.preview}>
                    <div className={styles.canvasWrapper}>
                        <canvas ref={canvasRef} className={styles.canvas} />
                    </div>
                    <p className={styles.previewLabel}>Preview (32x64)</p>
                </section>

                {/* 파츠 선택 */}
                <section className={styles.selectors}>
                    {/* Body */}
                    <div className={styles.selector}>
                        <label>Body</label>
                        <div className={styles.controls}>
                            <button onClick={() => setBody(b => Math.max(1, b - 1))}>◀</button>
                            <span>{body} / 9</span>
                            <button onClick={() => setBody(b => Math.min(9, b + 1))}>▶</button>
                        </div>
                    </div>

                    {/* Eyes */}
                    <div className={styles.selector}>
                        <label>Eyes</label>
                        <div className={styles.controls}>
                            <button onClick={() => setEyes(e => Math.max(1, e - 1))}>◀</button>
                            <span>{eyes} / 7</span>
                            <button onClick={() => setEyes(e => Math.min(7, e + 1))}>▶</button>
                        </div>
                    </div>

                    {/* Outfit */}
                    <div className={styles.selector}>
                        <label>Outfit</label>
                        <div className={styles.controls}>
                            <button onClick={() => setOutfit(o => Math.max(1, o - 1))}>◀</button>
                            <span>{outfit} / 33</span>
                            <button onClick={() => setOutfit(o => Math.min(33, o + 1))}>▶</button>
                        </div>
                        <div className={styles.subControls}>
                            <span>Variant:</span>
                            <button onClick={() => setOutfitVariant(v => Math.max(1, v - 1))}>◀</button>
                            <span>{outfitVariant}</span>
                            <button onClick={() => setOutfitVariant(v => Math.min(10, v + 1))}>▶</button>
                        </div>
                    </div>

                    {/* Hairstyle */}
                    <div className={styles.selector}>
                        <label>Hairstyle</label>
                        <div className={styles.controls}>
                            <button onClick={() => setHairstyle(h => Math.max(1, h - 1))}>◀</button>
                            <span>{hairstyle} / 29</span>
                            <button onClick={() => setHairstyle(h => Math.min(29, h + 1))}>▶</button>
                        </div>
                        <div className={styles.subControls}>
                            <span>Color:</span>
                            <button onClick={() => setHairColor(c => Math.max(1, c - 1))}>◀</button>
                            <span>{hairColor}</span>
                            <button onClick={() => setHairColor(c => Math.min(7, c + 1))}>▶</button>
                        </div>
                    </div>

                    {/* Accessory */}
                    <div className={styles.selector}>
                        <label>Accessory</label>
                        <div className={styles.controls}>
                            <button onClick={() => setAccessory(a => Math.max(0, a - 1))}>◀</button>
                            <span>{accessory === 0 ? 'None' : ACCESSORY_NAMES[accessory]}</span>
                            <button onClick={() => setAccessory(a => Math.min(19, a + 1))}>▶</button>
                        </div>
                        {accessory > 0 && (
                            <div className={styles.subControls}>
                                <span>Variant:</span>
                                <button onClick={() => setAccessoryVariant(v => Math.max(1, v - 1))}>◀</button>
                                <span>{accessoryVariant}</span>
                                <button onClick={() => setAccessoryVariant(v => Math.min(10, v + 1))}>▶</button>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <footer className={styles.footer}>
                <a href="/">← Back to Map Viewer</a>
            </footer>
        </div>
    );
}
