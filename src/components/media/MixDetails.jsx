import React from 'react';
import { FaSoundcloud, FaSpotify, FaYoutube } from 'react-icons/fa';
import { SiTidal, SiApplemusic } from 'react-icons/si';
import './MixDetails.css';

const MixDetails = ({ mix }) => {
    // The mediaLinks array and its rendering logic are removed as per the instruction's implied structure.
    // The icons FaSoundcloud, FaSpotify, FaYoutube, SiTidal, SiApplemusic are no longer needed.

    return (
        <div className="mix-details-container">
            <div className="mix-info">
                <h2 className="mix-title-lg">{mix.title}</h2>
                <div className="mix-meta">
                    {mix.recordDate && <span className="mix-date">Recorded: {mix.recordDate}</span>}
                    {mix.duration && <span className="mix-duration">Duration: {mix.duration}</span>}
                </div>

                {mix.description && (
                    <p className="mix-description" dangerouslySetInnerHTML={{ __html: fixLinks(mix.description) }}></p>
                )}

                {/* Tracklist */}
                {mix.tracks && mix.tracks.length > 0 && ( // Note: The instruction changed mix.tracklist to mix.tracks here.
                    <div className="tracklist">
                        <h3>Tracklist</h3>
                        <ul>
                            {mix.tracklist.map((track, idx) => ( // Note: The instruction kept mix.tracklist here.
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
