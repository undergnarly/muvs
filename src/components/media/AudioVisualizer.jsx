import React, { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './AudioVisualizer.css';

const AudioVisualizer = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const audioContextRef = useRef(null);
    const animationIdRef = useRef(null);
    const dataArrayRef = useRef(null);

    useEffect(() => {
        if (!audioUrl) return;

        // Initialize Audio Context
        const initAudio = () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const source = audioContext.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            source.connect(audioContext.destination);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;
            dataArrayRef.current = dataArray;
        };

        // Initialize on first play to comply with autoplay policy
        const handleFirstPlay = () => {
            if (!audioContextRef.current) {
                initAudio();
            }
        };

        const audio = audioRef.current;
        audio.addEventListener('play', handleFirstPlay, { once: true });

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [audioUrl]);

    const drawVisualizer = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        const bufferLength = analyser.frequencyBinCount;

        analyser.getByteFrequencyData(dataArray);

        // Clear canvas
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw bars from bottom
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

            // Black bars
            canvasCtx.fillStyle = '#000000';
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 2;
        }

        animationIdRef.current = requestAnimationFrame(drawVisualizer);
    };

    const togglePlay = () => {
        const audio = audioRef.current;

        if (isPlaying) {
            audio.pause();
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        } else {
            audio.play();
            drawVisualizer();
        }

        setIsPlaying(!isPlaying);
    };

    if (!audioUrl) {
        return (
            <div className="audio-visualizer-placeholder">
                <p>No audio preview available</p>
            </div>
        );
    }

    return (
        <div className="audio-visualizer-container">
            <canvas
                ref={canvasRef}
                className="audio-visualizer-canvas"
                width={800}
                height={800}
            />

            <button
                className="audio-play-button"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>

            <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => {
                    setIsPlaying(false);
                    if (animationIdRef.current) {
                        cancelAnimationFrame(animationIdRef.current);
                    }
                }}
            />
        </div>
    );
};

export default AudioVisualizer;
