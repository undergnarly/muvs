import React, { useRef, useState } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa';
import './AudioVisualizer.css';

const AudioVisualizer = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const togglePlay = () => {
        const audio = audioRef.current;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }

        setIsPlaying(!isPlaying);
    };

    return (
        <div className="audio-visualizer-container">
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
                onEnded={() => setIsPlaying(false)}
            />
        </div>
    );
};

export default AudioVisualizer;
