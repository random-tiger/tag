"""
Configuration settings for the application
"""

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Google Cloud settings
    GOOGLE_CLOUD_PROJECT = os.environ.get('GOOGLE_CLOUD_PROJECT', 'tubi-gemini-sandbox')
    GOOGLE_CLOUD_REGION = os.environ.get('GOOGLE_CLOUD_REGION', 'us-central1')
    GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'service-account-key.json')
    
    # Storage settings
    GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME', 'video-story-platform-storage')
    TEMP_UPLOAD_FOLDER = os.environ.get('TEMP_UPLOAD_FOLDER', 'temp_uploads')
    
    # Video generation settings
    VEO_MODEL_STANDARD = "veo-3.0-generate-001"
    VEO_MODEL_FAST = "veo-3.0-fast-generate-001"
    VEO_MODEL_IMAGE = "veo-3.0-generate-preview"
    GEMINI_MODEL = "gemini-2.5-flash"
    
    # Video settings
    DEFAULT_VIDEO_DURATION = 8  # seconds
    DEFAULT_ASPECT_RATIO = "16:9"
    DEFAULT_RESOLUTION = "720p"
    MAX_SEGMENTS_PER_STORY = 100
    
    # Performance settings (aligned with veo3_video_generation.py patterns)
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file upload
    OPERATION_POLL_INTERVAL = 15  # seconds (matches documentation polling interval)
    OPERATION_TIMEOUT = 600  # seconds (10 minutes)
    
    # Firestore collection names
    STORIES_COLLECTION = 'stories'
    SEGMENTS_COLLECTION = 'segments'
    OPERATIONS_COLLECTION = 'operations'
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Ensure temp upload folder exists
        os.makedirs(Config.TEMP_UPLOAD_FOLDER, exist_ok=True)
        
        # Set max content length
        app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
