import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PlusCircle, Video, Sparkles, ArrowRight, Zap, Globe, Users } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Generation',
      description: 'Create stunning videos from text prompts and images using Google\'s Veo 3 technology'
    },
    {
      icon: Video,
      title: 'Sequential Storytelling',
      description: 'Build longer narratives by chaining video segments that flow seamlessly together'
    },
    {
      icon: Globe,
      title: 'Cloud-Native',
      description: 'Powered by Google Cloud for reliable, scalable video generation and storage'
    },
    {
      icon: Users,
      title: 'Collaborative Stories',
      description: 'Share your stories and collaborate on creative video projects'
    }
  ];
  
  const storyExamples = [
    {
      title: "The Space Explorer",
      description: "Follow an astronaut's journey through distant galaxies",
      gradient: "from-cosmic-primary to-cosmic-magenta"
    },
    {
      title: "Underwater Adventure",
      description: "Dive deep into mysterious ocean realms",
      gradient: "from-cosmic-secondary to-cosmic-violet"
    },
    {
      title: "Time Traveler's Tale",
      description: "Experience different eras through time",
      gradient: "from-cosmic-bright to-cosmic-medium"
    }
  ];
  
  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-hero-gradient mb-6 shadow-cosmic"
            >
              <Sparkles className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-tubi font-black text-white mb-6 hero-text-glow hero-text-responsive">
              Create Video Stories
              <span className="block text-transparent bg-clip-text bg-hero-gradient">
                with AI Magic
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto subtitle-responsive">
              Build captivating video narratives by generating sequential segments 
              that flow together into longer, more compelling stories.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <Link
              to="/create"
              className="cosmic-button bg-cosmic-accent text-black font-bold py-4 px-8 rounded-pill flex items-center space-x-2 text-lg hover:shadow-lg transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Start Creating</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <Link
              to="/stories"
              className="glass-effect text-white font-bold py-4 px-8 rounded-pill flex items-center space-x-2 text-lg hover:bg-white/10 transition-all"
            >
              <Video className="w-5 h-5" />
              <span>Browse Stories</span>
            </Link>
          </motion.div>
          
          {/* Demo Video Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="glass-effect-strong rounded-xl p-8">
              <div className="aspect-video bg-gradient-to-br from-cosmic-primary/20 to-cosmic-magenta/20 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-cosmic-accent/20 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-8 h-8 text-cosmic-accent" />
                  </div>
                  <p className="text-white/60 text-lg">Demo video coming soon</p>
                  <p className="text-white/40">See the platform in action</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-6">
              Powerful Features
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Everything you need to create compelling video stories with AI assistance
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="glass-effect rounded-xl p-6 text-center hover:shadow-cosmic transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-cosmic-accent/20 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-cosmic-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/70">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Story Examples Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-tubi font-bold text-white mb-6">
              Story Inspiration
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Get inspired by these story concepts and start creating your own
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {storyExamples.map((story, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="glass-effect rounded-xl overflow-hidden"
              >
                <div className={`h-48 bg-gradient-to-br ${story.gradient} relative`}>
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center"
                    >
                      <Video className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {story.title}
                  </h3>
                  <p className="text-white/70 mb-4">
                    {story.description}
                  </p>
                  <Link
                    to="/create"
                    className="inline-flex items-center space-x-2 text-cosmic-accent hover:text-white transition-colors"
                  >
                    <span className="font-medium">Create Similar</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-effect-strong rounded-2xl p-12"
          >
            <h2 className="text-4xl font-tubi font-bold text-white mb-6">
              Ready to Tell Your Story?
            </h2>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Join creators who are revolutionizing storytelling with AI-powered video generation.
              Your next masterpiece is just a prompt away.
            </p>
            
            <Link
              to="/create"
              className="cosmic-button bg-cosmic-accent text-black font-bold py-4 px-8 rounded-pill inline-flex items-center space-x-3 text-lg hover:shadow-cosmic-strong transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Your Journey</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
