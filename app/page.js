'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Game } from '../lib/Game';

export default function Home() {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [debug, setDebug] = useState(false);

    // 게임 초기화
    useEffect(() => {
        async function initGame() {
            const canvas = canvasRef.current;
            if (!canvas) return;

            try {
                // 게임 인스턴스 생성
                const game = new Game(canvas);
                gameRef.current = game;

                // 게임 초기화
                await game.init('/map/office1.json');

                // 게임 시작
                game.start();

                setLoading(false);
                console.log('Game started!');

            } catch (err) {
                console.error('Failed to initialize game:', err);
                setError(err.message);
                setLoading(false);
            }
        }

        initGame();

        // 클린업
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy();
            }
        };
    }, []);

    // 디버그 토글
    const toggleDebug = useCallback(() => {
        if (gameRef.current) {
            gameRef.current.toggleDebug();
            setDebug(d => !d);
        }
    }, []);

    // 키보드 단축키
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F3') {
                e.preventDefault();
                toggleDebug();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleDebug]);

    if (error) {
        return (
            <div className="game-container">
                <div className="loading">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="game-container">
            {loading && <div className="loading">Loading...</div>}
            <canvas
                ref={canvasRef}
                style={{ display: loading ? 'none' : 'block' }}
            />
            <div className="game-ui">
                <div className="controls-hint">
                    <p>WASD / 방향키: 이동</p>
                    <p>Shift: 달리기</p>
                    <p>F3: 디버그 {debug ? 'OFF' : 'ON'}</p>
                </div>
                <div className="nav-links">
                    <a href="/generator" className="nav-link">
                        캐릭터 생성기 →
                    </a>
                    <a href="/map-editor" className="nav-link map-editor">
                        맵 에디터 →
                    </a>
                </div>
            </div>
            <style jsx>{`
                .game-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #1a1a2e;
                    position: relative;
                }
                .loading {
                    color: white;
                    font-size: 24px;
                }
                canvas {
                    image-rendering: pixelated;
                    image-rendering: crisp-edges;
                    border: 4px solid #0f3460;
                    border-radius: 8px;
                }
                .game-ui {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    color: white;
                    font-family: 'Segoe UI', sans-serif;
                }
                .controls-hint {
                    background: rgba(0, 0, 0, 0.7);
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                }
                .controls-hint p {
                    margin: 4px 0;
                }
                .nav-links {
                    display: flex;
                    gap: 8px;
                    margin-top: 12px;
                }
                .nav-link {
                    display: inline-block;
                    padding: 8px 16px;
                    background: #e94560;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                .nav-link:hover {
                    background: #ff6b8a;
                }
                .nav-link.map-editor {
                    background: #0f3460;
                }
                .nav-link.map-editor:hover {
                    background: #1a5490;
                }
            `}</style>
        </div>
    );
}
