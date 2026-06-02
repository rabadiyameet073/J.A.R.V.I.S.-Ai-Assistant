// Boot Sequence animation — dark sci-fi intro screen
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BOOT_LINES = [
  "INITIALIZING CORE SYSTEMS...",
  "LOADING NEURAL NETWORK v2.0...",
  "ESTABLISHING SECURE UPLINK...",
  "CALIBRATING SENSORS...",
  "MOUNTING FILE SYSTEMS...",
  "ACTIVATING VOICE INTERFACE...",
  "RUNNING DIAGNOSTICS...",
  "ALL SYSTEMS NOMINAL.",
];

const MODULES = [
  "Assistant", "Music", "System", "Files",
  "Communication", "Timers", "AI Chat",
  "AI Automation", "Settings"
];

export default function BootSequence({ onComplete }) {
  const [stage, setStage] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [moduleIdx, setModuleIdx] = useState(-1);
  const [progress, setProgress] = useState(0);
  const lineRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 400);
    const t2 = setTimeout(() => setStage(2), 1400);
    const t3 = setTimeout(() => setStage(3), 2600);
    const t4 = setTimeout(() => setStage(4), 3800);
    const t5 = setTimeout(() => setStage(5), 6200);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage === 2) {
      let i = 0;
      lineRef.current = setInterval(() => {
        i++;
        setLineIdx(i);
        if (i >= BOOT_LINES.length) clearInterval(lineRef.current);
      }, 140);
    }
    return () => { if (lineRef.current) clearInterval(lineRef.current); };
  }, [stage]);

  useEffect(() => {
    if (stage === 4) {
      let i = 0;
      const tick = () => {
        setModuleIdx(i);
        setProgress(Math.round(((i + 1) / MODULES.length) * 100));
        i++;
        if (i < MODULES.length) setTimeout(tick, 230);
      };
      tick();
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 5) setTimeout(onComplete, 600);
  }, [stage, onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040404] text-white overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Ambient radial glow */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 1 : 0 }}
        transition={{ duration: 1.5 }}
        style={{
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,212,255,0.06) 0%, transparent 70%)"
        }}
      />

      {/* Rotating outer rings */}
      <AnimatePresence>
        {stage >= 1 && (
          <motion.div
            className="absolute"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {[240, 200, 160, 120].map((size, i) => (
              <motion.div
                key={size}
                className="absolute rounded-full border border-cyan-500/10"
                style={{
                  width: size, height: size,
                  top: -size/2, left: -size/2,
                  borderColor: i === 0 ? 'rgba(0,212,255,0.12)' : i === 1 ? 'rgba(0,212,255,0.2)' : i === 2 ? 'rgba(0,212,255,0.3)' : 'rgba(0,212,255,0.1)'
                }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
              />
            ))}
            {/* Radar sweep */}
            <div className="absolute w-40 h-40" style={{ top: -80, left: -80 }}>
              <motion.div
                className="absolute inset-0 rounded-full overflow-hidden"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: '50%', width: '50%', height: '50%',
                  background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,212,255,0.15) 60deg, transparent 60deg)',
                  transformOrigin: '0% 100%'
                }} />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 flex flex-col items-center">
        
        {/* Logo */}
        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-8"
            >
              <motion.h1
                className="text-5xl sm:text-7xl md:text-8xl font-black tracking-[0.25em] flicker"
                style={{
                  background: "linear-gradient(180deg, #ffffff 0%, #aaaaaa 60%, #555555 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 20px rgba(0,212,255,0.25))"
                }}
              >
                J.A.R.V.I.S.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, letterSpacing: "0.3em" }}
                animate={{ opacity: 1, letterSpacing: "0.45em" }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-4 text-[10px] sm:text-xs text-cyan-400/70 uppercase font-mono"
              >
                Artificial Intelligence Operating System
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terminal lines */}
        <AnimatePresence>
          {stage >= 2 && stage < 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm font-mono text-[10px] sm:text-xs space-y-1 text-left mb-6"
            >
              {BOOT_LINES.slice(0, lineIdx).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-cyan-500 shrink-0">▶</span>
                  <span className={i === lineIdx - 1 ? "text-white" : "text-gray-500"}>{line}</span>
                  {i === lineIdx - 1 && (
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                      className="text-cyan-400"
                    >_</motion.span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Module checklist */}
        <AnimatePresence>
          {stage >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              {/* Progress bar */}
              <div className="h-px w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                {MODULES.map((mod, i) => (
                  <motion.div
                    key={mod}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={i <= moduleIdx ? { opacity: 1, scale: 1 } : { opacity: 0.2, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono"
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full flex items-center justify-center"
                      animate={i <= moduleIdx
                        ? { backgroundColor: "rgba(0,212,255,0.2)", borderColor: "rgba(0,212,255,0.6)" }
                        : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }
                      }
                      style={{ border: "1px solid" }}
                    >
                      {i <= moduleIdx && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                          style={{ boxShadow: "0 0 6px rgba(0,212,255,0.8)" }}
                        />
                      )}
                    </motion.div>
                    <span className={i <= moduleIdx ? "text-gray-300" : "text-gray-600"}>
                      {mod}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="text-center">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-[10px] font-mono text-gray-600"
                >
                  {progress < 100 ? `LOADING ${progress}%` : "COMPLETE — ENTERING SYSTEM"}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute bottom-6 right-6 text-[10px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-[0.2em] font-mono"
      >
        Skip →
      </button>

      {/* Corner brackets */}
      {[["top-4 left-4", "border-t-2 border-l-2"], ["top-4 right-4", "border-t-2 border-r-2"],
        ["bottom-4 left-4", "border-b-2 border-l-2"], ["bottom-4 right-4", "border-b-2 border-r-2"]
      ].map(([pos, border], i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-6 h-6 border-cyan-500/30 ${border}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
        />
      ))}
    </motion.div>
  );
}
