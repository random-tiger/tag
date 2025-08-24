import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { PlusCircle, Upload, Type, Image as ImageIcon, Sparkles, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { useStory } from '../contexts/StoryContext';
import LoadingSpinner from '../components/LoadingSpinner';

const StoryCreatorPage = () => {
  const navigate = useNavigate();
  const { loading, actions } = useStory();
  
  // Story metadata
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  
  // First segment
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // UI state
  const [step, setStep] = useState('metadata'); // 'metadata', 'first-segment'
  const [isCreating, setIsCreating] = useState(false);
  // AI Assist removed
  
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });
  
  const handleCreateStory = async () => {
    if (!storyTitle.trim()) {
      toast.error('Please enter a story title');
      return;
    }
    
    try {
      setIsCreating(true);
      
      // Create the story
      const story = await actions.createStory(storyTitle, storyDescription);
      
      // If we have content for the first segment, generate it
      if (prompt.trim() || uploadedImage) {
        await actions.generateVideoSegment(
          story.id,
          prompt || 'Create an opening scene',
          uploadedImage,
          false
        );
      }
      
      // Navigate to the story view
      navigate(`/story/${story.id}`);
      
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  // AI Assist removed
  
  const storyTemplates = [
    {
      title: 'Space Adventure',
      description: 'Journey through the cosmos',
      prompt: 'An astronaut floating in space, looking at a distant galaxy with colorful nebulae',
      gradient: 'from-cosmic-primary to-cosmic-magenta'
    },
    {
      title: 'Fantasy Quest',
      description: 'Magical realms and creatures',
      prompt: 'A mystical forest with glowing trees and magical creatures, ethereal lighting',
      gradient: 'from-cosmic-secondary to-cosmic-violet'
    },
    {
      title: 'Urban Story',
      description: 'City life and modern tales',
      prompt: 'A bustling city street at golden hour, with people walking and warm lighting',
      gradient: 'from-cosmic-bright to-cosmic-medium'
    }
  ];
  
  if (loading || isCreating) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner 
          size="large" 
          message={isCreating ? "Creating your story..." : "Loading..."} 
        />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-hero-gradient mb-6 shadow-cosmic"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-4">
              Create Your Story
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Start building your video narrative. Every great story begins with a single frame.
            </p>
          </div>
          
          {step === 'metadata' && (
            <motion.div
              key="metadata"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-effect rounded-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <Type className="w-6 h-6 text-cosmic-accent" />
                <span>Story Details</span>
              </h2>
              
              <div className="space-y-6">
                {/* Story Title */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Story Title *
                  </label>
                  <input
                    type="text"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    placeholder="Enter an engaging title for your story..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors"
                    maxLength={100}
                  />
                  <div className="text-white/40 text-sm mt-1">
                    {storyTitle.length}/100 characters
                  </div>
                </div>
                
                {/* Story Description */}
                <div>
                  <label className="block text-white font-medium mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={storyDescription}
                    onChange={(e) => setStoryDescription(e.target.value)}
                    placeholder="Describe your story concept, themes, or vision..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <div className="text-white/40 text-sm mt-1">
                    {storyDescription.length}/500 characters
                  </div>
                </div>
                
                {/* Story Templates */}
                <div>
                  <label className="block text-white font-medium mb-4">
                    Quick Start Templates
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {storyTemplates.map((template, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setStoryTitle(template.title);
                          setStoryDescription(template.description);
                          setPrompt(template.prompt);
                        }}
                        className="glass-effect rounded-xl p-4 text-left hover:shadow-cosmic transition-all"
                      >
                        <div className={`h-24 bg-gradient-to-br ${template.gradient} rounded-lg mb-3 opacity-60`} />
                        <h3 className="text-white font-bold mb-1">{template.title}</h3>
                        <p className="text-white/60 text-sm">{template.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </div>
                
                {/* Next Button */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setStep('first-segment')}
                    disabled={!storyTitle.trim()}
                    className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          {step === 'first-segment' && (
            <motion.div
              key="first-segment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Back Button */}
              <button
                onClick={() => setStep('metadata')}
                className="text-white/60 hover:text-white flex items-center space-x-2 transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                <span>Back to Story Details</span>
              </button>
              
              <div className="glass-effect rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                  <PlusCircle className="w-6 h-6 text-cosmic-accent" />
                  <span>First Scene</span>
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Text Prompt */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Scene Description
                    </label>
                    <div>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe your opening scene in detail: setting, characters, mood, camera angles..."
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors resize-none"
                        rows={6}
                        maxLength={1000}
                      />
                    </div>
                    <div className="text-white/40 text-sm mt-1">
                      {prompt.length}/1000 characters
                    </div>
                    {/* AI Assist removed */}
                  </div>
                  
                  {/* Image Upload */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Starting Image (Optional)
                    </label>
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Upload preview"
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        {...getRootProps()}
                        className={`file-upload-area w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isDragActive ? 'drag-over' : 'border-white/20 hover:border-cosmic-accent/50'
                        }`}
                      >
                        <input {...getInputProps()} />
                        <Upload className="w-8 h-8 text-white/40 mb-2" />
                        <p className="text-white/60 text-center">
                          {isDragActive ? (
                            'Drop your image here'
                          ) : (
                            <>
                              Drag & drop an image, or <span className="text-cosmic-accent">click to browse</span>
                            </>
                          )}
                        </p>
                        <p className="text-white/40 text-sm mt-1">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between pt-8">
                  <button
                    onClick={handleCreateStory}
                    className="glass-effect text-white font-medium py-3 px-6 rounded-pill hover:bg-white/10 transition-colors"
                  >
                    Create Empty Story
                  </button>
                  
                  <button
                    onClick={handleCreateStory}
                    disabled={!prompt.trim() && !uploadedImage}
                    className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-8 rounded-pill flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Create & Generate First Scene</span>
                  </button>
                </div>
                
                <p className="text-white/40 text-sm text-center mt-4">
                  You can always add more scenes after creating your story
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* AI Assistance Panel removed */}
    </div>
  );
};

export default StoryCreatorPage;
