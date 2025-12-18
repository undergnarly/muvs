import React from 'react';
import { FaInstagram, FaSoundcloud, FaBandcamp, FaTelegramPlane } from 'react-icons/fa';
import { useData } from '../../context/DataContext';
import './SocialLinks.css';

const SocialLinks = ({ className = '' }) => {
    const { siteSettings } = useData();
    const links = siteSettings?.socialLinks || {};

    return (
        <div className={`social-links ${className}`}>
            {links.instagram && (
                <a href={links.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <FaInstagram />
                </a>
            )}
            {links.soundcloud && (
                <a href={links.soundcloud} target="_blank" rel="noopener noreferrer" aria-label="SoundCloud">
                    <FaSoundcloud />
                </a>
            )}
            {links.bandcamp && (
                <a href={links.bandcamp} target="_blank" rel="noopener noreferrer" aria-label="Bandcamp">
                    <FaBandcamp />
                </a>
            )}
            {links.telegram && (
                <a href={links.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                    <FaTelegramPlane />
                </a>
            )}
        </div>
    );
};

export default SocialLinks;
