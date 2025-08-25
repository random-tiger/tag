import React, { createContext, useContext, useReducer, useRef } from 'react';
import { apiClient } from '../services/api';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  stories: [],
  currentStory: null,
  currentStoryGeneration: null, // For the new story generation flow
  loading: false,
  error: null,
  generationStatus: {},
  storyGenerationStep: 1, // Track current step in the 5-step flow
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
  SET_CURRENT_STORY_GENERATION: 'SET_CURRENT_STORY_GENERATION',
  SET_STORY_GENERATION_STEP: 'SET_STORY_GENERATION_STEP',
  UPDATE_STORY_GENERATION: 'UPDATE_STORY_GENERATION',
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
    
    case ActionTypes.SET_CURRENT_STORY_GENERATION:
      return {
        ...state,
        currentStoryGeneration: action.payload,
        loading: false
      };
    
    case ActionTypes.SET_STORY_GENERATION_STEP:
      return {
        ...state,
        storyGenerationStep: action.payload
      };
    
    case ActionTypes.UPDATE_STORY_GENERATION:
      return {
        ...state,
        currentStoryGeneration: action.payload,
        loading: false
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
      // Hydrate generation data if present so edits/regens use same source
      if (response.data && response.data.generation_data) {
        dispatch({ type: ActionTypes.SET_CURRENT_STORY_GENERATION, payload: response.data.generation_data });
      }
      // Auto-resume polling for any in-progress segments when loading a story
      resumePollingForStory(response.data);
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to load story');
      throw error;
    }
  };

  // Generate video segment
  const generateVideoSegment = async (storyId, prompt, imageFile = null, usePreviousFrame = false, options = {}) => {
    try {
      if (!options.silent) {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      }
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('use_previous_frame', usePreviousFrame.toString());
      if (options.targetSequence != null) {
        formData.append('target_sequence', String(options.targetSequence));
      }
      
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
      if (!options.silent) {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
      
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

  // Generate story from prompt (new flow step 1-2)
  const generateStoryFromPrompt = async (prompt, preferences = {}) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      const response = await apiClient.generateStoryFromPrompt(prompt, preferences);
      dispatch({ type: ActionTypes.SET_CURRENT_STORY_GENERATION, payload: response.data });
      dispatch({ type: ActionTypes.SET_STORY_GENERATION_STEP, payload: 3 }); // Go to review step
      
      toast.success('Story generated successfully!');
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to generate story');
      throw error;
    }
  };

  // Update story element (prefer persisting to actual story if present)
  const updateStoryElement = async (elementType, updates, elementId = null) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      if (!state.currentStoryGeneration) {
        throw new Error('No story data available');
      }
      
      // Use real story id if we have one, so backend can persist generation_data
      const storyIdForOps = state.currentStory?.id || state.currentStoryGeneration.id;
      const response = await apiClient.updateStoryElement(
        storyIdForOps,
        elementType,
        state.currentStoryGeneration,
        updates,
        elementId
      );
      
      dispatch({ type: ActionTypes.UPDATE_STORY_GENERATION, payload: response.data });
      toast.success('Story updated successfully!');
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to update story');
      throw error;
    }
  };

  // Regenerate story element (persist when possible)
  const regenerateStoryElement = async (elementType, elementId = null) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      if (!state.currentStoryGeneration) {
        throw new Error('No story data available');
      }
      
      const storyIdForOps = state.currentStory?.id || state.currentStoryGeneration.id;
      const response = await apiClient.regenerateStoryElement(
        storyIdForOps,
        elementType,
        state.currentStoryGeneration,
        elementId
      );
      
      dispatch({ type: ActionTypes.UPDATE_STORY_GENERATION, payload: response.data });
      toast.success('Story regenerated successfully!');
      
      return response.data;
      
    } catch (error) {
      handleApiError(error, 'Failed to regenerate story');
      throw error;
    }
  };

  // Set story generation step
  const setStoryGenerationStep = (step) => {
    dispatch({ type: ActionTypes.SET_STORY_GENERATION_STEP, payload: step });
  };

  // Create actual story from generated story data and persist generation
  const createStoryFromGeneration = async (storyGeneration, userId = 'anonymous', options = {}) => {
    try {
      if (!options.silent) {
        dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      }
      dispatch({ type: ActionTypes.CLEAR_ERROR });
      
      // Ensure we have a non-empty, human-friendly title
      const rawTitle = (storyGeneration?.title || '').trim();
      const fallbackTitle = rawTitle
        ? rawTitle
        : (storyGeneration?.premise || storyGeneration?.prompt || 'Untitled Story').slice(0, 60);

      // Create the story using existing API
      const story = await createStory(fallbackTitle, storyGeneration.premise || '', userId);

      // Persist generation data to the created story
      try {
        await apiClient.saveStoryGeneration(story.id, storyGeneration);
        // Reload to pick up any server-side normalization
        await loadStory(story.id);
      } catch (persistErr) {
        console.error('Failed to persist story generation data', persistErr);
      }
      
      // Clear wizard state unless caller requests to preserve the flow
      if (!options.preserveWizard) {
        dispatch({ type: ActionTypes.SET_CURRENT_STORY_GENERATION, payload: null });
        dispatch({ type: ActionTypes.SET_STORY_GENERATION_STEP, payload: 1 });
      }
      
      if (!options.preserveWizard && !options.silent) {
        toast.success('Story created successfully!');
      }
      return story;
      
    } catch (error) {
      handleApiError(error, 'Failed to create story');
      throw error;
    }
  };

  // Ensure a story exists; create from current generation if needed, preserving wizard state
  const ensureStoryExists = async (userId = 'anonymous') => {
    // If we already have a current story in context, use it
    if (state.currentStory?.id) return state.currentStory;

    // Otherwise, create one from the current generation and immediately load it
    if (state.currentStoryGeneration) {
      const created = await createStoryFromGeneration(
        state.currentStoryGeneration,
        userId,
        { preserveWizard: true, silent: true }
      );
      // Load it into context so subsequent operations (polling/UI) can see segments
      const loaded = await loadStory(created.id);
      return loaded || created;
    }

    throw new Error('No story or generated story data available to create from');
  };

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
      ensureStoryExists,
      // New story generation actions
      generateStoryFromPrompt,
      updateStoryElement,
      regenerateStoryElement,
      setStoryGenerationStep,
      createStoryFromGeneration,
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
