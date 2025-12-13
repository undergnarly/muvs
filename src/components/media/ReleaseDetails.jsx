import Button from '../ui/Button';
import CircularGallery from './CircularGallery';
import TechTag from '../ui/TechTag';
import './ReleaseDetails.css';

const ReleaseDetails = ({ release }) => {
    // Check if there's a SoundCloud playlist URL (set URL)
    const hasPlaylist = release.soundcloudUrl && release.soundcloudUrl.includes('/sets/');

    return (
        <div className="release-details-container">
            <div className="release-info">
                <h2 className="release-title-lg">{release.title}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span className="release-date">Released: {release.releaseDate}</span>
                    {release.genres && release.genres.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {release.genres.map((genre, idx) => (
                                <TechTag key={idx} label={genre} />
                            ))}
                        </div>
                    )}
                </div>

                <p className="release-description" dangerouslySetInnerHTML={{ __html: release.description }}></p>

                {/* Show embedded SoundCloud playlist if available, otherwise show tracklist */}
                {hasPlaylist ? (
                    <div className="soundcloud-playlist">
                        <iframe
                            width="100%"
                            height="450"
                            scrolling="no"
                            frameBorder="no"
                            allow="autoplay"
                            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(release.soundcloudUrl)}&color=%23ccff00&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`}
                            style={{
                                borderRadius: '8px',
                                marginTop: '16px',
                                marginBottom: '16px'
                            }}
                        ></iframe>
                    </div>
                ) : (
                    <div className="tracklist">
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
                )}

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
