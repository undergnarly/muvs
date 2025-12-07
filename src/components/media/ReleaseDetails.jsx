import React from 'react';
import Button from '../ui/Button';
import './ReleaseDetails.css';

const ReleaseDetails = ({ release }) => {
    return (
        <div className="release-details-container">
            <div className="release-info">
                <h2 className="release-title-lg">{release.title}</h2>
                <span className="release-date">Released: {release.releaseDate}</span>

                <p className="release-description">{release.description}</p>

                <div className="tracklist">
                    <h3>Tracklist</h3>
                    <ul>
                        {release.tracks.map(track => (
                            <li key={track.id} className="track-item">
                                <span className="track-num">{track.id.toString().padStart(2, '0')}</span>
                                <span className="track-title">{track.title}</span>
                                <span className="track-duration">{track.duration}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="release-actions">
                    <Button variant="accent" href={release.bandcampUrl}>
                        Buy on Bandcamp
                    </Button>
                    <Button variant="accent" href={release.soundcloudUrl} style={{ background: 'transparent', border: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                        Listen on SoundCloud
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReleaseDetails;
