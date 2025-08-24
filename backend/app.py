"""
Main Flask application for the Video Story Generation Platform
"""

import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from services.video_service import VideoService
from services.story_service import StoryService
from services.cloud_service import CloudService
from config.settings import Config
from utils.logger import setup_logging

# Load environment variables
load_dotenv()

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend communication
    CORS(app, origins=["http://localhost:5000", "http://localhost:3000"])
    
    # Setup logging and observability
    setup_logging(app)
    
    # Initialize services
    cloud_service = CloudService()
    video_service = VideoService(cloud_service)
    story_service = StoryService(cloud_service)
    
    @app.route('/health', methods=['GET'])
    def health_check():
        """Health check endpoint"""
        return jsonify({"status": "healthy", "service": "video-story-platform"})
    
    @app.route('/api/stories', methods=['POST'])
    def create_story():
        """Create a new video story"""
        try:
            data = request.get_json()
            story = story_service.create_story(
                title=data.get('title'),
                description=data.get('description'),
                user_id=data.get('user_id', 'anonymous')
            )
            return jsonify(story), 201
        except Exception as e:
            app.logger.error(f"Error creating story: {str(e)}")
            return jsonify({"error": "Failed to create story"}), 500
    
    @app.route('/api/stories/<story_id>', methods=['GET'])
    def get_story(story_id):
        """Get story details with all video segments"""
        try:
            story = story_service.get_story(story_id)
            if not story:
                return jsonify({"error": "Story not found"}), 404
            return jsonify(story)
        except Exception as e:
            app.logger.error(f"Error fetching story: {str(e)}")
            return jsonify({"error": "Failed to fetch story"}), 500

    @app.route('/api/stories/<story_id>', methods=['DELETE'])
    def delete_story(story_id):
        """Delete a story and all related data"""
        try:
            ok = story_service.delete_story(story_id)
            status = 200 if ok else 404
            return jsonify({"deleted": bool(ok)}), status
        except Exception as e:
            app.logger.error(f"Error deleting story: {str(e)}")
            return jsonify({"error": "Failed to delete story"}), 500

    @app.route('/api/segments/<segment_id>', methods=['DELETE'])
    def delete_segment(segment_id):
        """Delete a single segment and its artifacts"""
        try:
            seg = cloud_service.get_document(Config.SEGMENTS_COLLECTION, segment_id)
            if not seg:
                return jsonify({"deleted": False}), 404
            # Delete GCS artifacts
            cloud_service.delete_gcs_prefix(f"videos/{segment_id}/")
            # Delete operation record
            op_id = seg.get('operation_id')
            if op_id:
                cloud_service.delete_document(Config.OPERATIONS_COLLECTION, op_id)
            # Delete segment doc
            cloud_service.delete_document(Config.SEGMENTS_COLLECTION, segment_id)
            return jsonify({"deleted": True})
        except Exception as e:
            app.logger.error(f"Error deleting segment: {str(e)}")
            return jsonify({"error": "Failed to delete segment"}), 500

    # Prompt assist endpoint removed
    
    @app.route('/api/stories', methods=['GET'])
    def list_stories():
        """List all stories for a user"""
        try:
            user_id = request.args.get('user_id', 'anonymous')
            stories = story_service.list_stories(user_id)
            return jsonify({"stories": stories})
        except Exception as e:
            app.logger.error(f"Error listing stories: {str(e)}")
            return jsonify({"error": "Failed to list stories"}), 500
    
    @app.route('/api/stories/<story_id>/generate', methods=['POST'])
    def generate_video_segment(story_id):
        """Generate a new video segment for a story"""
        try:
            # Handle both JSON and form data
            if request.is_json:
                data = request.get_json()
                prompt = data.get('prompt', '')
                use_previous_frame = data.get('use_previous_frame', False)
                image_file = None
            else:
                # Handle form data from frontend
                prompt = request.form.get('prompt', '')
                use_previous_frame = request.form.get('use_previous_frame', 'false').lower() == 'true'
                image_file = request.files.get('image') if 'image' in request.files else None
            
            app.logger.info(f"Generating video for story {story_id} with prompt: {prompt}")
            
            # Generate video using the service
            result = video_service.generate_video_segment(
                story_id=story_id,
                prompt=prompt,
                image_file=image_file,
                use_previous_frame=use_previous_frame
            )
            
            return jsonify(result), 201
            
        except Exception as e:
            app.logger.error(f"Error generating video: {str(e)}")
            return jsonify({"error": "Failed to generate video"}), 500
    
    @app.route('/api/stories/<story_id>/stitch', methods=['POST'])
    def stitch_story(story_id):
        """Stitch all video segments into final story"""
        try:
            app.logger.info(f"Stitching story {story_id}")
            
            result = video_service.stitch_story_videos(story_id)
            
            return jsonify(result)
            
        except Exception as e:
            app.logger.error(f"Error stitching story: {str(e)}")
            return jsonify({"error": "Failed to stitch story"}), 500
    
    @app.route('/api/generation-status/<operation_id>', methods=['GET'])
    def check_generation_status(operation_id):
        """Check the status of a video generation operation"""
        try:
            status = video_service.check_operation_status(operation_id)
            return jsonify(status)
        except Exception as e:
            import traceback
            app.logger.error(f"Error checking operation status: {str(e)}")
            app.logger.error(f"Stack trace: {traceback.format_exc()}")
            return jsonify({"status": "error", "error": str(e)}), 500

    # Entity Library endpoints removed
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=True)
