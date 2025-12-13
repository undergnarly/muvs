import React from 'react';
import Button from '../ui/Button';
import CircularGallery from './CircularGallery';
import './ReleaseDetails.css';

const ReleaseDetails = ({ release }) => {
    // Check if there's a SoundCloud playlist URL (set URL)
    const hasPlaylist = release.soundcloudUrl && release.soundcloudUrl.includes('/sets/');

    return (
        <div className="release-details-container">
            <div className="release-info">
                <h2 className="release-title-lg">{release.title}</h2>
                <span className="release-date">Released: {release.releaseDate}</span>

                <p className="release-description" dangerouslySetInnerHTML={{ __html: release.description }}></p>

                <div className="tracklist">
                    <h3>Tracklist</h3>
                    <ul>
                        {release.tracks && release.tracks.map((track, index) => (
                            <li key={track.id || index} className="track-item">
                                <span className="track-num">{(index + 1).toString().padStart(2, '0')}</span>
                                <span className="track-title">{track.title}</span>
                                <span className="track-duration">{track.duration}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="release-actions">
                    {release.bandcampUrl && (
                        <Button variant="accent" href={release.bandcampUrl}>
                            Buy on Bandcamp
                        </Button>
                    )}
                    {release.soundcloudUrl && (
                        <Button variant="accent" href={release.soundcloudUrl} style={{ background: 'transparent', border: '2px solid var(--color-accent)', color: 'var(--color-accent)' }}>
                            Listen on SoundCloud
                        </Button>
                    )}
                </div>

                {/* Circular Gallery */}
                {release.gallery && release.gallery.length > 0 && (
                    <div className="gallery-container-full">
                        <h3 className="gallery-title">Gallery</h3>
                        <div className="gallery-wrapper">
                            <CircularGallery
                                items={release.gallery}
                                bend={1}
                                textColor="#ffffff"
                                borderRadius={0.05}
                                scrollEase={0.05}
                                scrollSpeed={1.5}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReleaseDetails;
