import React from 'react';
import { motion } from 'framer-motion';

const CosmicBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-cosmic-gradient" />
      
      {/* Floating planets/orbs */}
      <motion.div
        className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #8A2BE2 0%, #FF1493 70%, transparent 100%)'
        }}
        animate={{
          y: [0, -30, 0],
          rotate: [0, 360],
        }}
        transition={{
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" }
        }}
      />
      
      <motion.div
        className="absolute top-60 right-40 w-20 h-20 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #9400D3 0%, #4B0082 70%, transparent 100%)'
        }}
        animate={{
          y: [0, 20, 0],
          rotate: [360, 0],
        }}
        transition={{
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 25, repeat: Infinity, ease: "linear" }
        }}
      />
      
      <motion.div
        className="absolute bottom-40 left-1/3 w-16 h-16 rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #FF1493 0%, #FF1493 70%, transparent 100%)'
        }}
        animate={{
          y: [0, -15, 0],
          rotate: [0, 360],
        }}
        transition={{
          y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 30, repeat: Infinity, ease: "linear" }
        }}
      />
      
      <motion.div
        className="absolute bottom-20 right-20 w-24 h-24 rounded-full opacity-12"
        style={{
          background: 'radial-gradient(circle, #5B25C7 0%, #9725C7 70%, transparent 100%)'
        }}
        animate={{
          y: [0, 25, 0],
          rotate: [180, -180],
        }}
        transition={{
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 35, repeat: Infinity, ease: "linear" }
        }}
      />
      
      {/* Cosmic particles */}
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
      
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-cosmic-deep via-transparent to-transparent opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cosmic-primary/5 to-transparent" />
    </div>
  );
};

export default CosmicBackground;
