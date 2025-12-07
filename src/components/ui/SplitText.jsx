import React from 'react';
import { motion } from 'framer-motion';

const SplitText = ({ children, className, delay = 0, duration = 0.05 }) => {
    const text = children || '';
    const characters = text.split('');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: duration,
                delayChildren: delay,
            },
        },
    };

    const charVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring',
                damping: 12,
                stiffness: 200,
            },
        },
    };

    return (
        <motion.div
            className={className}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'inline-block', overflow: 'hidden' }}
        >
            {characters.map((char, index) => (
                <motion.span
                    key={index}
                    variants={charVariants}
                    style={{ display: 'inline-block', whiteSpace: 'pre' }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.div>
    );
};

export default SplitText;
