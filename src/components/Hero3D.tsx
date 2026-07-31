import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { Sparkles, ShoppingBag, Send, ShieldCheck, Zap, Cpu, Search } from 'lucide-react';

interface Hero3DProps {
  onOpenSourcingModal: () => void;
  onExploreClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
}

export const Hero3D: React.FC<Hero3DProps> = ({ onOpenSourcingModal, onExploreClick, searchQuery, onSearchChange, onSearchSubmit }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Set up Three.js Scene for 3D Microchip Motion
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xd4af37, 3, 20);
    goldPointLight.position.set(5, 5, 5);
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 20);
    cyanPointLight.position.set(-5, -5, 3);
    scene.add(cyanPointLight);

    // Main 3D IC Chip Group
    const chipGroup = new THREE.Group();

    // Chip Main Body
    const bodyGeometry = new THREE.BoxGeometry(2.4, 2.4, 0.35);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.2,
    });
    const chipBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    chipGroup.add(chipBody);

    // Silicon Die / Gold Core Center Emblem
    const coreGeometry = new THREE.BoxGeometry(1.0, 1.0, 0.37);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x332200,
    });
    const chipCore = new THREE.Mesh(coreGeometry, coreMaterial);
    chipGroup.add(chipCore);

    // Gold Pins along 4 sides
    const pinGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.08);
    const pinMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 1.0,
      roughness: 0.1,
    });

    const sidePins = 6;
    const pinSpacing = 0.35;
    const offsetStart = -((sidePins - 1) * pinSpacing) / 2;

    for (let i = 0; i < sidePins; i++) {
      const pos = offsetStart + i * pinSpacing;

      // Top Pins
      const pinTop = new THREE.Mesh(pinGeometry, pinMaterial);
      pinTop.position.set(pos, 1.45, 0);
      chipGroup.add(pinTop);

      // Bottom Pins
      const pinBottom = new THREE.Mesh(pinGeometry, pinMaterial);
      pinBottom.position.set(pos, -1.45, 0);
      chipGroup.add(pinBottom);

      // Left Pins
      const pinLeft = new THREE.Mesh(pinGeometry, pinMaterial);
      pinLeft.rotation.z = Math.PI / 2;
      pinLeft.position.set(-1.45, pos, 0);
      chipGroup.add(pinLeft);

      // Right Pins
      const pinRight = new THREE.Mesh(pinGeometry, pinMaterial);
      pinRight.rotation.z = Math.PI / 2;
      pinRight.position.set(1.45, pos, 0);
      chipGroup.add(pinRight);
    }

    scene.add(chipGroup);

    // Glowing Particle Field (Circuit Electrons)
    const particleCount = 180;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = (Math.random() - 0.5) * 12;
      positions[i + 2] = (Math.random() - 0.5) * 8;

      // Mix Gold & Cyan Particle Colors
      if (Math.random() > 0.5) {
        colors[i] = 0.83; // R
        colors[i + 1] = 0.68; // G
        colors[i + 2] = 0.21; // B
      } else {
        colors[i] = 0.0;
        colors[i + 1] = 0.94;
        colors[i + 2] = 1.0;
      }
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = mountRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Continuous 3D rotation
      chipGroup.rotation.y = elapsedTime * 0.4 + mouseX * 0.5;
      chipGroup.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2 + mouseY * 0.5;
      chipGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.15;

      particleSystem.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50/60 via-slate-50 to-white text-slate-900 border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Circuit Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none"></div>

      {/* Floating Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Column: Headline & Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-7 space-y-6 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs sm:text-sm font-mono tracking-wide backdrop-blur-md">
            <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>N°1 Vente de Composants & Sourcing Sur-Mesure au Burkina Faso</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-tight font-mono text-slate-900">
            Vente de <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent">Composants Électroniques</span> & Références MPN
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
            Trouvez instantanément vos microcontrôleurs, capteurs, régulateurs et puces par <strong className="text-amber-800 font-semibold">nom ou référence exacte MPN</strong>. 
            Si un composant n'est pas en stock, <strong className="text-cyan-700 font-semibold">commandez-le directement sur-mesure</strong> via notre service dédié WhatsApp.
          </p>

          {/* Compact Search Bar (Name or MPN Reference) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            id="hero-search"
            className="flex flex-col sm:flex-row gap-2 pt-1 max-w-xl mx-auto lg:mx-0"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher par nom ou référence (ex: NE555, STM32...)"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 font-mono uppercase tracking-wide transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Rechercher</span>
            </button>
          </form>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explorer le Catalogue</span>
            </button>

            <button
              onClick={onOpenSourcingModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-amber-500 font-bold text-base shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 font-mono"
            >
              <Send className="w-5 h-5 text-cyan-600" />
              <span>Commander Sur-Mesure</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-200 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">Recherche MPN</div>
                <div className="text-sm font-bold text-slate-900">Rapide & Simple</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">Qualité Mousse & IC</div>
                <div className="text-sm font-bold text-slate-900">100% Authentique</div>
              </div>
            </div>

            <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">WhatsApp Direct</div>
                <div className="text-sm font-bold text-emerald-700">+226 65 48 47 38</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Interactive 3D Canvas Viewport */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="lg:col-span-5 relative h-[380px] sm:h-[460px] w-full flex items-center justify-center"
        >
          {/* Three.js Mounting Element */}
          <div ref={mountRef} className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing" />

          {/* Floating Glass Specs Badge Overlay */}
          <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 flex items-center justify-between shadow-lg pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-xs font-mono text-amber-800 font-bold">MODELE 3D INTERACTIF</div>
                <div className="text-xs text-slate-700 font-medium">Puce Microcontrôleur High-Frequency</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-cyan-700 font-mono font-bold">BURKINA FASO</div>
              <div className="text-[11px] text-slate-500">Livraison Express</div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};
