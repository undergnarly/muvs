import React, { useRef, useState, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './PulsingPlayButton.css';

const PulsingPlayButton = ({ audioUrl, bpm = 120 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const [pulses, setPulses] = useState([]);
    const [pulseId, setPulseId] = useState(0);

    const intervalMs = (60 / bpm) * 1000;

    useEffect(() => {
        let timer;
        if (isPlaying) {
            // Initial pulse
            setPulses(prev => [...prev, { id: Date.now() }]);

            timer = setInterval(() => {
                setPulses(prev => {
                    // Cleanup old pulses (older than 2s to be safe)
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

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
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
                className="pulsing-play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                style={{
                    background: isPlaying ? 'transparent' : 'rgba(0,0,0,0.3)', // Subtle background when paused for visibility? Or requested transparent. requested transparent.
                }}
            >
                {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: '4px' }} />}
            </button>

            <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    );
};

export default PulsingPlayButton;
