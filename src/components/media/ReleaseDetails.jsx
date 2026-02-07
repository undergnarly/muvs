import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';
import CircularGallery from './CircularGallery';
import NavigationFooter from '../layout/NavigationFooter';
import TechTag from '../ui/TechTag';
import AnimatedGradient from '../ui/AnimatedGradient';
import { fixLinks } from '../../utils/linkUtils';
import { useData } from '../../context/DataContext';
import { FiDownload, FiSend } from 'react-icons/fi';
import './ReleaseDetails.css';

// Animation variants for stagger effect
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 20,
            stiffness: 100
        }
    }
};

const ReleaseDetails = ({ release, allReleases, onNavigate }) => {
    const { siteSettings } = useData();
    const [isVisible, setIsVisible] = useState(false);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [downloadEmail, setDownloadEmail] = useState('');
    const [downloadStatus, setDownloadStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'
    const [downloadMessage, setDownloadMessage] = useState('');
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    useEffect(() => {
        if (isInView) {
            // Small delay to ensure smooth animation
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isInView]);

    // Check if there's a SoundCloud playlist URL (set URL)
    const hasPlaylist = release.soundcloudUrl && release.soundcloudUrl.includes('/sets/');

    const gradientSettings = siteSettings?.gradientSettings || {};

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleDownloadClick = () => {
        if (!showEmailInput) {
            setShowEmailInput(true);
            setDownloadStatus('');
            setDownloadMessage('');
            return;
        }

        if (!isValidEmail(downloadEmail)) return;

        // Send request
        setDownloadStatus('sending');
        fetch('/api/release-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ releaseId: release.id, email: downloadEmail })
        })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (ok) {
                    setDownloadStatus('sent');
                    setDownloadMessage('Release sent to your email!');
                    setTimeout(() => {
                        setShowEmailInput(false);
                        setDownloadEmail('');
                        setDownloadStatus('');
                        setDownloadMessage('');
                    }, 4000);
                } else {
                    setDownloadStatus('error');
                    setDownloadMessage(data.error || 'Failed to send');
                    setTimeout(() => {
                        setDownloadStatus('');
                        setDownloadMessage('');
                    }, 4000);
                }
            })
            .catch(() => {
                setDownloadStatus('error');
                setDownloadMessage('Network error. Try again.');
                setTimeout(() => {
                    setDownloadStatus('');
                    setDownloadMessage('');
                }, 4000);
            });
    };

    return (
        <motion.div
            ref={ref}
            className="release-details-container"
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
        >
            <AnimatedGradient
                enabled={gradientSettings.enabled ?? false}
                gradientColors={gradientSettings.colors}
                animationSpeed={gradientSettings.speed}
                opacity={gradientSettings.opacity ?? 0.8}
                type={gradientSettings.type}
                blobSize={gradientSettings.blobSize ?? 50}
                randomize={gradientSettings.randomize ?? false}
                randomSeed={gradientSettings.randomSeed}
            />
            <motion.div className="release-info">
                <motion.h2 className="release-title-lg" variants={itemVariants}>{release.title}</motion.h2>

                {release.genres && release.genres.length > 0 && (
                    <motion.div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }} variants={itemVariants}>
                        {release.genres.map((genre, idx) => (
                            <TechTag key={idx} label={genre} />
                        ))}
                    </motion.div>
                )}

                <motion.span className="release-date" style={{ display: 'block', marginBottom: '16px' }} variants={itemVariants}>Released: {release.releaseDate}</motion.span>

                <motion.p className="release-description" variants={itemVariants} dangerouslySetInnerHTML={{ __html: fixLinks(release.description) }}></motion.p>

                {/* Show embedded SoundCloud playlist if available, otherwise show tracklist */}
                {/* SoundCloud Player */}
                {(release.soundcloudTrackUrl || release.soundcloudUrl) && (
                    <motion.div className="soundcloud-embed" variants={itemVariants}>
                        <iframe
                            width="100%"
                            height={release.soundcloudTrackUrl || !hasPlaylist ? "166" : "450"}
                            scrolling="no"
                            frameBorder="no"
                            allow="autoplay"
                            src={`https://w.soundcloud.com/player/?url=${encodeURIComponent((release.soundcloudTrackUrl || release.soundcloudUrl).split('?')[0])}&color=%23ccff00&auto_play=false&hide_related=true&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=${hasPlaylist ? 'true' : 'false'}`}
                            style={{
                                borderRadius: '8px',
                                marginTop: '16px',
                                marginBottom: '24px'
                            }}
                        ></iframe>
                    </motion.div>
                )}

                {/* Tracklist */}
                {release.tracks && release.tracks.length > 0 && (
                    <motion.div className="tracklist" variants={itemVariants}>
                        <ul>
                            {release.tracks.map((track, index) => (
                                <li key={track.id || index} className="track-item">
                                    <span className="track-num">{(index + 1).toString().padStart(2, '0')}</span>
                                    <span className="track-title">{track.title}</span>
                                    <span className="track-duration">{track.duration}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                <motion.div className="release-actions" variants={itemVariants}>
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
                </motion.div>

                {/* Download Section */}
                {release.downloadEnabled !== false && (
                    <motion.div className="release-download-section" variants={itemVariants}>
                        <AnimatePresence>
                            {showEmailInput && (
                                <motion.div
                                    className="download-email-input-wrap"
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <input
                                        type="email"
                                        placeholder="your@email.com"
                                        value={downloadEmail}
                                        onChange={(e) => setDownloadEmail(e.target.value)}
                                        className="download-email-input"
                                        disabled={downloadStatus === 'sending' || downloadStatus === 'sent'}
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button
                            className={`download-btn ${showEmailInput && isValidEmail(downloadEmail) ? 'download-btn--ready' : ''} ${downloadStatus === 'sending' ? 'download-btn--sending' : ''} ${downloadStatus === 'sent' ? 'download-btn--sent' : ''} ${downloadStatus === 'error' ? 'download-btn--error' : ''}`}
                            onClick={handleDownloadClick}
                            disabled={downloadStatus === 'sending' || downloadStatus === 'sent' || (showEmailInput && !isValidEmail(downloadEmail))}
                        >
                            {downloadStatus === 'sending' ? (
                                <>Sending...</>
                            ) : downloadStatus === 'sent' ? (
                                <>Sent!</>
                            ) : showEmailInput ? (
                                <><FiSend style={{ marginRight: 8 }} /> Send to Email</>
                            ) : (
                                <><FiDownload style={{ marginRight: 8 }} /> Download Release</>
                            )}
                        </button>
                        {downloadMessage && (
                            <div className={`download-message ${downloadStatus === 'error' ? 'download-message--error' : ''}`}>
                                {downloadMessage}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Circular Gallery */}
                {
                    release.gallery && release.gallery.length > 0 && (
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
                    )
                }
                {/* Navigation Footer */}
                {allReleases && (
                    <NavigationFooter
                        items={allReleases}
                        onNavigate={onNavigate}
                        currentIndex={allReleases.findIndex(r => r.id === release.id)}
                        title="More Music"
                    />
                )}
            </motion.div>
        </motion.div>
    );
};

export default ReleaseDetails;
