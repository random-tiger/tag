import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  Film,
  Edit3,
  Heart,
  RotateCw,
  Zap,
  Users,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  PlusCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStory } from '../contexts/StoryContext';
import LoadingSpinner from '../components/LoadingSpinner';

const StoryCreatorPage = () => {
  const navigate = useNavigate();
  const { 
    loading, 
    currentStoryGeneration, 
    storyGenerationStep,
    generationStatus,
    currentStory,
    actions 
  } = useStory();
  
  // Step 1: Prompt input
  const [storyPrompt, setStoryPrompt] = useState('');
  // Total duration selection (30s to 5m)
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(120);
  
  // Step 3: Currently editing element
  const [editingElement, setEditingElement] = useState(null);
  
  // Animation states
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationPhase, setGenerationPhase] = useState('characters'); // 'characters', 'scenes', 'details'
  const [cardGeneratingById, setCardGeneratingById] = useState({}); // {sceneId: boolean}
  const [sceneOpById, setSceneOpById] = useState({}); // {sceneId: operationId}
  const [sceneVideoById, setSceneVideoById] = useState({}); // {sceneId: videoUrl}
  const [sceneStartAtById, setSceneStartAtById] = useState({}); // {sceneId: epochMs}
  const [sceneProgressById, setSceneProgressById] = useState({}); // {sceneId: 0..100}
  const [sceneLastUpdateById, setSceneLastUpdateById] = useState({}); // {sceneId: epochMs}
  const [nowTs, setNowTs] = useState(Date.now());

  // Tick once a second while any card is generating to update elapsed timers
  useEffect(() => {
    const anyGenerating = Object.values(cardGeneratingById).some(Boolean);
    if (!anyGenerating) return;
    const interval = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [cardGeneratingById]);

  const formatElapsed = (startMs) => {
    if (!startMs) return '0:00';
    const secs = Math.max(0, Math.floor((nowTs - startMs) / 1000));
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // When operations progress/complete, reflect on cards and attach video when available
  useEffect(() => {
    Object.entries(sceneOpById).forEach(([sceneId, opId]) => {
      const st = generationStatus?.[opId];
      if (!st) return;
      // Touch last-update timestamp whenever we see a status
      setSceneLastUpdateById(prev => ({ ...prev, [sceneId]: Date.now() }));
      if (st.status === 'failed') {
        setCardGeneratingById(prev => ({ ...prev, [sceneId]: false }));
      }
      if (st.status === 'completed') {
        setSceneProgressById(prev => ({ ...prev, [sceneId]: 100 }));
        setCardGeneratingById(prev => ({ ...prev, [sceneId]: false }));
        const segId = st.segment_id;
        // Prefer immediate URL from status if present; fall back to story reload
        const statusUrl = st.video_url || st.public_url || st.output_url || st.gcs_url || st.gcs_path;
        if (statusUrl) {
          setSceneVideoById(prev => ({ ...prev, [sceneId]: statusUrl }));
        } else if (segId && currentStory?.segments) {
          const seg = (currentStory.segments || []).find(s => s.id === segId);
          if (seg) {
            const url = seg.public_url || seg.video_url || seg.output_url || seg.gcs_url || seg.gcs_path;
            if (url) setSceneVideoById(prev => ({ ...prev, [sceneId]: url }));
          }
        }
      } else if (st.status === 'generating' || st.status === 'publishing') {
        // Nudge progress forward on each poll (capped below 90 until completion)
        setSceneProgressById(prev => {
          const current = Number(prev[sceneId] || 10);
          const next = Math.min(90, current + 12);
          return { ...prev, [sceneId]: next };
        });
      }
    });
  }, [generationStatus, currentStory, sceneOpById]);

  // Preload any existing completed segment videos onto matching storyboard cards by sequence number
  useEffect(() => {
    try {
      const segments = Array.isArray(currentStory?.segments) ? currentStory.segments : [];
      const scenes = Array.isArray(currentStoryGeneration?.scenes) ? currentStoryGeneration.scenes : [];
      if (!segments.length || !scenes.length) return;

      const seqToVideo = new Map();
      segments.forEach(seg => {
        if (seg && seg.status === 'completed') {
          const url = seg.video_url || (Array.isArray(seg.video_urls) ? seg.video_urls[0] : undefined);
          if (url) seqToVideo.set(Number(seg.sequence_number || 0), url);
        }
      });

      if (!seqToVideo.size) return;

      const next = {};
      scenes.forEach(scene => {
        const seq = Number(scene.sequence || scene.sequence_number || 0);
        const url = seqToVideo.get(seq);
        if (url) next[scene.id] = url;
      });
      if (Object.keys(next).length) {
        setSceneVideoById(prev => ({ ...prev, ...next }));
      }
    } catch (_) {
      // no-op; best effort
    }
  }, [currentStory, currentStoryGeneration]);
  
  // Handle step navigation effects
  useEffect(() => {
    if (storyGenerationStep === 2 && storyPrompt.trim()) {
      // Simulate generation progress
      const phases = ['characters', 'scenes', 'details'];
      let progress = 0;
      let phaseIndex = 0;
      
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        
        if (progress > (phaseIndex + 1) * 33 && phaseIndex < phases.length - 1) {
          phaseIndex++;
          setGenerationPhase(phases[phaseIndex]);
        }
        
        setGenerationProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
          clearInterval(interval);
          // Story should be generated by now
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [storyGenerationStep, storyPrompt]);

  const handlePromptSubmit = async () => {
    if (!storyPrompt.trim()) {
      toast.error('Please enter a story prompt');
      return;
    }
    
    try {
      actions.setStoryGenerationStep(2); // Go to loading step
      await actions.generateStoryFromPrompt(storyPrompt, {
        target_total_duration_seconds: targetDurationSeconds,
        max_scene_duration_seconds: 8
      });
    } catch (error) {
      console.error('Error generating story:', error);
      actions.setStoryGenerationStep(1); // Go back to prompt step
    }
  };

  const handleCreateVideos = async (mode) => {
    try {
      if (mode === 'whole') {
        // Use existing story if already created in this session, otherwise create from generation
        const story = currentStory?.id
          ? currentStory
          : await actions.createStoryFromGeneration(currentStoryGeneration);
        
        // Generate all scenes with continuity (seed from prior scene after the first)
        for (let i = 0; i < currentStoryGeneration.scenes.length; i++) {
          const scene = currentStoryGeneration.scenes[i];
          const usePrev = i > 0;
          await actions.generateVideoSegment(
            story.id,
            scene.veo_prompt,
            null,
            usePrev
          );
        }
        
        navigate(`/story/${story.id}`);
      } else {
        // Use or create story, then go to scene-by-scene mode
        const story = currentStory?.id
          ? currentStory
          : await actions.createStoryFromGeneration(currentStoryGeneration);
        navigate(`/story/${story.id}?mode=scene-by-scene`);
      }
    } catch (error) {
      console.error('Error creating videos:', error);
    }
  };

  const storyTemplates = [
    {
      title: 'Space Adventure',
      prompt: 'A young astronaut discovers a hidden alien civilization on a distant planet, leading to an epic journey across the galaxy with stunning cosmic landscapes and advanced alien technology.',
      gradient: 'from-cosmic-primary to-cosmic-magenta'
    },
    {
      title: 'Fantasy Quest',
      prompt: 'A brave hero embarks on a magical quest through enchanted forests, ancient castles, and mystical realms to defeat an evil sorcerer and save the kingdom.',
      gradient: 'from-cosmic-secondary to-cosmic-violet'
    },
    {
      title: 'Urban Adventure',
      prompt: 'A detective uncovers a conspiracy in a neon-lit cyberpunk city, chasing clues through bustling streets, high-tech buildings, and underground networks.',
      gradient: 'from-cosmic-bright to-cosmic-medium'
    }
  ];

  // Loading state (limit to initial prompt step only)
  if (loading && storyGenerationStep === 1) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {/* Step 1: Prompt Your Story */}
        {storyGenerationStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="max-w-4xl w-full">
              {/* Hero Header */}
              <div className="text-center mb-12">
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-hero-gradient mb-8 shadow-cosmic-strong"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                
                <h1 className="text-5xl md:text-7xl font-tubi font-black text-white mb-6 hero-text-glow">
                  What's Your Story?
                </h1>
                <p className="text-xl md:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                  Describe your story and watch AI bring it to life. Tag your friend to join the fun.
                </p>
              </div>

              {/* Main Prompt Input */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-effect-strong rounded-3xl p-8 mb-8"
              >
                <textarea
                  value={storyPrompt}
                  onChange={(e) => setStoryPrompt(e.target.value)}
                  placeholder="A man and his dog save the world in a modern city at golden hour. Cinematic, adventurous tone..."
                  className="w-full h-40 px-6 py-4 bg-transparent border-none text-xl text-white placeholder-white/40 focus:outline-none resize-none"
                  maxLength={2000}
                />
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
                  <span className="text-white/40 text-sm">{storyPrompt.length}/2000 characters</span>
                  <div className="flex items-center gap-3">
                    <label className="text-white/80 text-sm">Total Duration</label>
                    <select
                      value={targetDurationSeconds}
                      onChange={(e) => setTargetDurationSeconds(parseInt(e.target.value))}
                      className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cosmic-accent"
                    >
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={120}>2 minutes</option>
                      <option value={180}>3 minutes</option>
                      <option value={240}>4 minutes</option>
                      <option value={300}>5 minutes</option>
                    </select>
                    <span className="text-white/40 text-xs">Each scene ≤ 8s</span>
                  </div>
                  <button
                    onClick={handlePromptSubmit}
                    disabled={!storyPrompt.trim()}
                    className="bg-cosmic-accent text-black font-bold py-4 px-8 rounded-pill flex items-center space-x-3 hover:shadow-cosmic-strong transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    <Zap className="w-6 h-6" />
                    <span>Create Story</span>
                  </button>
                </div>
              </motion.div>

              {/* Quick Templates */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-white font-bold text-lg mb-4">Quick Start Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {storyTemplates.map((template, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setStoryPrompt(template.prompt)}
                      className="glass-effect rounded-xl p-4 text-left hover:shadow-cosmic transition-all"
                    >
                      <div className={`h-20 bg-gradient-to-br ${template.gradient} rounded-lg mb-3 opacity-70`} />
                      <h4 className="text-white font-bold mb-2">{template.title}</h4>
                      <p className="text-white/60 text-sm line-clamp-2">{template.prompt}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Create Your Story Board (Loading) */}
        {storyGenerationStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="max-w-2xl w-full text-center">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-hero-gradient mb-8 shadow-cosmic-strong"
              >
                <Film className="w-12 h-12 text-white" />
              </motion.div>
              
              <h2 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-6 hero-text-glow">
                Creating Your Story Board
              </h2>
              
              <div className="glass-effect rounded-2xl p-8 mb-8">
                <div className="mb-6">
                  <div className="w-full bg-white/10 rounded-full h-3 mb-4">
                    <motion.div
                      className="bg-gradient-to-r from-cosmic-accent to-cosmic-primary h-full rounded-full"
                      style={{ width: `${generationProgress}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-white/60 capitalize">
                    {generationPhase === 'characters' && '🎭 Developing characters and personalities...'}
                    {generationPhase === 'scenes' && '🎬 Building scenes and storyboards...'}
                    {generationPhase === 'details' && '✨ Adding cinematic details and polish...'}
                  </p>
                </div>
                
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-white/40 text-sm"
                >
                  AI is analyzing your story and creating detailed scenes, characters, and cinematic elements...
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Edit Your Story */}
        {storyGenerationStep === 3 && currentStoryGeneration && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen pt-20 pb-8"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-4">
                  Review & Edit Your Story
                </h1>
                <p className="text-xl text-white/70 max-w-2xl mx-auto">
                  Your story is ready! Review the storyboards and make any edits before creating videos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Story Summary Panel */}
                <div className="lg:col-span-1">
                  <div className="glass-effect rounded-2xl p-6 sticky top-24">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center space-x-2">
                      <Star className="w-5 h-5 text-cosmic-accent" />
                      <span>Story Summary</span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-cosmic-accent font-medium mb-1">Title</h4>
                        <p className="text-white text-sm">{currentStoryGeneration.title}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-cosmic-accent font-medium mb-1">Genre & Tone</h4>
                        <p className="text-white text-sm">
                          {currentStoryGeneration.genre} • {currentStoryGeneration.tone}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-cosmic-accent font-medium mb-1">Duration</h4>
                        <p className="text-white text-sm">
                          {(() => {
                            const secs = Number(currentStoryGeneration.estimated_duration || 0);
                            if (!secs || secs < 60) return `${secs || 0} seconds`;
                            const mins = Math.round(secs / 60);
                            return `${mins} minute${mins === 1 ? '' : 's'}`;
                          })()}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-cosmic-accent font-medium mb-1">Characters</h4>
                        <div className="space-y-1">
                          {currentStoryGeneration.characters?.map((char, index) => (
                            <p key={index} className="text-white text-sm flex items-center space-x-2">
                              <Users className="w-3 h-3 text-cosmic-accent" />
                              <span>{char.name}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-6 space-y-3">
                      <button
                        onClick={() => actions.setStoryGenerationStep(5)}
                        className="w-full bg-cosmic-accent text-black font-bold py-3 px-4 rounded-pill flex items-center justify-center space-x-2 hover:shadow-cosmic transition-all"
                      >
                        <Heart className="w-5 h-5" />
                        <span>Love it - Make Videos</span>
                      </button>
                      
                      <button
                        onClick={() => actions.regenerateStoryElement('full_story')}
                        className="w-full glass-effect text-white font-medium py-3 px-4 rounded-pill hover:bg-white/10 transition-all flex items-center justify-center space-x-2"
                      >
                        <RotateCw className="w-5 h-5" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Storyboard Cards */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentStoryGeneration.scenes?.map((scene, index) => (
                      <motion.div
                        key={scene.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-effect rounded-xl p-6 hover:shadow-cosmic transition-all group"
                      >
                        {/* Scene Preview */}
                        <div className="aspect-video bg-gradient-to-br from-cosmic-primary/20 to-cosmic-magenta/20 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                          {cardGeneratingById[scene.id] && (
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center space-y-3 px-4">
                              <div className="dots-loader text-cosmic-accent">
                                <span></span>
                                <span></span>
                                <span></span>
                              </div>
                              <div className="text-white/80 text-xs tracking-wide">
                                Generating • {formatElapsed(sceneStartAtById[scene.id])} elapsed • updated {formatElapsed(sceneLastUpdateById[scene.id])} ago
                              </div>
                              <div className="w-full max-w-[220px] h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-cosmic-accent"
                                  style={{ width: `${sceneProgressById[scene.id] || 10}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {sceneVideoById[scene.id] ? (
                            <video
                              src={sceneVideoById[scene.id]}
                              className="w-full h-full object-cover"
                              controls
                              muted
                              loop
                            />
                          ) : (
                            <div className="text-center">
                              <Film className="w-8 h-8 text-white/40 mx-auto mb-2" />
                              <p className="text-white/40 text-xs">Scene {scene.sequence}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-bold">
                              {scene.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditingElement(scene);
                                  actions.setStoryGenerationStep(4);
                                }}
                                className="glass-effect text-white text-xs px-3 py-1 rounded-pill hover:bg-white/10 transition-all flex items-center space-x-1"
                                title="Edit Scene"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (cardGeneratingById[scene.id]) return;
                                  setCardGeneratingById(prev => ({ ...prev, [scene.id]: true }));
                                  try {
                                    // Ensure a story exists without leaving the page
                                    const story = await actions.ensureStoryExists('anonymous');
                                    const storyId = story.id;
                                    const usePrev = Number(scene.sequence || scene.sequence_number || index + 1) > 1;
                                    const resp = await actions.generateVideoSegment(
                                      storyId,
                                      scene.veo_prompt || scene.visual_description || `Generate scene ${scene.sequence}`,
                                      null,
                                      usePrev,
                                      { silent: true, targetSequence: Number(scene.sequence || scene.sequence_number || index + 1) }
                                    );
                                    setSceneStartAtById(prev => ({ ...prev, [scene.id]: Date.now() }));
                                    setSceneProgressById(prev => ({ ...prev, [scene.id]: 10 }));
                                    if (resp?.operation_id) {
                                      setSceneOpById(prev => ({ ...prev, [scene.id]: resp.operation_id }));
                                    }
                                  } catch (err) {
                                    console.error('Scene generation failed', err);
                                  }
                                }}
                                className={`text-xs font-bold px-3 py-1 rounded-pill transition-all ${cardGeneratingById[scene.id] ? 'bg-white/20 text-white cursor-not-allowed' : 'bg-cosmic-accent text-black hover:shadow-cosmic'}`}
                                disabled={!!cardGeneratingById[scene.id]}
                                title={sceneVideoById[scene.id] ? 'Re-generate Video' : 'Generate Video'}
                              >
                                {cardGeneratingById[scene.id]
                                  ? 'Generating…'
                                  : (sceneVideoById[scene.id] ? 'Re-generate' : 'Generate')}
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-white/70 text-sm line-clamp-3">
                            {scene.visual_description}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-white/40">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{scene.location}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{scene.duration_seconds}s</span>
                            </span>
                            {/* Characters in this scene */}
                            {Array.isArray(scene.character_details) && scene.character_details.length > 0 && (
                              <span className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{scene.character_details.map(c => c.name).filter(Boolean).join(', ')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Guided Edits */}
        {storyGenerationStep === 4 && editingElement && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen pt-20 pb-8"
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-4">
                  Edit Scene
                </h1>
                <p className="text-xl text-white/70">
                  Fine-tune the details of "{editingElement.title}"
                </p>
              </div>

              <div className="glass-effect rounded-2xl p-8">
                {/* Back Button */}
                <button
                  onClick={() => {
                    actions.setStoryGenerationStep(3);
                    setEditingElement(null);
                  }}
                  className="mb-6 text-white/60 hover:text-white flex items-center space-x-2 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Story Review</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Scene Details */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-white font-medium mb-2">Scene Title</label>
                      <input
                        type="text"
                        value={editingElement.title || ''}
                        onChange={(e) => setEditingElement({...editingElement, title: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Location</label>
                      <input
                        type="text"
                        value={editingElement.location || ''}
                        onChange={(e) => setEditingElement({...editingElement, location: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Duration (seconds)</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={Math.min(8, Math.max(1, editingElement.duration_seconds || 8))}
                        onChange={(e) => {
                          const val = parseInt(e.target.value || '0');
                          const clamped = Math.max(1, Math.min(8, val));
                          setEditingElement({...editingElement, duration_seconds: clamped});
                        }}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors"
                      />
                      <p className="text-white/40 text-xs mt-1">Max per scene: 8 seconds (Veo limit)</p>
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Camera Work</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                          value={editingElement.camera_work?.primary_shot || 'medium shot'}
                          onChange={(e) => setEditingElement({
                            ...editingElement, 
                            camera_work: {...editingElement.camera_work, primary_shot: e.target.value}
                          })}
                          className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cosmic-accent transition-colors"
                        >
                          <option value="wide shot">Wide Shot</option>
                          <option value="medium shot">Medium Shot</option>
                          <option value="close-up">Close-up</option>
                          <option value="extreme close-up">Extreme Close-up</option>
                        </select>

                        <select
                          value={editingElement.camera_work?.camera_movement || 'static'}
                          onChange={(e) => setEditingElement({
                            ...editingElement, 
                            camera_work: {...editingElement.camera_work, camera_movement: e.target.value}
                          })}
                          className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cosmic-accent transition-colors"
                        >
                          <option value="static">Static</option>
                          <option value="pan">Pan</option>
                          <option value="tilt">Tilt</option>
                          <option value="tracking">Tracking</option>
                          <option value="zoom">Zoom</option>
                        </select>
                      </div>
                    </div>

                    {/* Character Details for this Scene */}
                    <div>
                      <label className="block text-white font-medium mb-2">Characters in this Scene</label>
                      <div className="space-y-3">
                        {(editingElement.character_details || []).map((char, idx) => (
                          <div key={idx} className="glass-effect rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-cosmic-accent" />
                                <input
                                  type="text"
                                  value={char.name || ''}
                                  onChange={(e) => {
                                    const updated = [...(editingElement.character_details || [])];
                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                    setEditingElement({ ...editingElement, character_details: updated });
                                  }}
                                  placeholder="Character name"
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const updated = (editingElement.character_details || []).filter((_, i) => i !== idx);
                                  setEditingElement({ ...editingElement, character_details: updated });
                                }}
                                className="text-white/60 hover:text-white p-2 rounded-lg"
                                aria-label="Remove character"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={char.description || ''}
                              onChange={(e) => {
                                const updated = [...(editingElement.character_details || [])];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                setEditingElement({ ...editingElement, character_details: updated });
                              }}
                              placeholder="Describe this character's look, outfit, and presence in this scene"
                              className="w-full h-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent resize-none"
                            />
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={(char.emotions || '')}
                                onChange={(e) => {
                                  const updated = [...(editingElement.character_details || [])];
                                  updated[idx] = { ...updated[idx], emotions: e.target.value };
                                  setEditingElement({ ...editingElement, character_details: updated });
                                }}
                                placeholder="Emotions (e.g., anxious, determined)"
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent"
                              />
                              <input
                                type="text"
                                value={(Array.isArray(char.actions) ? char.actions.join(', ') : (char.actions || ''))}
                                onChange={(e) => {
                                  const updated = [...(editingElement.character_details || [])];
                                  const value = e.target.value;
                                  updated[idx] = { ...updated[idx], actions: value.split(',').map(s => s.trim()).filter(Boolean) };
                                  setEditingElement({ ...editingElement, character_details: updated });
                                }}
                                placeholder="Actions (comma separated)"
                                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent"
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const updated = [...(editingElement.character_details || [])];
                            updated.push({ name: '', description: '', actions: [], emotions: '' });
                            setEditingElement({ ...editingElement, character_details: updated });
                          }}
                          className="glass-effect text-white font-medium py-2 px-4 rounded-pill hover:bg-white/10 transition-colors inline-flex items-center space-x-2"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Add Character</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Visual Description */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-white font-medium mb-2">Visual Description</label>
                      <textarea
                        value={editingElement.visual_description || ''}
                        onChange={(e) => setEditingElement({...editingElement, visual_description: e.target.value})}
                        className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors resize-none"
                        placeholder="Describe the visual elements, characters, and atmosphere of this scene..."
                      />
                    </div>

                    <div>
                      <label className="block text-white font-medium mb-2">Veo Generation Prompt</label>
                      <textarea
                        value={editingElement.veo_prompt || ''}
                        onChange={(e) => setEditingElement({...editingElement, veo_prompt: e.target.value})}
                        className="w-full h-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors resize-none"
                        placeholder="Optimized prompt for video generation..."
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between pt-8 border-t border-white/10">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => actions.regenerateStoryElement('scenes', editingElement.id)}
                      className="glass-effect text-white font-medium py-3 px-6 rounded-pill hover:bg-white/10 transition-all flex items-center space-x-2"
                    >
                      <RotateCw className="w-5 h-5" />
                      <span>Regenerate Scene</span>
                    </button>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => {
                        actions.setStoryGenerationStep(3);
                        setEditingElement(null);
                      }}
                      className="glass-effect text-white font-medium py-3 px-6 rounded-pill hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={async () => {
                        await actions.updateStoryElement('scene', editingElement, editingElement.id);
                        actions.setStoryGenerationStep(3);
                        setEditingElement(null);
                      }}
                      className="bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill flex items-center space-x-2 hover:shadow-cosmic transition-all"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 5: Start Making Videos */}
        {storyGenerationStep === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="max-w-4xl w-full text-center">
              <h1 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-6 hero-text-glow">
                Start Making Videos
              </h1>
              <p className="text-xl text-white/70 mb-12">
                Choose how you'd like to create your video story
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Make Whole Story */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateVideos('whole')}
                  className="glass-effect-strong rounded-2xl p-8 text-left hover:shadow-cosmic-strong transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-hero-gradient flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Film className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">🎬 Make Whole Story</h3>
                  <p className="text-white/70 mb-4">
                    AI creates all videos at once. Perfect for a complete story experience.
                  </p>
                  <p className="text-cosmic-accent text-sm">⏱️ 3-5 minutes • Fully automated</p>
                </motion.button>

                {/* One Scene at a Time */}
                <motion.button
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateVideos('scene')}
                  className="glass-effect-strong rounded-2xl p-8 text-left hover:shadow-cosmic-strong transition-all group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cosmic-secondary to-cosmic-bright flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Edit3 className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">🎨 One Scene at a Time</h3>
                  <p className="text-white/70 mb-4">
                    Review and refine each scene individually. More control over the final result.
                  </p>
                  <p className="text-cosmic-accent text-sm">⚡ Interactive • Customizable</p>
                </motion.button>
              </div>

              {/* Back Button */}
              <button
                onClick={() => actions.setStoryGenerationStep(3)}
                className="mt-8 text-white/60 hover:text-white flex items-center space-x-2 mx-auto transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Story Review</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Progress Indicator */}
      {storyGenerationStep > 1 && storyGenerationStep < 5 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="glass-effect rounded-pill px-6 py-3 flex items-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-all ${
                  step <= storyGenerationStep
                    ? 'bg-cosmic-accent'
                    : step === storyGenerationStep + 1
                    ? 'bg-cosmic-accent/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StoryCreatorPage;
