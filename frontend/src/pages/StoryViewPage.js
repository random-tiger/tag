import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { 
  PlusCircle, Play, Download, Share2, Clock, CheckCircle, 
  AlertCircle, ArrowLeft, Edit3, Trash2, Layers, Sparkles,
  Upload, MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStory } from '../contexts/StoryContext';
import LoadingSpinner, { VideoGenerationLoader } from '../components/LoadingSpinner';
import VideoPlayer from '../components/VideoPlayer';
// AI Assist removed

const StoryViewPage = () => {
  const { storyId } = useParams();
  const { currentStory, loading, generationStatus, actions } = useStory();
  
  const [newPrompt, setNewPrompt] = useState('');
  const [showAddSegment, setShowAddSegment] = useState(false);
  const [isStitching, setIsStitching] = useState(false);
  // AI Assist removed
  
  useEffect(() => {
    if (storyId) {
      actions.loadStory(storyId);
    }
  }, [storyId]);
  
  const handleAddSegment = async () => {
    if (!newPrompt.trim()) {
      toast.error('Please enter a prompt for the new segment');
      return;
    }
    
    try {
      await actions.generateVideoSegment(
        storyId,
        newPrompt,
        null,
        true // Use previous frame
      );
      
      setNewPrompt('');
      setShowAddSegment(false);
      
      // Reload story to get updated data
      actions.loadStory(storyId);
      
    } catch (error) {
      console.error('Error adding segment:', error);
    }
  };
  
  const handleStitchStory = async () => {
    try {
      setIsStitching(true);
      await actions.stitchStory(storyId);
    } catch (error) {
      console.error('Error stitching story:', error);
    } finally {
      setIsStitching(false);
    }
  };

  // AI Assist removed
  
  const getSegmentStatusInfo = (segment) => {
    const status = segment.status;
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bgColor: 'bg-green-400/20' };
      case 'generating':
        return { icon: Clock, color: 'text-cosmic-accent', bgColor: 'bg-cosmic-accent/20' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-400/20' };
      default:
        return { icon: Clock, color: 'text-white/60', bgColor: 'bg-white/10' };
    }
  };
  
  const completedSegments = currentStory?.segments?.filter(s => s.status === 'completed') || [];
  const canStitch = completedSegments.length > 0 && !currentStory?.final_video_url;
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading story..." />
      </div>
    );
  }
  
  if (!currentStory) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Story Not Found</h1>
          <Link
            to="/stories"
            className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill"
          >
            Back to Stories
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link
              to="/stories"
              className="text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-tubi font-bold text-white">
                {currentStory.title}
              </h1>
              {currentStory.description && (
                <p className="text-white/70 mt-1">{currentStory.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="glass-effect p-3 rounded-xl text-white hover:bg-white/10 transition-colors">
              <Edit3 className="w-5 h-5" />
            </button>
            <button className="glass-effect p-3 rounded-xl text-white hover:bg-white/10 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={async () => {
                if (window.confirm('Delete this story and all its videos?')) {
                  await actions.deleteStory(currentStory.id);
                }
              }}
              className="glass-effect p-3 rounded-xl text-white hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </motion.div>
        
        {/* Final Video */}
        {currentStory.final_video_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="glass-effect rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Play className="w-6 h-6 text-cosmic-accent" />
                  <span>Final Story</span>
                </h2>
                <div className="flex items-center space-x-2">
                  <button className="glass-effect px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                  <button className="glass-effect px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors flex items-center space-x-2">
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
              
              <VideoPlayer
                src={currentStory.final_video_url}
                className="w-full aspect-video"
                showControls={true}
              />
            </div>
          </motion.div>
        )}
        
        {/* Story Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-xl p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{currentStory.segments?.length || 0}</div>
                <div className="text-white/60 text-sm">Segments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{completedSegments.length}</div>
                <div className="text-white/60 text-sm">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cosmic-accent">
                  {(completedSegments.length * 8)}s
                </div>
                <div className="text-white/60 text-sm">Duration</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAddSegment(!showAddSegment)}
                className="glass-effect text-white font-medium py-2 px-4 rounded-pill hover:bg-white/10 transition-colors flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Scene</span>
              </button>
              
              {canStitch && (
                <button
                  onClick={handleStitchStory}
                  disabled={isStitching}
                  className="cosmic-button bg-cosmic-accent text-black font-bold py-2 px-6 rounded-pill flex items-center space-x-2 disabled:opacity-50"
                >
                  {isStitching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Stitching...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Create Final Video</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
        
        {/* Add Segment Form */}
        <AnimatePresence>
          {showAddSegment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-effect rounded-xl p-6 mb-8"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cosmic-accent" />
                <span>Add New Scene</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <textarea
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Describe what happens next in your story. The AI will use the last frame from your previous scene as a starting point..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors resize-none"
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* AI Assist removed */}
                    <span className="text-white/40 text-sm">
                      {newPrompt.length}/1000 characters
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowAddSegment(false)}
                      className="text-white/60 hover:text-white font-medium py-2 px-4 rounded-pill transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSegment}
                      disabled={!newPrompt.trim()}
                      className="cosmic-button bg-cosmic-accent text-black font-bold py-2 px-6 rounded-pill flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Scene</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Segments List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Layers className="w-6 h-6 text-cosmic-accent" />
            <span>Story Segments</span>
          </h2>
          
          {currentStory.segments && currentStory.segments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {currentStory.segments
                .sort((a, b) => a.sequence_number - b.sequence_number)
                .map((segment, index) => {
                  const statusInfo = getSegmentStatusInfo(segment);
                  const StatusIcon = statusInfo.icon;
                  const isGenerating = segment.status === 'generating';
                  
                  return (
                    <motion.div
                      key={segment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-effect rounded-xl overflow-hidden"
                    >
                      {/* Video Preview */}
                      <div className="aspect-video bg-gradient-to-br from-cosmic-primary/20 to-cosmic-magenta/20 relative">
                        {segment.video_url ? (
                          <VideoPlayer
                            src={segment.video_url}
                            className="w-full h-full"
                            showControls={true}
                          />
                        ) : isGenerating ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <VideoGenerationLoader />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <StatusIcon className={`w-12 h-12 mx-auto mb-2 ${statusInfo.color}`} />
                              <p className="text-white/60 capitalize">{segment.status}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Segment Number */}
                        <div className="absolute top-3 left-3">
                          <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-pill">
                            <span className="text-white font-medium">
                              Scene {segment.sequence_number}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-3 right-3">
                          <div className={`${statusInfo.bgColor} px-2 py-1 rounded-pill flex items-center space-x-1`}>
                            <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                            <span className={`text-xs font-medium ${statusInfo.color} capitalize`}>
                              {segment.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Segment Info */}
                      <div className="p-4">
                        <p className="text-white/80 text-sm mb-2 line-clamp-2">
                          {segment.enhanced_prompt || segment.original_prompt}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>
                            Created {new Date(segment.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-2">
                            {segment.completed_at && (
                              <span>8 seconds</span>
                            )}
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this scene?')) {
                                  await actions.deleteSegment(segment.id, currentStory.id);
                                }
                              }}
                              className="glass-effect px-2 py-1 rounded-lg text-white hover:bg-white/10 transition-colors inline-flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3 text-red-400" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <PlusCircle className="w-12 h-12 text-white/40" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Scenes Yet</h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                Start building your story by adding your first scene
              </p>
              <button
                onClick={() => setShowAddSegment(true)}
                className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill flex items-center space-x-2 mx-auto"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Add First Scene</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* AI Assistance Panel removed */}
    </div>
  );
};

export default StoryViewPage;
