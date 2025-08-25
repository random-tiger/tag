import axios from 'axios';

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  timeout: 120000, // 2 minutes for video operations
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for logging and auth
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp for request tracking
    config.metadata = { startTime: new Date() };
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    // Calculate response time
    const endTime = new Date();
    const duration = endTime.getTime() - response.config.metadata.startTime.getTime();
    
    // Log responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }
    
    return response;
  },
  (error) => {
    // Calculate response time
    if (error.config?.metadata?.startTime) {
      const endTime = new Date();
      const duration = endTime.getTime() - error.config.metadata.startTime.getTime();
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ API Error: ${error.config.method?.toUpperCase()} ${error.config.url} (${duration}ms)`, error.response?.data || error.message);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      error.message = 'Network error - please check your connection';
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Health check
  health: () => apiClient.get('/health'),
  
  // Stories
  createStory: (data) => apiClient.post('/stories', data),
  getStories: (userId = 'anonymous') => apiClient.get(`/stories?user_id=${userId}`),
  getStory: (storyId) => apiClient.get(`/stories/${storyId}`),
  
  // Story Generation
  generateStoryFromPrompt: (prompt, preferences = {}) => 
    apiClient.post('/stories/generate', { prompt, preferences }),
  getStoryGeneration: (storyId) => apiClient.get(`/stories/${storyId}/generation`),
  saveStoryGeneration: (storyId, storyData) => apiClient.put(`/stories/${storyId}/generation`, { story_data: storyData }),
  updateStoryElement: (storyId, elementType, storyData, updates, elementId = null) => {
    const url = elementId ? 
      `/stories/${storyId}/elements/${elementType}/${elementId}` :
      `/stories/${storyId}/elements/${elementType}`;
    return apiClient.put(url, { story_data: storyData, updates });
  },
  regenerateStoryElement: (storyId, elementType, storyData, elementId = null) => {
    const url = elementId ?
      `/stories/${storyId}/regenerate/${elementType}/${elementId}` :
      `/stories/${storyId}/regenerate/${elementType}`;
    return apiClient.post(url, { story_data: storyData });
  },
  
  // Video generation
  generateVideo: (storyId, formData) => apiClient.post(`/stories/${storyId}/generate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Story stitching
  stitchStory: (storyId) => apiClient.post(`/stories/${storyId}/stitch`),
  
  // Operation status
  getGenerationStatus: (operationId) => apiClient.get(`/generation-status/${operationId}`),
  
  // Entity Library
  getEntityLibrary: (userId = 'default_user') => apiClient.get(`/entity-library?user_id=${userId}`),
  saveEntityToLibrary: (entityData) => apiClient.post('/entity-library', entityData),
  deleteEntityFromLibrary: (entityId, userId = 'default_user') => 
    apiClient.delete(`/entity-library/${entityId}?user_id=${userId}`),
};

// Attach commonly used endpoint helpers directly onto apiClient for convenience
// This preserves backward compatibility where code calls apiClient.getEntityLibrary, etc.
apiClient.getEntityLibrary = endpoints.getEntityLibrary;
apiClient.saveEntityToLibrary = endpoints.saveEntityToLibrary;
apiClient.deleteEntityFromLibrary = endpoints.deleteEntityFromLibrary;
apiClient.getStories = endpoints.getStories;
apiClient.getStory = endpoints.getStory;
apiClient.createStory = endpoints.createStory;
apiClient.generateStoryFromPrompt = endpoints.generateStoryFromPrompt;
apiClient.getStoryGeneration = endpoints.getStoryGeneration;
apiClient.saveStoryGeneration = endpoints.saveStoryGeneration;
apiClient.updateStoryElement = endpoints.updateStoryElement;
apiClient.regenerateStoryElement = endpoints.regenerateStoryElement;
apiClient.generateVideo = endpoints.generateVideo;
apiClient.stitchStory = endpoints.stitchStory;
apiClient.getGenerationStatus = endpoints.getGenerationStatus;

export default apiClient;
