import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { FaSoundcloud, FaSpotify, FaYoutube } from 'react-icons/fa';
import { SiTidal, SiApplemusic } from 'react-icons/si';
import TechTag from '../ui/TechTag';
import { fixLinks } from '../../utils/linkUtils';
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
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    useEffect(() => {
        if (isInView) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isInView]);

    const mediaLinks = [
        { url: mix.soundcloudUrl, icon: FaSoundcloud, label: 'SoundCloud', color: '#ff5500' },
        { url: mix.spotifyUrl, icon: FaSpotify, label: 'Spotify', color: '#1DB954' },
        { url: mix.youtubeUrl, icon: FaYoutube, label: 'YouTube', color: '#FF0000' },
        { url: mix.tidalUrl, icon: SiTidal, label: 'Tidal', color: '#000000' },
        { url: mix.appleMusicUrl, icon: SiApplemusic, label: 'Apple Music', color: '#FB233B' },
    ].filter(link => link.url);

    console.log('[MixDetails] Rendered', {
        isVisible,
        isInView,
        title: mix?.title
    });

    return (
        <motion.div
            ref={ref}
            className="mix-details-container"
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
        >