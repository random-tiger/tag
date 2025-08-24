import React, { createContext, useContext, useReducer, useRef } from 'react';
import { apiClient } from '../services/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  stories: [],
  currentStory: null,
  loading: false,
  error: null,
  generationStatus: {},
};

// Action types
const ActionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_STORIES: 'SET_STORIES',
  SET_CURRENT_STORY: 'SET_CURRENT_STORY',
  ADD_STORY: 'ADD_STORY',
  UPDATE_STORY: 'UPDATE_STORY',
  UPDATE_GENERATION_STATUS: 'UPDATE_GENERATION_STATUS',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
function storyReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case ActionTypes.CLEAR_ERROR:
      return { ...state, error: null };
    
    case ActionTypes.SET_STORIES:
      return { ...state, stories: action.payload, loading: false };
    
    case ActionTypes.SET_CURRENT_STORY:
      return { ...state, currentStory: action.payload, loading: false };
    
    case ActionTypes.ADD_STORY:
      return { 
        ...state, 
        stories: [action.payload, ...state.stories], 
        loading: false 
      };
    
    case ActionTypes.UPDATE_STORY:
      return {
        ...state,
        stories: state.stories.map(story => 
          story.id === action.payload.id ? action.payload : story
        ),
        currentStory: state.currentStory?.id === action.payload.id 
          ? action.payload 
          : state.currentStory,
        loading: false
      };
    
    case ActionTypes.UPDATE_GENERATION_STATUS:
      return {
        ...state,
        generationStatus: {
          ...state.generationStatus,
          [action.payload.operationId]: action.payload.status
        }
      };
    
    default:
      return state;
  }
}

// Create context
const StoryContext = createContext();

// Provider component
export function StoryProvider({ children }) {
  const [state, dispatch] = useReducer(storyReducer, initialState);
  const activePollsRef = useRef(new Set());

  // Helper function to handle API errors
  const handleApiError = (error, defaultMessage = 'An error occurred') => {
    const message = error?.response?.data?.error || error?.message || defaultMessage;
    dispatch({ type: ActionTypes.SET_ERROR, payload: message });
    toast.error(message);
  };

  // Load stories
  const loadStories = async (userId = 'anonymous') => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const response = await apiClient.get(`/stories?user_id=${userId}`);
      dispatch({ type: ActionTypes.SET_STORIES, payload: response.data.stories });
      
    } catch (error) {
      handleApiError(error, 'Failed to load stories');
    }
  };

  // Create new story
  const createStory = async (title, description = '', userId = 'anonymous') => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const response = await apiClient.post('/stories', {
        title,
        description,
        user_id: userId
      });
      
      dispatch({ type: ActionTypes.ADD_STORY, payload: response.data });
      toast.success('Story created successfully!');
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to create story');
      throw error;
    }
  };

  // Load specific story
  const loadStory = async (storyId) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const response = await apiClient.get(`/stories/${storyId}`);
      dispatch({ type: ActionTypes.SET_CURRENT_STORY, payload: response.data });
      // Auto-resume polling for any in-progress segments when loading a story
      resumePollingForStory(response.data);
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to load story');
      throw error;
    }
  };

  // Generate video segment
  const generateVideoSegment = async (storyId, prompt, imageFile = null, usePreviousFrame = false) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('use_previous_frame', usePreviousFrame.toString());
      
      if (imageFile) {
        formData.append('image', imageFile);
      }
      
      const response = await apiClient.post(`/stories/${storyId}/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Start polling for status updates
      startStatusPolling(response.data.operation_id);
      
      toast.success('Video generation started!');
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to start video generation');
      throw error;
    }
  };

  // Stitch story videos
  const stitchStory = async (storyId) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const response = await apiClient.post(`/stories/${storyId}/stitch`);
      
      // Reload the story to get updated data
      await loadStory(storyId);
      
      toast.success('Story stitched successfully!');
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to stitch story');
      throw error;
    }
  };

  // Delete a story
  const deleteStory = async (storyId) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      await apiClient.delete(`/stories/${storyId}`);
      toast.success('Story deleted');
      await loadStories();
    } catch (error) {
      handleApiError(error, 'Failed to delete story');
      throw error;
    }
  };

  // Delete a single segment
  const deleteSegment = async (segmentId, storyId) => {
    try {
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      await apiClient.delete(`/segments/${segmentId}`);
      toast.success('Segment deleted');
      if (storyId) await loadStory(storyId);
    } catch (error) {
      handleApiError(error, 'Failed to delete segment');
      throw error;
    }
  };

  // AI prompt assistance removed

  // Start polling for generation status
  const startStatusPolling = (operationId) => {
    // Avoid duplicate pollers per operation
    if (activePollsRef.current.has(operationId)) return;
    activePollsRef.current.add(operationId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/generation-status/${operationId}`);
        const status = response.data;
        
        dispatch({
          type: ActionTypes.UPDATE_GENERATION_STATUS,
          payload: { operationId, status }
        });
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          activePollsRef.current.delete(operationId);
          toast.success('Video generation completed!');
          
          // Reload current story if it matches
          if (state.currentStory && status.segment_id) {
            loadStory(state.currentStory.id);
          }
          
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          activePollsRef.current.delete(operationId);
          toast.error(`Video generation failed: ${status.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        // Silently handle polling errors to avoid spam
        console.error('Status polling error:', error);
        clearInterval(pollInterval);
        activePollsRef.current.delete(operationId);
      }
    }, 15000); // Poll every 15 seconds
    
    // Clear polling after 10 minutes
    setTimeout(() => { clearInterval(pollInterval); activePollsRef.current.delete(operationId); }, 600000);
  };

  // Resume polling helper for a story object
  const resumePollingForStory = (story) => {
    try {
      const segments = Array.isArray(story?.segments) ? story.segments : [];
      segments
        .filter(seg => (seg.status === 'generating' || seg.status === 'publishing') && !!seg.operation_id)
        .forEach(seg => startStatusPolling(seg.operation_id));
    } catch (e) {
      // no-op
    }
  };

  // Entity library removed

  // Context value
  const contextValue = {
    ...state,
    actions: {
      loadStories,
      createStory,
      loadStory,
      generateVideoSegment,
      stitchStory,
      deleteStory,
      deleteSegment,
      clearError: () => dispatch({ type: ActionTypes.CLEAR_ERROR }),
    }
  };

  return (
    <StoryContext.Provider value={contextValue}>
      {children}
    </StoryContext.Provider>
  );
}

// Hook to use the story context
export function useStory() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
}
