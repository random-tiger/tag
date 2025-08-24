import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

// Components
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import StoriesPage from './pages/StoriesPage';
import StoryCreatorPage from './pages/StoryCreatorPage';
import StoryViewPage from './pages/StoryViewPage';
import LoadingSpinner from './components/LoadingSpinner';

// Context
import { StoryProvider } from './contexts/StoryContext';

// Background components
import CosmicBackground from './components/CosmicBackground';

function App() {
  return (
    <StoryProvider>
      <Router>
        <div className="min-h-screen bg-cosmic-gradient relative overflow-hidden">
          {/* Cosmic background effects */}
          <CosmicBackground />
          
          {/* Main app content */}
          <div className="relative z-10">
            <Navbar />
            
            <motion.main
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen"
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/stories" element={<StoriesPage />} />
                <Route path="/create" element={<StoryCreatorPage />} />
                <Route path="/story/:storyId" element={<StoryViewPage />} />
              </Routes>
            </motion.main>
          </div>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
              },
              success: {
                iconTheme: {
                  primary: '#FFFF13',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#F03E3E',
                  secondary: 'white',
                },
              },
            }}
          />
        </div>
      </Router>
    </StoryProvider>
  );
}

export default App;
