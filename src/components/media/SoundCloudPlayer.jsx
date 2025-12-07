import React from 'react';
import { motion } from 'framer-motion';
import './SoundCloudPlayer.css';

const SoundCloudPlayer = ({ url }) => {
    if (!url) return null;

    return (
        <motion.div
            className="sc-player-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
        >
            <iframe
                width="100%"
                height="166"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`}
                style={{ borderRadius: '8px' }}
            ></iframe>
        </motion.div>
    );
};

export default SoundCloudPlayer;
