import { useEffect, useRef } from 'react';
import { ATMOSPHERE_MOTES, observeAtmosphereMotion } from '../../utils/atmosphere';
import GrainientBackground from './GrainientBackground';
import './Atmosphere.css';

const Mote = ({ mote }) => <span
    className={`muvs-dust muvs-dust--${mote.depth}${mote.desktop ? ' muvs-dust--desktop' : ''}`}
    style={{
        left: `${mote.x}%`, top: 0, width: mote.size, height: mote.size,
        '--dust-x': `${mote.dx}px`,
        '--dust-duration': `${mote.duration}s`, '--dust-delay': `${mote.delay}s`,
    }}
/>;

export default function Atmosphere({ variant = 'scene' }) {
    const back = useRef(null);
    useEffect(() => {
        if (variant !== 'library') return undefined;
        return observeAtmosphereMotion((mode) => {
            if (back.current) back.current.dataset.motion = mode;
        });
    }, [variant]);

    return <div ref={back} className={`muvs-atmosphere muvs-atmosphere--${variant}`} data-motion={variant === 'library' ? 'waiting' : undefined} aria-hidden="true">
            <GrainientBackground />
            {variant === 'library' && ATMOSPHERE_MOTES.map((mote, index) => <Mote key={index} mote={mote} />)}
        </div>;
}
