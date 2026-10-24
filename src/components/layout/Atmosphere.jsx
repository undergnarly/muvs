import { useEffect, useRef } from 'react';
import { ATMOSPHERE_MOTES, observeAtmosphereMotion } from '../../utils/atmosphere';
import './Atmosphere.css';

const Mote = ({ mote }) => <span
    className={`muvs-dust muvs-dust--${mote.depth}${mote.desktop ? ' muvs-dust--desktop' : ''}`}
    style={{
        left: `${mote.x}%`, top: `${mote.y}%`, width: mote.size, height: mote.size,
        '--dust-x': `${mote.dx}px`, '--dust-y': `${mote.dy}px`,
        '--dust-duration': `${mote.duration}s`, '--dust-delay': `${mote.delay}s`,
    }}
/>;

export default function Atmosphere({ variant = 'scene', className = '', paused = false }) {
    const back = useRef(null);
    const front = useRef(null);
    useEffect(() => observeAtmosphereMotion((mode) => {
        for (const layer of [back.current, front.current]) {
            if (layer) layer.dataset.motion = mode;
        }
    }, { paused }), [paused]);

    return <>
        <div ref={back} className={`muvs-atmosphere muvs-atmosphere--back muvs-atmosphere--${variant} ${className}`} data-motion="waiting" aria-hidden="true">
            <div className="muvs-grain" />
            {ATMOSPHERE_MOTES.filter((mote) => mote.depth !== 'near').map((mote, index) => <Mote key={index} mote={mote} />)}
        </div>
        <div ref={front} className={`muvs-atmosphere muvs-atmosphere--front muvs-atmosphere--${variant}${paused ? ' is-muted' : ''}`} data-motion="waiting" aria-hidden="true">
            {ATMOSPHERE_MOTES.filter((mote) => mote.depth === 'near').map((mote, index) => <Mote key={index} mote={mote} />)}
        </div>
    </>;
}
