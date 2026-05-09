import { useEffect, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * Full-screen animated particle canvas used as a background effect.
 * Uses the @tsparticles v3 API: engine is initialized once via initParticlesEngine,
 * then Particles renders only after the engine is ready.
 *
 * Placed in components/common/ because it is a reusable, domain-agnostic UI utility.
 */
const ParticleBackground = () => {
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setEngineReady(true);
    });
  }, []);

  if (!engineReady) return null;

  return (
    <Particles
      id="tsparticles"
      className="absolute inset-0 -z-10"
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 120,
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' },
            resize: { delay: 0.5, enable: true },
          },
          modes: { repulse: { distance: 100, duration: 0.4 } },
        },
        particles: {
          color: { value: ['#8b5cf6', '#06b6d4'] },
          links: {
            color: '#4b5563',
            distance: 150,
            enable: true,
            opacity: 0.3,
            width: 1,
          },
          move: {
            direction: 'none',
            enable: true,
            outModes: { default: 'bounce' },
            random: false,
            speed: 1,
            straight: false,
          },
          number: { density: { enable: true }, value: 60 },
          opacity: { value: 0.5 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 3 } },
        },
        detectRetina: true,
      }}
    />
  );
};

export default ParticleBackground;
