import React from 'react';
import { motion } from 'framer-motion';
import { FaSoundcloud, FaSpotify, FaYoutube } from 'react-icons/fa';
import { SiTidal, SiApplemusic } from 'react-icons/si';
import TechTag from '../ui/TechTag';
import AnimatedGradient from '../ui/AnimatedGradient';
import { fixLinks } from '../../utils/linkUtils';
import { useData } from '../../context/DataContext';
import NavigationFooter from '../layout/NavigationFooter';
import './MixDetails.css';

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

const MixDetails = ({ mix, allMixes, onNavigate }) => {
    const { siteSettings } = useData();
    const mediaLinks = [
        { url: mix.soundcloudUrl, icon: FaSoundcloud, label: 'SoundCloud', color: '#ff5500' },
        { url: mix.spotifyUrl, icon: FaSpotify, label: 'Spotify', color: '#1DB954' },
        { url: mix.youtubeUrl, icon: FaYoutube, label: 'YouTube', color: '#FF0000' },
        { url: mix.tidalUrl, icon: SiTidal, label: 'Tidal', color: '#000000' },
        { url: mix.appleMusicUrl, icon: SiApplemusic, label: 'Apple Music', color: '#FB233B' },
    ].filter(link => link.url);

    const gradientSettings = siteSettings?.gradientSettings || {};

    return (
        <motion.div
            className="mix-details-container"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
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
            <motion.div className="mix-info" variants={containerVariants}>
                <motion.h2 className="mix-title-lg" variants={itemVariants}>{mix.title}</motion.h2>

                {mix.genres && mix.genres.length > 0 && (
                    <motion.div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }} variants={itemVariants}>
                        {mix.genres.map((genre, idx) => (
                            <TechTag key={idx} label={genre} />
                        ))}
                    </motion.div>
                )}

                <motion.span className="mix-date" style={{ display: 'block', marginBottom: '16px' }} variants={itemVariants}>Recorded: {mix.recordDate} • {mix.duration}</motion.span>

                <motion.p className="mix-description" variants={itemVariants} dangerouslySetInnerHTML={{ __html: fixLinks(mix.description) }}></motion.p>

                {mix.tracklist && mix.tracklist.length > 0 && (
                    <motion.div className="tracklist" variants={itemVariants}>
                        <motion.h3 variants={itemVariants}>Tracklist</motion.h3>
                        <ul>
                            {mix.tracklist.map((track, idx) => (
                                <li key={idx} className="track-item">
                                    <span className="track-num">{track.time}</span>
                                    <span className="track-title">{track.artist} - {track.track}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                )}

                <motion.div className="mix-actions" variants={itemVariants}>
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
                </motion.div>
            </motion.div>
            {/* Navigation Footer */}
            {allMixes && (
                <NavigationFooter
                    items={allMixes.map(m => ({ ...m, coverImage: m.backgroundImage }))} // Mixes use 'backgroundImage' as cover
                    onNavigate={onNavigate}
                    currentIndex={allMixes.findIndex(m => m.id === mix.id)}
                    title="More Mixes"
                />
            )}
        </motion.div>
    );
};

export default MixDetails;
