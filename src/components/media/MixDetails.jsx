import React from 'react';
import { FaSoundcloud, FaSpotify, FaYoutube } from 'react-icons/fa';
import { SiTidal, SiApplemusic } from 'react-icons/si';
import TechTag from '../ui/TechTag';
import { fixLinks } from '../../utils/linkUtils';
import './MixDetails.css';

const MixDetails = ({ mix }) => {
    const mediaLinks = [
        { url: mix.soundcloudUrl, icon: FaSoundcloud, label: 'SoundCloud', color: '#ff5500' },
        { url: mix.spotifyUrl, icon: FaSpotify, label: 'Spotify', color: '#1DB954' },
        { url: mix.youtubeUrl, icon: FaYoutube, label: 'YouTube', color: '#FF0000' },
        { url: mix.tidalUrl, icon: SiTidal, label: 'Tidal', color: '#000000' },
        { url: mix.appleMusicUrl, icon: SiApplemusic, label: 'Apple Music', color: '#FB233B' },
    ].filter(link => link.url);

    return (
        <div className="mix-details-container">
            <div className="mix-info">
                <h2 className="mix-title-lg">{mix.title}</h2>

                {mix.genres && mix.genres.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {mix.genres.map((genre, idx) => (
                            <TechTag key={idx} label={genre} />
                        ))}
                    </div>
                )}

                <span className="mix-date" style={{ display: 'block', marginBottom: '16px' }}>Recorded: {mix.recordDate} • {mix.duration}</span>

                <p className="mix-description" dangerouslySetInnerHTML={{ __html: fixLinks(mix.description) }}></p>

                {mix.tracklist && mix.tracklist.length > 0 && (
                    <div className="tracklist">
                        <h3>Tracklist</h3>
                        <ul>
                            {mix.tracklist.map((track, idx) => (
                                <li key={idx} className="track-item">
                                    <span className="track-num">{track.time}</span>
                                    <span className="track-title">{track.artist} - {track.track}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mix-actions">
                    <div className="media-links">
                        {mediaLinks.map((link, index) => {
                            const Icon = link.icon;
                            return (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="media-icon-link"
                                    aria-label={`Listen on ${link.label}`}
                                    style={{ '--hover-color': link.color }}
                                >
                                    <Icon size={24} />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MixDetails;
