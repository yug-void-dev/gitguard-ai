import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

const T = {
  cyan: '#06b6d4',
  violet: '#818cf8',
};

// ─── Three.js Neural BG ───────────────────────────────────────────────────────
export function NeuralBG() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(
      60,
      el.clientWidth / el.clientHeight,
      0.1,
      100
    );
    cam.position.z = 9;
    const geo = new THREE.SphereGeometry(0.032, 6, 6);
    const nodes: THREE.Mesh[] = [];
    const pos: THREE.Vector3[] = [];
    for (let i = 0; i < 55; i++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0x06b6d4 : 0x818cf8,
          transparent: true,
          opacity: 0.55,
        })
      );
      const p = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 5
      );
      mesh.position.copy(p);
      pos.push(p);
      scene.add(mesh);
      nodes.push(mesh);
    }
    const lp: THREE.Vector3[] = [];
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++)
        if (pos[i].distanceTo(pos[j]) < 3.8)
          lp.push(pos[i].clone(), pos[j].clone());
    scene.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(lp),
        new THREE.LineBasicMaterial({
          color: 0x818cf8,
          transparent: true,
          opacity: 0.05,
        })
      )
    );
    let mx = 0,
      my = 0;
    const onM = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 0.04;
      my = (e.clientY / window.innerHeight - 0.5) * 0.04;
    };
    window.addEventListener('mousemove', onM);
    let t = 0,
      raf: number;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.003;
      nodes.forEach((n, i) => {
        n.position.y += Math.sin(t + i * 0.4) * 0.0014;
        n.position.x += Math.cos(t + i * 0.25) * 0.001;
      });
      scene.rotation.y = Math.sin(t * 0.08) * 0.04 + mx;
      scene.rotation.x = Math.cos(t * 0.06) * 0.02 - my;
      renderer.render(scene, cam);
    };
    draw();
    const onR = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      cam.aspect = el.clientWidth / el.clientHeight;
      cam.updateProjectionMatrix();
    };
    window.addEventListener('resize', onR);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onM);
      window.removeEventListener('resize', onR);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0.85,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─── Floating Particles ───────────────────────────────────────────────────────
export function FloatingParticles() {
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 30 + 30,
    delay: Math.random() * -30,
  }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          animate={{
            y: [`${p.y}vh`, `${p.y - 30}vh`],
            x: [`${p.x}vw`, `${p.x + (Math.random() * 10 - 5)}vw`],
            opacity: [0, 0.8, 0]
          }}
          transition={{ duration: p.duration, repeat: Infinity, ease: 'linear', delay: p.delay }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: Math.random() > 0.5 ? T.cyan : T.violet,
            filter: 'blur(1px)'
          }}
        />
      ))}
    </div>
  );
}
