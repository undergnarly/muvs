import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipe } from '../../hooks/useSwipe';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import './SlideContainer.css';

const SlideContainer = ({ children, activeIndex, onChange }) => {
    const [direction, setDirection] = useState(0);

    const handleSwipeLeft = () => {
        if (activeIndex < React.Children.count(children) - 1) {
            setDirection(1);
            onChange(activeIndex + 1);
        }
    };

    const handleSwipeRight = () => {
        if (activeIndex > 0) {
            setDirection(-1);
            onChange(activeIndex - 1);
        }
    };

    const swipeHandlers = useSwipe({
        onSwipedLeft: handleSwipeLeft,
        onSwipedRight: handleSwipeRight,
    });

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            filter: 'blur(10px)',
            scale: 1 // Remove scale to prevent jitter
        }),
        center: {
            x: 0,
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            transition: {
                x: { type: "tween", ease: "easeInOut", duration: 0.5 }, // Linear movement
                opacity: { duration: 0.4, ease: "easeInOut" },
                filter: { duration: 0.4, ease: "easeInOut" }
            }
        },
        exit: (direction) => ({
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            filter: 'blur(10px)',
            scale: 1, // Remove scale to prevent jitter
            transition: {
                x: { type: "tween", ease: "easeInOut", duration: 0.5 }, // Linear movement
                opacity: { duration: 0.3, ease: "easeInOut" },
                filter: { duration: 0.3, ease: "easeInOut" }
            }
        })
    };

    return (
        <div className="slide-container" {...swipeHandlers}>
            {activeIndex > 0 && (
                <button className="nav-arrow left" onClick={handleSwipeRight}>
                    <BiChevronLeft size={32} />
                </button>
            )}

            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                    key={activeIndex}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="slide-wrapper"
                >
                    {React.Children.toArray(children)[activeIndex]}
                </motion.div>
            </AnimatePresence>

            {activeIndex < React.Children.count(children) - 1 && (
                <button className="nav-arrow right" onClick={handleSwipeLeft}>
                    <BiChevronRight size={32} />
                </button>
            )}
        </div>
    );
};

export default SlideContainer;
