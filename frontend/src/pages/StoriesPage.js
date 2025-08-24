import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PlusCircle, Video, Clock, User, Play, Eye, Calendar, Search, Filter, Trash2 } from 'lucide-react';

import { useStory } from '../contexts/StoryContext';
import LoadingSpinner from '../components/LoadingSpinner';

const StoriesPage = () => {
  const { stories, loading, actions } = useStory();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('updated_at');
  
  useEffect(() => {
    actions.loadStories();
  }, []);
  
  const filteredStories = stories
    .filter(story => {
      const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || 
                          (filterStatus === 'completed' && story.final_video_url) ||
                          (filterStatus === 'in_progress' && !story.final_video_url && story.segment_count > 0) ||
                          (filterStatus === 'empty' && story.segment_count === 0);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'updated_at') {
        return new Date(b.updated_at) - new Date(a.updated_at);
      } else if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  
  const getStatusInfo = (story) => {
    if (story.final_video_url) {
      return { 
        label: 'Completed', 
        color: 'text-green-400',
        bgColor: 'bg-green-400/20',
        icon: Video 
      };
    } else if (story.segment_count > 0) {
      return { 
        label: 'In Progress', 
        color: 'text-cosmic-accent',
        bgColor: 'bg-cosmic-accent/20',
        icon: Clock 
      };
    } else {
      return { 
        label: 'Empty', 
        color: 'text-white/60',
        bgColor: 'bg-white/10',
        icon: PlusCircle 
      };
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <LoadingSpinner size="large" message="Loading your stories..." />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-tubi font-bold text-white mb-4">
              Your Stories
            </h1>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Manage and explore your video story collection
            </p>
            
            <Link
              to="/create"
              className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill inline-flex items-center space-x-2 hover:shadow-cosmic transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Create New Story</span>
            </Link>
          </motion.div>
          
          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-effect rounded-xl p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search stories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cosmic-accent transition-colors"
                />
              </div>
              
              {/* Filter */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="text-white/60 w-4 h-4" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cosmic-accent"
                  >
                    <option value="all">All Stories</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="empty">Empty</option>
                  </select>
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cosmic-accent"
                >
                  <option value="updated_at">Last Updated</option>
                  <option value="created_at">Date Created</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Stories Grid */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence>
            {filteredStories.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                  {stories.length === 0 ? (
                    <PlusCircle className="w-12 h-12 text-white/40" />
                  ) : (
                    <Search className="w-12 h-12 text-white/40" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {stories.length === 0 ? 'No Stories Yet' : 'No Stories Found'}
                </h3>
                <p className="text-white/60 mb-8 max-w-md mx-auto">
                  {stories.length === 0 
                    ? 'Start your creative journey by creating your first video story'
                    : 'Try adjusting your search or filters to find what you\'re looking for'
                  }
                </p>
                {stories.length === 0 && (
                  <Link
                    to="/create"
                    className="cosmic-button bg-cosmic-accent text-black font-bold py-3 px-6 rounded-pill inline-flex items-center space-x-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>Create Your First Story</span>
                  </Link>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStories.map((story, index) => {
                  const statusInfo = getStatusInfo(story);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -30 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      layout
                    >
                      <div className="glass-effect rounded-xl overflow-hidden hover:shadow-cosmic transition-all duration-300 hover:scale-[1.02]">
                        <Link
                          to={`/story/${story.id}`}
                          className="block"
                        >
                          {/* Story Thumbnail */}
                          <div className="aspect-video bg-gradient-to-br from-cosmic-primary/30 to-cosmic-magenta/30 relative overflow-hidden">
                            {story.final_video_url ? (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-cosmic-accent/20 backdrop-blur-sm flex items-center justify-center">
                                  <Play className="w-6 h-6 text-cosmic-accent ml-1" />
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <StatusIcon className="w-8 h-8 text-white/40 mx-auto mb-2" />
                                  <p className="text-white/60 text-sm">
                                    {story.segment_count} segment{story.segment_count !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className="absolute top-3 right-3">
                              <div className={`${statusInfo.bgColor} px-2 py-1 rounded-pill flex items-center space-x-1`}>
                                <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                                <span className={`text-xs font-medium ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Story Info */}
                          <div className="p-6">
                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
                              {story.title}
                            </h3>
                            
                            {story.description && (
                              <p className="text-white/70 text-sm mb-4 line-clamp-2">
                                {story.description}
                              </p>
                            )}
                            
                            {/* Metadata */}
                            <div className="flex items-center justify-between text-xs text-white/50">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(story.updated_at)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Eye className="w-3 h-3" />
                                  <span>{story.segment_count}</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  if (window.confirm('Delete this story and all its videos?')) {
                                    await actions.deleteStory(story.id);
                                  }
                                }}
                                className="glass-effect px-2 py-1 rounded-lg text-white hover:bg-white/10 transition-colors inline-flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3 text-red-400" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
          
          {/* Load More (if needed in future) */}
          {filteredStories.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12"
            >
              <p className="text-white/60">
                Showing {filteredStories.length} of {stories.length} stories
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StoriesPage;
