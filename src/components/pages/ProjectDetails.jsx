import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Button from '../ui/Button';
import TechTag from '../ui/TechTag';
import CircularGallery from '../media/CircularGallery';
import NavigationFooter from '../layout/NavigationFooter';
import { FaGithub, FaExternalLinkAlt } from 'react-icons/fa';
import { sanitizeUrl } from '../../utils/linkHelpers';
import { fixLinks } from '../../utils/linkUtils';
import './ProjectDetails.css';

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

const ProjectDetails = ({ project, allProjects, onNavigate }) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.3 });

    useEffect(() => {
        if (isInView) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isInView]);

    console.log('[ProjectDetails] Rendered', {
        isVisible,
        isInView,
        title: project?.title
    });

    return (
        <motion.div
            ref={ref}
            className="project-details-container"
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
        >