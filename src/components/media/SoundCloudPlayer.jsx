import React from 'react';
import './SoundCloudPlayer.css';

const SoundCloudPlayer = ({ url }) => {
    // Using generic embed for now, ideally would use SC Widget API for finding track ID
    // For this mock, we'll try to embed based on URL if possible, or just a placeholder visual if API key is needed.
    // Actually, visual "Player" request for top section is usually small.
    // Spec said: "SoundCloud player: Embedded at bottom of page" in Main Slide.

    return (
        <div className="sc-player-wrapper">
            <div className="sc-player-placeholder">
                {/* Real integration would load iframe here */}
                <span style={{ fontSize: '12px', opacity: 0.7 }}>SC PLAYER: {url}</span>
                <div className="sc-loading-bar"></div>
            </div>
        </div>
    );
};

export default SoundCloudPlayer;
