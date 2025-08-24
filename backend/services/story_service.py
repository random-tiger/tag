"""
Story management service
"""

import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from config.settings import Config
from services.cloud_service import CloudService

class StoryService:
    """Service for managing video stories and their metadata"""
    
    def __init__(self, cloud_service: CloudService):
        self.cloud_service = cloud_service
        self.logger = logging.getLogger(__name__)
    
    def create_story(self, title: str, description: str = "", user_id: str = "anonymous") -> Dict[str, Any]:
        """Create a new video story"""
        try:
            story_id = str(uuid.uuid4())
            
            self.logger.info(f"Creating new story: {title}")
            
            story_data = {
                'title': title,
                'description': description,
                'user_id': user_id,
                'status': 'created',
                'segment_count': 0,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'final_video_url': None,
                'stitched_at': None
            }
            
            story = self.cloud_service.save_document(Config.STORIES_COLLECTION, story_id, story_data)
            
            self.logger.info(f"Story created with ID: {story_id}")
            return story
            
        except Exception as e:
            self.logger.error(f"Error creating story: {str(e)}")
            raise
    
    def get_story(self, story_id: str) -> Optional[Dict[str, Any]]:
        """Get a story with all its segments"""
        try:
            # Get story document
            story = self.cloud_service.get_document(Config.STORIES_COLLECTION, story_id)
            if not story:
                return None
            
            # Get all segments for this story
            segments = self.cloud_service.query_documents(
                Config.SEGMENTS_COLLECTION,
                filters=[('story_id', '==', story_id)]
            )
            
            # Sort segments by sequence number
            segments.sort(key=lambda x: x.get('sequence_number', 0))
            
            # Add segments to story
            story['segments'] = segments
            story['segment_count'] = len(segments)
            
            self.logger.info(f"Retrieved story {story_id} with {len(segments)} segments")
            return story
            
        except Exception as e:
            self.logger.error(f"Error getting story: {str(e)}")
            raise
    
    def list_stories(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """List all stories for a user"""
        try:
            stories = self.cloud_service.query_documents(
                Config.STORIES_COLLECTION,
                filters=[('user_id', '==', user_id)],
                limit=limit
            )
            
            # Add segment counts for each story
            for story in stories:
                segments = self.cloud_service.query_documents(
                    Config.SEGMENTS_COLLECTION,
                    filters=[('story_id', '==', story['id'])]
                )
                story['segment_count'] = len(segments)
                story['last_segment_status'] = 'none'
                
                if segments:
                    # Sort segments and get status of last one
                    segments.sort(key=lambda x: x.get('sequence_number', 0))
                    story['last_segment_status'] = segments[-1].get('status', 'unknown')
            
            # Sort stories by updated_at (newest first)
            stories.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
            
            self.logger.info(f"Retrieved {len(stories)} stories for user {user_id}")
            return stories
            
        except Exception as e:
            self.logger.error(f"Error listing stories: {str(e)}")
            raise
    
    def update_story(self, story_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a story's metadata"""
        try:
            # Add updated timestamp
            updates['updated_at'] = datetime.utcnow().isoformat()
            
            updated_story = self.cloud_service.update_document(
                Config.STORIES_COLLECTION,
                story_id,
                updates
            )
            
            self.logger.info(f"Story {story_id} updated")
            return updated_story
            
        except Exception as e:
            self.logger.error(f"Error updating story: {str(e)}")
            raise
    
    def delete_story(self, story_id: str) -> bool:
        """Delete a story and all its segments, plus GCS artifacts."""
        try:
            # Get all segments for this story
            segments = self.cloud_service.query_documents(
                Config.SEGMENTS_COLLECTION,
                filters=[('story_id', '==', story_id)]
            )
            
            # Delete all segments
            for segment in segments:
                # Delete GCS artifacts for segment
                seg_prefix = f"videos/{segment['id']}/"
                self.cloud_service.delete_gcs_prefix(seg_prefix)
                # Delete segment doc
                self.cloud_service.delete_document(Config.SEGMENTS_COLLECTION, segment['id'])
                
                # Also delete any associated operation records
                try:
                    self.cloud_service.delete_document(Config.OPERATIONS_COLLECTION, segment['operation_id'])
                except:
                    pass  # Operation might not exist
            
            # Delete the story
            # Delete stitched video if present
            story = self.cloud_service.get_document(Config.STORIES_COLLECTION, story_id)
            if story and story.get('final_video_url', '').startswith('gs://'):
                self.cloud_service.delete_gcs_uri(story['final_video_url'])
            # Delete story data under prefix
            self.cloud_service.delete_gcs_prefix(f"stories/{story_id}/")
            self.cloud_service.delete_document(Config.STORIES_COLLECTION, story_id)
            
            self.logger.info(f"Story {story_id} and {len(segments)} segments deleted")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting story: {str(e)}")
            raise
    
    def get_story_stats(self, story_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for a story"""
        try:
            story = self.get_story(story_id)
            if not story:
                return {}
            
            segments = story.get('segments', [])
            
            # Calculate stats
            stats = {
                'total_segments': len(segments),
                'completed_segments': len([s for s in segments if s.get('status') == 'completed']),
                'generating_segments': len([s for s in segments if s.get('status') == 'generating']),
                'failed_segments': len([s for s in segments if s.get('status') == 'failed']),
                'total_duration_seconds': len(segments) * Config.DEFAULT_VIDEO_DURATION,
                'estimated_final_duration': len([s for s in segments if s.get('status') == 'completed']) * Config.DEFAULT_VIDEO_DURATION,
                'creation_date': story.get('created_at'),
                'last_updated': story.get('updated_at'),
                'is_stitchable': all(s.get('status') == 'completed' for s in segments) and len(segments) > 0,
                'has_final_video': bool(story.get('final_video_url')),
                'final_video_url': story.get('final_video_url')
            }
            
            self.logger.info(f"Generated stats for story {story_id}")
            return stats
            
        except Exception as e:
            self.logger.error(f"Error getting story stats: {str(e)}")
            raise
    
    def get_segment(self, segment_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific segment"""
        try:
            segment = self.cloud_service.get_document(Config.SEGMENTS_COLLECTION, segment_id)
            return segment
            
        except Exception as e:
            self.logger.error(f"Error getting segment: {str(e)}")
            raise
    
    def update_segment_status(self, segment_id: str, status: str, additional_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Update a segment's status and optional additional data"""
        try:
            updates = {
                'status': status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if additional_data:
                updates.update(additional_data)
            
            updated_segment = self.cloud_service.update_document(
                Config.SEGMENTS_COLLECTION,
                segment_id,
                updates
            )
            
            # Update the parent story's updated_at timestamp
            story_id = updated_segment.get('story_id')
            if story_id:
                self.update_story(story_id, {})
            
            self.logger.info(f"Segment {segment_id} status updated to {status}")
            return updated_segment
            
        except Exception as e:
            self.logger.error(f"Error updating segment status: {str(e)}")
            raise
