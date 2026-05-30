import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type React from 'react';
import { useNavigate } from 'react-router-dom';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import * as THREE from 'three';
import { useAuth } from '../hooks/useAuth';
import { Shield, Mail, Lock, User, Zap, Eye, EyeOff, ArrowLeft, KeyRound, ShieldCheck, MailOpen } from 'lucide-react';
import { authService } from '../services/auth.service';



// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  login: string;
  email: string;
  password: string;
  confirmPassword: string;
  rememberMe: boolean;
}

type Tab = 'login' | 'register';

// ─── Three.js 3D Sentinel ──────────────────────────────────────────────────────

const SentinelGraphic: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    const W = mount.clientWidth,
      H = mount.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.set(0, 0, 5.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ── Materials ──────────────────────────────────────────────────────────────

    const makeLineMat = (color: number, opacity = 0.7) =>
      new THREE.LineBasicMaterial({ color, transparent: true, opacity });

    const indigo = 0x6366f1;
    const cyan = 0x22d3ee;
    const violet = 0xa78bfa;

    // ── Shield Core ────────────────────────────────────────────────────────────

    const shieldGroup = new THREE.Group();
    scene.add(shieldGroup);

    // Shield wireframe mesh
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 1.4);
    shieldShape.lineTo(1.1, 0.7);
    shieldShape.lineTo(1.1, -0.15);
    shieldShape.quadraticCurveTo(1.1, -1.5, 0, -1.8);
    shieldShape.quadraticCurveTo(-1.1, -1.5, -1.1, -0.15);
    shieldShape.lineTo(-1.1, 0.7);
    shieldShape.closePath();

    const shieldGeo = new THREE.ShapeGeometry(shieldShape, 32);
    const shieldEdges = new THREE.EdgesGeometry(shieldGeo);

    // Front face
    const shieldLineFront = new THREE.LineSegments(
      shieldEdges,
      new THREE.LineBasicMaterial({
        color: indigo,
        transparent: true,
        opacity: 0.9,
      })
    );
    shieldLineFront.position.z = 0.22;
    shieldGroup.add(shieldLineFront);

    // Back face
    const shieldLineBack = new THREE.LineSegments(
      shieldEdges,
      new THREE.LineBasicMaterial({
        color: cyan,
        transparent: true,
        opacity: 0.35,
      })
    );
    shieldLineBack.position.z = -0.22;
    shieldGroup.add(shieldLineBack);

    // Side connecting lines (extruded edges effect)
    const shieldPts = [
      new THREE.Vector3(0, 1.4, 0),
      new THREE.Vector3(1.1, 0.7, 0),
      new THREE.Vector3(1.1, -0.15, 0),
      new THREE.Vector3(0.85, -1.0, 0),
      new THREE.Vector3(0, -1.8, 0),
      new THREE.Vector3(-0.85, -1.0, 0),
      new THREE.Vector3(-1.1, -0.15, 0),
      new THREE.Vector3(-1.1, 0.7, 0),
    ];
    shieldPts.forEach((pt) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pt.x, pt.y, -0.22),
        new THREE.Vector3(pt.x, pt.y, 0.22),
      ]);
      shieldGroup.add(new THREE.Line(geo, makeLineMat(violet, 0.4)));
    });

    // Glowing inner fill (mesh)
    const shieldMesh = new THREE.Mesh(
      shieldGeo,
      new THREE.MeshBasicMaterial({
        color: indigo,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
      })
    );
    shieldGroup.add(shieldMesh);

    // Checkmark
    const checkPts = [
      new THREE.Vector3(-0.42, -0.05, 0.25),
      new THREE.Vector3(-0.08, -0.42, 0.25),
      new THREE.Vector3(0.52, 0.38, 0.25),
    ];
    const checkGeo = new THREE.BufferGeometry().setFromPoints(checkPts);
    const checkLine = new THREE.Line(
      checkGeo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        linewidth: 2,
      })
    );
    shieldGroup.add(checkLine);

    // ── Orbiting Rings ─────────────────────────────────────────────────────────

    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    interface RingCfg {
      radius: number;
      tilt: { x: number; y: number };
      color: number;
      speed: number;
      nodes: number;
    }
    const rings: RingCfg[] = [
      {
        radius: 2.2,
        tilt: { x: 0.4, y: 0.1 },
        color: indigo,
        speed: 0.28,
        nodes: 6,
      },
      {
        radius: 2.85,
        tilt: { x: -0.25, y: 0.5 },
        color: cyan,
        speed: -0.18,
        nodes: 8,
      },
      {
        radius: 3.4,
        tilt: { x: 0.6, y: -0.3 },
        color: violet,
        speed: 0.12,
        nodes: 5,
      },
    ];

    const ringMeshes: THREE.Group[] = [];

    rings.forEach((cfg) => {
      const g = new THREE.Group();
      g.rotation.x = cfg.tilt.x;
      g.rotation.y = cfg.tilt.y;
      ringGroup.add(g);

      // Circle track
      const trackGeo = new THREE.BufferGeometry();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * cfg.radius,
            Math.sin(a) * cfg.radius,
            0
          )
        );
      }
      trackGeo.setFromPoints(pts);
      g.add(new THREE.Line(trackGeo, makeLineMat(cfg.color, 0.12)));

      // Node spheres
      for (let i = 0; i < cfg.nodes; i++) {
        const a = (i / cfg.nodes) * Math.PI * 2;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 8, 8),
          new THREE.MeshBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: 0.85,
          })
        );
        sphere.position.set(
          Math.cos(a) * cfg.radius,
          Math.sin(a) * cfg.radius,
          0
        );
        g.add(sphere);
      }

      // Highlight arc segment
      const arcPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * 0.65;
        arcPts.push(
          new THREE.Vector3(
            Math.cos(a) * cfg.radius,
            Math.sin(a) * cfg.radius,
            0
          )
        );
      }
      const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
      g.add(
        new THREE.Line(
          arcGeo,
          new THREE.LineBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: 0.9,
          })
        )
      );

      ringMeshes.push(g);
    });

    // ── Particle Field ──────────────────────────────────────────────────────────

    const particleCount = 320;
    const positions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const palette = [
      [0.39, 0.4, 0.95],
      [0.13, 0.83, 0.93],
      [0.66, 0.55, 0.98],
    ];
    for (let i = 0; i < particleCount; i++) {
      const r = 2.5 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = palette[Math.floor(Math.random() * palette.length)];
      pColors[i * 3] = c[0];
      pColors[i * 3 + 1] = c[1];
      pColors[i * 3 + 2] = c[2];
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Radar sweep plane ───────────────────────────────────────────────────────

    const radarGeo = new THREE.CircleGeometry(2.0, 32, 0, 0.6);
    const radarMat = new THREE.MeshBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const radar = new THREE.Mesh(radarGeo, radarMat);
    scene.add(radar);

    // ── Data stream lines ───────────────────────────────────────────────────────

    const streams: {
      line: THREE.Line;
      progress: number;
      speed: number;
      angle: number;
    }[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({
          color: indigo,
          transparent: true,
          opacity: 0.5,
        })
      );
      scene.add(line);
      streams.push({
        line,
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.006,
        angle,
      });
    }

    // ── Ambient light glow (sprite) ────────────────────────────────────────────

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    const gc = glowCanvas.getContext('2d')!;
    const grd = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(99,102,241,0.45)');
    grd.addColorStop(0.5, 'rgba(99,102,241,0.1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    gc.fillStyle = grd;
    gc.fillRect(0, 0, 128, 128);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    glow.scale.set(5, 5, 1);
    scene.add(glow);

    // ── Mouse interaction ──────────────────────────────────────────────────────

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x =
        ((e.touches[0].clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y =
        -((e.touches[0].clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener('mousemove', onMouseMove);
    mount.addEventListener('touchmove', onTouchMove, { passive: true });

    // ── Resize handler ─────────────────────────────────────────────────────────

    const onResize = () => {
      const w = mount.clientWidth,
        h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── Animation loop ─────────────────────────────────────────────────────────

    let raf: number;
    let t = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.016;

      // Smooth mouse follow
      targetRotRef.current.x +=
        (mouseRef.current.y * 0.35 - targetRotRef.current.x) * 0.06;
      targetRotRef.current.y +=
        (mouseRef.current.x * 0.5 - targetRotRef.current.y) * 0.06;

      // Shield pulse + mouse tilt
      shieldGroup.rotation.x = targetRotRef.current.x * 0.6;
      shieldGroup.rotation.y =
        targetRotRef.current.y * 0.6 + Math.sin(t * 0.4) * 0.06;
      const pulse = 1 + Math.sin(t * 1.8) * 0.025;
      shieldGroup.scale.setScalar(pulse);

      // Check opacity pulse
      (checkLine.material as THREE.LineBasicMaterial).opacity =
        0.7 + 0.3 * Math.sin(t * 2.2);

      // Ring rotation + mouse
      ringMeshes.forEach((g, i) => {
        g.rotation.z += rings[i].speed * 0.016;
        g.rotation.x =
          rings[i].tilt.x + targetRotRef.current.x * (0.3 + i * 0.12);
        g.rotation.y =
          rings[i].tilt.y + targetRotRef.current.y * (0.3 + i * 0.12);
      });

      // Ring group slow drift
      ringGroup.rotation.y = targetRotRef.current.y * 0.4;
      ringGroup.rotation.x = targetRotRef.current.x * 0.3;

      // Radar sweep
      radar.rotation.z = t * 0.6;
      radar.rotation.x = targetRotRef.current.x * 0.5;
      radar.rotation.y = targetRotRef.current.y * 0.5;

      // Streams
      streams.forEach((s) => {
        s.progress += s.speed;
        if (s.progress > 1) s.progress = 0;
        const sr = 1.4,
          er = sr + 1.3;
        const cur = sr + (er - sr) * s.progress;
        const pts = [
          new THREE.Vector3(Math.cos(s.angle) * sr, Math.sin(s.angle) * sr, 0),
          new THREE.Vector3(
            Math.cos(s.angle) * cur,
            Math.sin(s.angle) * cur,
            0
          ),
        ];
        s.line.geometry.setFromPoints(pts);
        (s.line.material as THREE.LineBasicMaterial).opacity =
          0.3 + 0.4 * s.progress;
      });

      // Glow breathe
      glow.material.opacity = 0.4 + 0.25 * Math.sin(t * 1.2);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('mousemove', onMouseMove);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { user, login, register, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    login: localStorage.getItem('gg_remembered_login') || '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: !!localStorage.getItem('gg_remembered_login'),
  });

  // Forgot password states
  const [forgotStep, setForgotStep] = useState<'none' | 'email' | 'otp' | 'reset'>('none');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await authService.forgotPassword(forgotEmail);
      if (data.success) {
        setSuccess(data.message);
        if (data.previewUrl) {
          console.log('Dev Ethereal Email Preview:', data.previewUrl);
          // Show the link directly in dev environment for easy verification
          setSuccess(`OTP sent! Developer Preview URL: ${data.previewUrl}`);
        }
        setForgotStep('otp');
        setCooldown(60);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await authService.verifyOtp(forgotEmail, forgotOtp);
      if (data.success) {
        setSuccess('OTP verified successfully. Please enter your new password.');
        setForgotStep('reset');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await authService.resetPassword(forgotEmail, forgotOtp, newPassword);
      if (data.success) {
        setSuccess('Password reset successfully! You can now log in.');
        setForgotStep('none');
        setTab('login');
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setError(null);
    setSuccess(null);
    try {
      const data = await authService.forgotPassword(forgotEmail);
      if (data.success) {
        setSuccess('A new OTP has been sent to your email.');
        if (data.previewUrl) {
          console.log('Dev Ethereal Email Preview:', data.previewUrl);
          setSuccess(`New OTP sent! Developer Preview URL: ${data.previewUrl}`);
        }
        setCooldown(60);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to resend OTP');
    }
  };

  useEffect(() => {
    if (user && !authLoading) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const particlesOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      interactivity: {
        events: { onHover: { enable: true, mode: 'grab' } },
        modes: { grab: { distance: 120, links: { opacity: 0.3 } } },
      },
      particles: {
        color: { value: '#6366f1' },
        links: { color: '#6366f1', distance: 130, enable: true, opacity: 0.12, width: 1 },
        move: { enable: true, outModes: { default: 'bounce' as const }, random: true, speed: 0.7 },
        number: { density: { enable: true }, value: 55 },
        opacity: { value: 0.22 },
        shape: { type: 'circle' },
        size: { value: { min: 1, max: 2.5 } },
      },
      detectRetina: true,
    }),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (tab === 'login') {
        await login({ login: formData.login, password: formData.password });
        formData.rememberMe
          ? localStorage.setItem('gg_remembered_login', formData.login)
          : localStorage.removeItem('gg_remembered_login');
        
        navigate('/dashboard');
      } else {
        if (formData.password !== formData.confirmPassword)
          throw new Error("Passwords don't match");
        if (formData.password.length < 8)
          throw new Error('Password must be at least 8 characters');
        
        await register({
          login: formData.login,
          email: formData.email,
          password: formData.password,
        });

        // Switch back to the login tab so the user can manually authenticate
        setTab('login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    window.location.href = `${baseUrl}/auth/github`;
  };

  return (
    <>
      <div className="gg-root">
        {/* ── LEFT ── */}
        <div className="gg-left hidden md:flex">
          <SentinelGraphic />
          <div className="gg-left-veil" />
          <div className="gg-left-edge" />
          <div className="gg-left-body">
            <div className="gg-brand">
              <div className="gg-brand-ico">
                <Shield size={20} strokeWidth={2.5} color="white" />
              </div>
              <span className="gg-brand-name">GitGuard AI</span>
            </div>

            <div className="gg-hero">
              <h2>Your Automated<br /><em>PR Sentinel</em><br />Never Sleeps.</h2>
              <p>AI-powered code review that catches bugs,<br />vulnerabilities &amp; bad patterns<br />before they reach production.</p>
            </div>

            <div className="gg-bottom">
              <div className="gg-grid">
                <div className="gg-stat">
                  <span className="gg-stat-v" style={{ color: '#818cf8' }}>1,248</span>
                  <span className="gg-stat-l">PRs Analyzed</span>
                </div>
                <div className="gg-stat">
                  <span className="gg-stat-v" style={{ color: '#22d3ee' }}>4.3k</span>
                  <span className="gg-stat-l">Bugs Caught</span>
                </div>
                <div className="gg-stat">
                  <span className="gg-stat-v" style={{ color: '#f59e0b' }}>0.9s</span>
                  <span className="gg-stat-l">Avg Review</span>
                </div>
                <div className="gg-stat">
                  <span className="gg-stat-v" style={{ color: '#22c55e' }}>98.4%</span>
                  <span className="gg-stat-l">Security Score</span>
                </div>
              </div>
              <div className="gg-live">
                <div className="gg-dot" />
                <span>Sentinel active · Monitoring 47 repositories</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT (NEW FORM SECTION) ── */}
        <div className="flex-1 w-full md:w-1/2 flex items-center justify-center p-6 md:p-8 bg-[#0a0b1e]/95 backdrop-blur-md relative overflow-y-auto border-l border-indigo-500/20">
          {init && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <Particles id="tsparticles" options={particlesOptions} />
            </div>
          )}

          <div className="w-full max-w-[480px] relative z-10 animate-[formSlideIn_1s_ease-out_0.5s_backwards] flex flex-col items-center">
            
            <div className="text-center" style={{ marginBottom: '3rem' }}>
              <Shield size={44} strokeWidth={2.5} className="form-icon mx-auto" />
            </div>

            {forgotStep === 'none' && (
              <div className="view-switcher w-full max-w-[380px]" style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className={`switch-btn ${tab === 'login' ? 'active' : ''}`}
                  onClick={() => setTab('login')}
                >
                  <span>LOGIN</span>
                </button>
                <button
                  type="button"
                  className={`switch-btn ${tab === 'register' ? 'active' : ''}`}
                  onClick={() => setTab('register')}
                >
                  <span>REGISTER</span>
                </button>
                <div className={`slider ${tab === 'register' ? 'slide-right' : ''}`}></div>
              </div>
            )}

            <div className="w-full min-h-[400px]">
              {forgotStep === 'none' ? (
                <>
                  {tab === 'login' && (
                    <div className="flex flex-col gap-5 w-full animate-[titleFadeIn_0.6s_ease-out]">
                      <div className="text-center mb-2">
                        <h2 className="font-['Inter'] font-extrabold text-2xl tracking-wide text-white mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                          WELCOME BACK
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide">
                          Enter your credentials to access the sentinel
                        </p>
                      </div>

                      {error && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                          {error}
                        </div>
                      )}

                      {success && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
                          {success}
                        </div>
                      )}

                      <div className="w-full flex">
                        <button type="button" onClick={handleGitHub} className="flex-1 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer text-slate-200 font-['Inter'] font-semibold text-[1.05rem] transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:text-white" style={{ padding: '1.2rem 2rem', minHeight: '56px', width: '100%' }}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                          Continue with GitHub
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 my-2 w-full">
                        <div className="flex-1 h-px bg-indigo-500/20" />
                        <span className="font-['Fira_Code'] text-[0.65rem] tracking-wider text-slate-400/50 uppercase">or with email</span>
                        <div className="flex-1 h-px bg-indigo-500/20" />
                      </div>

                      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                        <div className="input-wrapper">
                          <div className="input-icon">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="USERNAME OR EMAIL"
                            className="gym-input"
                            name="login"
                            value={formData.login}
                            onChange={handleChange}
                            required
                          />
                          <div className="input-line"></div>
                        </div>

                        <div className="input-wrapper">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="PASSWORD"
                            className="gym-input gym-input--password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <div className="input-line"></div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <label className="remember-checkbox">
                            <input 
                              type="checkbox" 
                              name="rememberMe"
                              checked={formData.rememberMe}
                              onChange={handleChange} 
                            />
                            <span className="checkmark"></span>
                            <span className="label-text">Remember Me</span>
                          </label>
                          <button
                            type="button"
                            className="forgot-link"
                            onClick={() => {
                              setForgotStep('email');
                              setError(null);
                              setSuccess(null);
                            }}
                          >
                            Forgot Password?
                          </button>
                        </div>

                        <button className="submit-btn" type="submit" disabled={loading}>
                          {loading ? (
                            <div className="gg-spin" />
                          ) : (
                            <>
                              <span className="btn-text">ENTER THE SENTINEL</span>
                              <Zap size={18} className="btn-icon" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {tab === 'register' && (
                    <div className="flex flex-col gap-5 w-full animate-[titleFadeIn_0.6s_ease-out]">
                      <div className="text-center mb-2">
                        <h2 className="font-['Inter'] font-extrabold text-2xl tracking-wide text-white mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                          JOIN THE LEGION
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide">
                          Start your code protection journey today
                        </p>
                      </div>

                      {error && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                          {error}
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
                        
                        <div className="input-wrapper">
                          <div className="input-icon">
                            <User size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="GITHUB USERNAME"
                            className="gym-input"
                            name="login"
                            value={formData.login}
                            onChange={handleChange}
                            required
                          />
                          <div className="input-line"></div>
                        </div>

                        <div className="input-wrapper">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            placeholder="EMAIL ADDRESS"
                            className="gym-input"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                          />
                          <div className="input-line"></div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                          <div className="input-wrapper flex-1">
                            <div className="input-icon">
                              <Lock size={18} />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="PASSWORD"
                              className="gym-input gym-input--password"
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              onClick={() => setShowPassword((v) => !v)}
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <div className="input-line"></div>
                          </div>

                          <div className="input-wrapper flex-1">
                            <div className="input-icon">
                              <Lock size={18} />
                            </div>
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="CONFIRM"
                              className="gym-input gym-input--password"
                              name="confirmPassword"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              required
                            />
                            <button
                              type="button"
                              className="password-toggle-btn"
                              onClick={() => setShowConfirmPassword((v) => !v)}
                            >
                              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <div className="input-line"></div>
                          </div>
                        </div>

                        <div className="flex mt-2">
                          <label className="remember-checkbox">
                            <input type="checkbox" required />
                            <span className="checkmark"></span>
                            <span className="label-text">
                              I agree to Terms & Conditions
                            </span>
                          </label>
                        </div>

                        <button className="submit-btn" type="submit" disabled={loading}>
                           {loading ? (
                            <div className="gg-spin" />
                          ) : (
                            <>
                              <span className="btn-text">JOIN GITGUARD</span>
                              <Shield size={18} className="btn-icon" />
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-5 w-full animate-[titleFadeIn_0.6s_ease-out]">
                  {forgotStep === 'email' && (
                    <div className="flex flex-col gap-5 w-full">
                      <div className="text-center mb-2">
                        <h2 className="font-['Inter'] font-extrabold text-2xl tracking-wide text-white mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                          FORGOT PASSWORD
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide">
                          Enter your email to receive an OTP verification code
                        </p>
                      </div>

                      {error && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                          {error}
                        </div>
                      )}

                      {success && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
                          {success.includes('Developer Preview URL:') ? (
                            <>
                              <div>{success.split('Developer Preview URL:')[0]}</div>
                              <a
                                href={success.split('Developer Preview URL:')[1].trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 underline mt-1 inline-block hover:text-cyan-300"
                              >
                                Open Ethereal Mailbox
                              </a>
                            </>
                          ) : (
                            success
                          )}
                        </div>
                      )}

                      <form onSubmit={handleRequestOtp} className="flex flex-col gap-5 w-full">
                        <div className="input-wrapper">
                          <div className="input-icon">
                            <Mail size={18} />
                          </div>
                          <input
                            type="email"
                            placeholder="EMAIL ADDRESS"
                            className="gym-input"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                          />
                          <div className="input-line"></div>
                        </div>

                        <button className="submit-btn" type="submit" disabled={loading}>
                          {loading ? (
                            <div className="gg-spin" />
                          ) : (
                            <>
                              <span className="btn-text">SEND OTP CODE</span>
                              <Zap size={18} className="btn-icon" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 mt-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mx-auto bg-transparent border-none cursor-pointer"
                          onClick={() => {
                            setForgotStep('none');
                            setError(null);
                            setSuccess(null);
                          }}
                        >
                          <ArrowLeft size={16} /> Back to Login
                        </button>
                      </form>
                    </div>
                  )}

                  {forgotStep === 'otp' && (
                    <div className="flex flex-col gap-5 w-full">
                      <div className="text-center mb-2">
                        <MailOpen size={36} strokeWidth={2} className="mx-auto text-indigo-400 mb-2 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-bounce" />
                        <h2 className="font-['Inter'] font-extrabold text-2xl tracking-wide text-white mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                          ENTER OTP
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide max-w-[340px] mx-auto leading-relaxed">
                          We sent a 6-digit verification code to <span className="text-cyan-400 font-medium">{forgotEmail}</span>
                        </p>
                      </div>

                      {error && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                          {error}
                        </div>
                      )}

                      {success && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
                          {success.includes('Developer Preview URL:') ? (
                            <>
                              <div>{success.split('Developer Preview URL:')[0]}</div>
                              <a
                                href={success.split('Developer Preview URL:')[1].trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 underline mt-1 inline-block hover:text-cyan-300"
                              >
                                Open Ethereal Mailbox
                              </a>
                            </>
                          ) : (
                            success
                          )}
                        </div>
                      )}

                      <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5 w-full">
                        <div className="input-wrapper">
                          <div className="input-icon">
                            <KeyRound size={18} />
                          </div>
                          <input
                            type="text"
                            placeholder="6-DIGIT OTP"
                            maxLength={6}
                            className="gym-input font-mono tracking-[0.5em] text-center text-lg animate-[inputFadeIn_0.6s_ease-out_0.1s_backwards]"
                            value={forgotOtp}
                            onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                          <div className="input-line"></div>
                        </div>

                        <button className="submit-btn" type="submit" disabled={loading}>
                          {loading ? (
                            <div className="gg-spin" />
                          ) : (
                            <>
                              <span className="btn-text">VERIFY OTP</span>
                              <ShieldCheck size={18} className="btn-icon" />
                            </>
                          )}
                        </button>

                        <div className="flex flex-col gap-3 items-center mt-2">
                          {cooldown > 0 ? (
                            <span className="text-slate-500 text-sm font-medium">
                              Resend code in {cooldown}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-cyan-400 hover:text-indigo-400 transition-colors text-sm font-semibold bg-transparent border-none cursor-pointer underline"
                              onClick={handleResendOtp}
                            >
                              Resend OTP Code
                            </button>
                          )}

                          <button
                            type="button"
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold bg-transparent border-none cursor-pointer animate-[inputFadeIn_0.6s_ease-out_0.2s_backwards]"
                            onClick={() => {
                              setForgotStep('email');
                              setError(null);
                              setSuccess(null);
                            }}
                          >
                            <ArrowLeft size={16} /> Back to Email
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {forgotStep === 'reset' && (
                    <div className="flex flex-col gap-5 w-full">
                      <div className="text-center mb-2">
                        <h2 className="font-['Inter'] font-extrabold text-2xl tracking-wide text-white mb-2 drop-shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                          NEW PASSWORD
                        </h2>
                        <p className="text-slate-400 text-sm tracking-wide">
                          Define a secure password for your sentinel access
                        </p>
                      </div>

                      {error && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
                          {error}
                        </div>
                      )}

                      {success && (
                        <div className="w-full mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium text-center">
                          {success}
                        </div>
                      )}

                      <form onSubmit={handleResetPassword} className="flex flex-col gap-5 w-full">
                        <div className="input-wrapper">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="NEW PASSWORD (MIN 8 CHARS)"
                            className="gym-input gym-input--password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <div className="input-line"></div>
                        </div>

                        <div className="input-wrapper">
                          <div className="input-icon">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="CONFIRM NEW PASSWORD"
                            className="gym-input gym-input--password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <div className="input-line"></div>
                        </div>

                        <button className="submit-btn" type="submit" disabled={loading}>
                          {loading ? (
                            <div className="gg-spin" />
                          ) : (
                            <>
                              <span className="btn-text">RESET PASSWORD</span>
                              <Zap size={18} className="btn-icon" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 mt-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mx-auto bg-transparent border-none cursor-pointer"
                          onClick={() => {
                            setForgotStep('otp');
                            setError(null);
                            setSuccess(null);
                          }}
                        >
                          <ArrowLeft size={16} /> Back
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
