import { useSwipeable } from 'react-swipeable';

export const useSwipe = ({ onSwipedLeft, onSwipedRight, onSwipedUp, onSwipedDown }) => {
    const handlers = useSwipeable({
        onSwipedLeft,
        onSwipedRight,
        onSwipedUp,
        onSwipedDown,
        swipeDuration: 500,
        preventScrollOnSwipe: false, // We handle preventing scroll manually if needed
        trackMouse: true
    });

    return handlers;
};
