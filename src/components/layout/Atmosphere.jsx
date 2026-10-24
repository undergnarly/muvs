import { useEffect, useRef } from 'react';
import { ATMOSPHERE_MOTES, observeAtmosphereMotion } from '../../utils/atmosphere';
import { createDustWind, impulseDustWind, observeDustGestures, resetDustWind, stepDustWind } from '../../utils/dustWind';
import GrainientBackground from './GrainientBackground';
import './Atmosphere.css';

const DUST_DEPTHS = [
    { name: 'far', windScale: 25 },
    { name: 'middle', windScale: 55 },
    { name: 'near', windScale: 100 },
];

const Mote = ({ mote }) => <span
    className={`muvs-dust muvs-dust--${mote.depth}${mote.desktop ? ' muvs-dust--desktop' : ''}`}
    style={{
        left: `${mote.x}%`, top: 0, width: mote.size, height: mote.size,
        '--dust-x': `${mote.dx}px`,
        '--dust-duration': `${mote.duration}s`, '--dust-delay': `${mote.delay}s`,
        '--dust-drift-duration': `${mote.duration * .24 + 5}s`,
    }}
><span className="muvs-dust-body" /></span>;

export default function Atmosphere({ variant = 'scene' }) {
    const back = useRef(null);
    const layers = useRef({});
    useEffect(() => {
        if (variant !== 'library') return undefined;
        const wind = createDustWind();
        const planes = DUST_DEPTHS.map((depth) => ({ ...depth, node: layers.current[depth.name] }));
        let mode = 'waiting';
        let frame = 0;
        let previousTime = 0;
        const stopWind = () => {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            previousTime = 0;
            resetDustWind(wind);
            for (const plane of planes) {
                if (!plane.node) continue;
                plane.node.style.transform = '';
                plane.node.style.willChange = '';
            }
        };
        const animateWind = (now) => {
            frame = 0;
            if (mode !== 'running') { stopWind(); return; }
            stepDustWind(wind, (now - previousTime) / 1000);
            previousTime = now;
            for (const plane of planes) {
                if (plane.node) plane.node.style.transform = `translate3d(${wind.x * plane.windScale}px, ${-wind.y * plane.windScale}px, 0)`;
            }
            if (Math.max(Math.abs(wind.x), Math.abs(wind.y), Math.abs(wind.vx), Math.abs(wind.vy)) < .0005) {
                stopWind();
                return;
            }
            frame = requestAnimationFrame(animateWind);
        };
        const stopMotion = observeAtmosphereMotion((nextMode) => {
            mode = nextMode;
            if (back.current) back.current.dataset.motion = mode;
            if (mode !== 'running') stopWind();
        });
        const stopGestures = observeDustGestures((x, y) => {
            if (mode !== 'running' || (!x && !y)) return;
            impulseDustWind(wind, x, y);
            if (frame) return;
            for (const plane of planes) if (plane.node) plane.node.style.willChange = 'transform';
            previousTime = performance.now();
            frame = requestAnimationFrame(animateWind);
        });
        return () => { stopGestures(); stopMotion(); stopWind(); };
    }, [variant]);

    return <div ref={back} className={`muvs-atmosphere muvs-atmosphere--${variant}`} data-motion={variant === 'library' ? 'waiting' : undefined} aria-hidden="true">
            <GrainientBackground />
            {variant === 'library' && DUST_DEPTHS.map((depth) => <div
                key={depth.name}
                ref={(node) => { layers.current[depth.name] = node; }}
                className={`muvs-dust-layer muvs-dust-layer--${depth.name}`}
            >{ATMOSPHERE_MOTES.filter((mote) => mote.depth === depth.name).map((mote, index) => <Mote key={index} mote={mote} />)}</div>)}
        </div>;
}
