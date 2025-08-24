import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'medium', message = 'Loading...', showMessage = true }) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };
  
  const containerClasses = {
    small: 'gap-2',
    medium: 'gap-3',
    large: 'gap-4',
    xl: 'gap-6'
  };
  
  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-white/20 border-t-cosmic-accent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {showMessage && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-white/80 text-center font-medium"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

// Specialized loading components
export const FullScreenLoader = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 bg-cosmic-gradient flex items-center justify-center z-50">
    <LoadingSpinner size="xl" message={message} />
  </div>
);

export const VideoGenerationLoader = () => (
  <div className="flex flex-col items-center justify-center p-8 glass-effect rounded-xl">
    <motion.div
      className="relative mb-4"
      animate={{ 
        scale: [1, 1.05, 1],
        rotate: [0, 360]
      }}
      transition={{
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 3, repeat: Infinity, ease: "linear" }
      }}
    >
      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cosmic-primary to-cosmic-magenta opacity-20" />
      <div className="absolute inset-2 w-12 h-12 border-2 border-cosmic-accent border-t-transparent rounded-full animate-spin" />
    </motion.div>
    
    <motion.h3
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-lg font-bold text-white mb-2"
    >
      Generating Video
    </motion.h3>
    
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-white/70 text-center max-w-sm"
    >
      Creating your video segment using AI magic. This may take a few moments...
    </motion.p>
    
    <motion.div
      className="mt-4 flex space-x-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-cosmic-accent rounded-full"
          animate={{ 
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.2
          }}
        />
      ))}
    </motion.div>
  </div>
);

export default LoadingSpinner;
