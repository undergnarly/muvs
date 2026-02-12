import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './PulsingPlayButton.css';

const PulsingPlayButton = ({ audioUrl, bpm = 120, onBassUpdate, bassIntensity = 5 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const dataArrayRef = useRef(null);
    const rafRef = useRef(null);
    const slowZoomRef = useRef(1);
    const zoomDirRef = useRef(1);
    const snareFlashRef = useRef(0);
    const prevSnareRef = useRef(0);

    const [pulses, setPulses] = useState([]);
    const intervalMs = (60 / bpm) * 1000;

    const initBassReactor = useCallback(() => {
        if (audioCtxRef.current || !audioRef.current) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.4;
            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);

            audioCtxRef.current = ctx;
            analyserRef.current = analyser;
            sourceRef.current = source;
            dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) {
            console.error('Bass reactor init failed:', e);
        }
    }, []);

    const bassLoop = useCallback(() => {
        rafRef.current = requestAnimationFrame(bassLoop);
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        if (!analyser || !dataArray || !onBassUpdate) return;

        analyser.getByteFrequencyData(dataArray);

        // Sub-bass: bins 1-2 (~43-86Hz)
        const sub = dataArray[1] * 0.8 + dataArray[2] * 0.2;

        // Snare: bins 50-100 (~2-4kHz)
        let snareSum = 0;
        for (let i = 50; i < 100; i++) snareSum += dataArray[i];
        const snareLevel = snareSum / 50;
        const snareJump = snareLevel - prevSnareRef.current;
        prevSnareRef.current = snareLevel;

        if (snareJump > 30 && snareLevel > 80) {
            snareFlashRef.current = Math.min(1, snareJump / 80);
        }
        snareFlashRef.current *= 0.85;
        if (snareFlashRef.current < 0.02) snareFlashRef.current = 0;

        const intensity = Math.min(1, sub / 160);
        const hasBass = intensity > 0.45;

        // Scale factor: bassIntensity 1-10 maps to 0.1-1.0
        const f = Math.max(0.1, Math.min(1, bassIntensity / 10));

        let scale, bright, tx = 0, ty = 0;

        if (hasBass) {
            const shakeIntensity = Math.max(0, (intensity - 0.45) / 0.55);
            const shakeAmount = shakeIntensity * 1.2 * f;
            tx = (Math.random() - 0.5) * shakeAmount;
            ty = (Math.random() - 0.5) * shakeAmount;
            scale = 1 + intensity * 0.1 * f;
            bright = 1 - (0.4 * f) + intensity * 0.7 * f;
        } else {
            const maxZoom = 1 + 0.04 * f;
            slowZoomRef.current += zoomDirRef.current * 0.0001;
            if (slowZoomRef.current > maxZoom) zoomDirRef.current = -1;
            if (slowZoomRef.current < 1) zoomDirRef.current = 1;
            const zoomProgress = (slowZoomRef.current - 1) / (0.04 * f || 0.01);
            scale = slowZoomRef.current;
            bright = 1 - (0.3 * f) + zoomProgress * 0.3 * f;
        }

        bright += snareFlashRef.current * 0.2 * f;
        const contrast = 1 + snareFlashRef.current * 0.12 * f;

        onBassUpdate({ scale, bright, contrast, tx, ty });
    }, [onBassUpdate, bassIntensity]);

    const startBassLoop = useCallback(() => {
        if (rafRef.current) return;
        bassLoop();
    }, [bassLoop]);

    const stopBassLoop = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        // Reset visual state
        if (onBassUpdate) {
            onBassUpdate({ scale: 1, bright: 1, contrast: 1, tx: 0, ty: 0 });
        }
        slowZoomRef.current = 1;
        zoomDirRef.current = 1;
        snareFlashRef.current = 0;
        prevSnareRef.current = 0;
    }, [onBassUpdate]);

    // BPM pulse rings
    useEffect(() => {
        let timer;
        if (isPlaying) {
            setPulses(prev => [...prev, { id: Date.now() }]);
            timer = setInterval(() => {
                setPulses(prev => {
                    const now = Date.now();
                    const filtered = prev.filter(p => now - p.id < 2000);
                    return [...filtered, { id: now }];
                });
            }, intervalMs);
        } else {
            setPulses([]);
        }
        return () => clearInterval(timer);
    }, [isPlaying, intervalMs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopBassLoop();
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
            }
        };
    }, [stopBassLoop]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            stopBassLoop();
        } else {
            initBassReactor();
            audio.play().then(() => {
                startBassLoop();
            }).catch(() => {});
        }
        setIsPlaying(!isPlaying);
    };

    if (!audioUrl) return null;

    return (
        <div className="pulsing-play-container">
            <div className="pulse-rings">
                {pulses.map(pulse => (
                    <div key={pulse.id} className="pulse-ring" />
                ))}
            </div>

            <button
                className={`pulsing-play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '4px' }} />}
            </button>

            <audio
                ref={audioRef}
                src={audioUrl}
                crossOrigin="anonymous"
                onEnded={() => {
                    setIsPlaying(false);
                    stopBassLoop();
                }}
            />
        </div>
    );
};

export default PulsingPlayButton;
