/**
 * @file components/layout/CuteRoboticParticles.tsx
 * @description Performance-optimized HTML5 Canvas particle system.
 * Renders cute, floating robotic bubbles with glassmorphic glowing gradients,
 * cute pixelated face expressions, orbiting satellites, connecting cyber-lines,
 * and soft mouse repulsion.
 */

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowColor: string;
  opacity: number;
  faceType: 'happy' | 'neutral' | 'tech-plus' | 'brackets' | 'none';
  blinkTimer: number;
  isBlinking: boolean;
  hasOrbit: boolean;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  orbitColor: string;
  pulseTimer: number;
}

export const CuteRoboticParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Colors matching the robotic/cyber theme
    const PALETTE = [
      { color: '#06b6d4', glow: 'rgba(6,182,212,0.4)', orbit: '#22d3ee' }, // Cyan
      { color: '#818cf8', glow: 'rgba(129,140,248,0.4)', orbit: '#a5b4fc' }, // Violet
      { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', orbit: '#c084fc' }, // Purple
      { color: '#f472b6', glow: 'rgba(244,114,182,0.4)', orbit: '#f472b6' }, // Cute Pink
    ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 38000), 45);
      particles = [];

      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 12 + 8; // Bubbles are big enough to display cute details
        const theme = PALETTE[Math.floor(Math.random() * PALETTE.length)];

        // Assign a cute robotic face to bubbles larger than a certain size
        let faceType: Particle['faceType'] = 'none';
        if (radius > 12) {
          const faces: Particle['faceType'][] = ['happy', 'neutral', 'tech-plus', 'brackets'];
          faceType = faces[Math.floor(Math.random() * faces.length)];
        }

        const hasOrbit = radius > 14 && Math.random() > 0.4;

        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.1, // Drifts slightly upwards
          radius,
          baseRadius: radius,
          color: theme.color,
          glowColor: theme.glow,
          opacity: Math.random() * 0.4 + 0.35,
          faceType,
          blinkTimer: Math.random() * 200 + 100,
          isBlinking: false,
          hasOrbit,
          orbitRadius: radius * (1.4 + Math.random() * 0.4),
          orbitAngle: Math.random() * Math.PI * 2,
          orbitSpeed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
          orbitColor: theme.orbit,
          pulseTimer: Math.random() * Math.PI * 2,
        });
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ─── 1. Render proximity cyber-links first (background layer) ───
      ctx.lineWidth = 0.65;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            // Neon connection lines fade as particles get further apart
            const linkOpacity = (1 - dist / 140) * 0.08;
            ctx.strokeStyle = particles[i].color;
            ctx.globalAlpha = linkOpacity;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      // ─── 2. Update and render particles ───
      particles.forEach((p) => {
        // Drifting movement
        p.x += p.vx;
        p.y += p.vy;

        // Bending boundaries smoothly (teleport to other side with padding)
        const margin = p.radius + (p.hasOrbit ? p.orbitRadius : 0);
        if (p.x < -margin) p.x = canvas.width + margin;
        if (p.x > canvas.width + margin) p.x = -margin;
        if (p.y < -margin) p.y = canvas.height + margin;
        if (p.y > canvas.height + margin) p.y = -margin;

        // Interactive mouse repulsion
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const forceRadius = 160;

          if (dist < forceRadius) {
            // Push away force based on closeness
            const force = (forceRadius - dist) / forceRadius;
            const angle = Math.atan2(dy, dx);
            const targetX = p.x + Math.cos(angle) * force * 4.5;
            const targetY = p.y + Math.sin(angle) * force * 4.5;

            // Smooth interpolation towards pushed coordinates
            p.x += (targetX - p.x) * 0.15;
            p.y += (targetY - p.y) * 0.15;
          }
        }

        // Bouncing orbit angle update
        p.orbitAngle += p.orbitSpeed;
        p.pulseTimer += 0.02;

        // Handle eye blinking timer
        p.blinkTimer--;
        if (p.blinkTimer <= 0) {
          if (p.isBlinking) {
            p.isBlinking = false;
            p.blinkTimer = Math.random() * 260 + 120; // Time until next blink
          } else {
            p.isBlinking = true;
            p.blinkTimer = 10; // Blink duration in frames
          }
        }

        // Pulse the core radius slightly for standard breathing effect
        const breathScale = 1 + Math.sin(p.pulseTimer) * 0.045;
        const currentRadius = p.radius * breathScale;

        // Draw bubble orbit path trace
        if (p.hasOrbit) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.orbitRadius, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = 0.035;
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Draw orbiting droid/satellite
          const satX = p.x + Math.cos(p.orbitAngle) * p.orbitRadius;
          const satY = p.y + Math.sin(p.orbitAngle) * p.orbitRadius;

          ctx.beginPath();
          ctx.arc(satX, satY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.orbitColor;
          ctx.globalAlpha = p.opacity * 1.15;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.orbitColor;
          ctx.fill();
          ctx.shadowBlur = 0; // Reset shadow
        }

        // Draw main bubble glass core
        ctx.save();
        ctx.translate(p.x, p.y);

        // Glass center fill gradient
        const radialGrad = ctx.createRadialGradient(
          -currentRadius * 0.3,
          -currentRadius * 0.3,
          0,
          0,
          0,
          currentRadius
        );
        radialGrad.addColorStop(0, `${p.color}15`); // Soft interior glow
        radialGrad.addColorStop(0.85, `${p.color}05`);
        radialGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // Neon outline
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = p.opacity * 0.7;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Subtle inner rim reflection/highlight (cute glass effect)
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 0.8, Math.PI * 1.2, Math.PI * 1.7);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Render cute robotic face glyphs
        if (p.faceType !== 'none') {
          ctx.globalAlpha = p.opacity * 0.88;
          ctx.fillStyle = p.color;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;

          const eyeHeight = p.isBlinking ? 0.3 : 1.8; // Blinking scale factor
          const eyeOffsetY = -1.2;

          if (p.faceType === 'happy') {
            // Left eye
            ctx.beginPath();
            ctx.ellipse(-3.2, eyeOffsetY, 1.1, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();

            // Right eye
            ctx.beginPath();
            ctx.ellipse(3.2, eyeOffsetY, 1.1, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();

            // Happy mouth (arc)
            ctx.beginPath();
            ctx.arc(0, 1.0, 2.5, 0.1, Math.PI - 0.1);
            ctx.stroke();
          } else if (p.faceType === 'neutral') {
            // Left eye
            ctx.beginPath();
            ctx.ellipse(-3.0, eyeOffsetY, 1.0, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();

            // Right eye
            ctx.beginPath();
            ctx.ellipse(3.0, eyeOffsetY, 1.0, eyeHeight, 0, 0, Math.PI * 2);
            ctx.fill();

            // Neutral flat mouth line
            ctx.beginPath();
            ctx.moveTo(-2, 1.2);
            ctx.lineTo(2, 1.2);
            ctx.stroke();
          } else if (p.faceType === 'tech-plus') {
            // Draw a cute '+' core symbol
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.lineTo(3, 0);
            ctx.moveTo(0, -3);
            ctx.lineTo(0, 3);
            ctx.stroke();
          } else if (p.faceType === 'brackets') {
            // Draw cute micro `{}` tags
            ctx.font = '700 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('{}', 0, 0);
          }
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.8,
      }}
    />
  );
};
