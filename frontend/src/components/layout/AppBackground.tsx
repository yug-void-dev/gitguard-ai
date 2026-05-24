import React from 'react';
import { motion } from 'framer-motion';
import { NeuralBG, FloatingParticles } from '../dashboard/NeuralBackground';

export const AppBackground: React.FC = () => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <NeuralBG />
      <FloatingParticles />
      {[
        { c: 'rgba(6,182,212,0.06)', s: 480, t: '-5%', l: '-5%' },
        { c: 'rgba(129,140,248,0.05)', s: 400, t: '55%', l: '62%' },
        { c: 'rgba(16,185,129,0.04)', s: 340, t: '78%', l: '22%' },
      ].map((b, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.1, 0.92, 1] }}
          transition={{ duration: 20, repeat: Infinity, delay: i * 6 }}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            width: b.s,
            height: b.s,
            top: b.t,
            left: b.l,
            background: `radial-gradient(circle,${b.c},transparent 70%)`,
            filter: 'blur(65px)',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(6,182,212,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,0.022) 1px,transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
};
