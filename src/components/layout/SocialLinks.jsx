import React from 'react';
import { FaInstagram, FaSoundcloud, FaBandcamp, FaTelegramPlane } from 'react-icons/fa';
import { SOCIAL_LINKS } from '../../utils/constants';
import './SocialLinks.css';

const SocialLinks = ({ className = '' }) => {
    return (
        <div className={`social-links ${className}`}>
            <a href={SOCIAL_LINKS.INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FaInstagram />
            </a>
            <a href={SOCIAL_LINKS.SOUNDCLOUD} target="_blank" rel="noopener noreferrer" aria-label="SoundCloud">
                <FaSoundcloud />
            </a>
            <a href={SOCIAL_LINKS.BANDCAMP} target="_blank" rel="noopener noreferrer" aria-label="Bandcamp">
                <FaBandcamp />
            </a>
            <a href={SOCIAL_LINKS.TELEGRAM} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <FaTelegramPlane />
            </a>
        </div>
    );
};

export default SocialLinks;
