"""
Video generation and processing service
"""

import os
import time
import uuid
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import base64
# Video processing imports - will be dynamically imported when needed
# import cv2
# from moviepy.editor import VideoFileClip, concatenate_videoclips  
# from PIL import Image
import tempfile

from google.genai import types
from config.settings import Config
from services.cloud_service import CloudService

class VideoService:
    """Service for video generation, processing, and management"""
    
    def __init__(self, cloud_service: CloudService):
        self.cloud_service = cloud_service
        self.logger = logging.getLogger(__name__)
        
        # Ensure temp directory exists
        os.makedirs(Config.TEMP_UPLOAD_FOLDER, exist_ok=True)
    
    def generate_video_segment(self, story_id: str, prompt: str, 
                             image_file=None, use_previous_frame: bool = False,
                             target_sequence: int = None) -> Dict[str, Any]:
        """Generate a new video segment for a story"""
        try:
            segment_id = str(uuid.uuid4())
            operation_id = str(uuid.uuid4())
            
            self.logger.info(f"Generating video segment {segment_id} for story {story_id}")
            
            # Get story to check sequence
            story = self.cloud_service.get_document(Config.STORIES_COLLECTION, story_id)
            if not story:
                raise ValueError("Story not found")
            
            # Get previous segments to determine sequence number
            previous_segments = self.cloud_service.query_documents(
                Config.SEGMENTS_COLLECTION,
                filters=[('story_id', '==', story_id)],
            )
            # If a target sequence is provided (re-generate a specific scene), use it
            if isinstance(target_sequence, int) and target_sequence > 0:
                sequence_number = target_sequence
            else:
                sequence_number = len(previous_segments) + 1
            
            self.logger.info(f"🎬 SEGMENT GENERATION: Story {story_id}, Sequence #{sequence_number}")
            self.logger.info(f"🎬 SEGMENT GENERATION: use_previous_frame={use_previous_frame}")
            self.logger.info(f"🎬 SEGMENT GENERATION: Found {len(previous_segments)} existing segments")
            
            # Prepare generation parameters
            # Default to using the scene prompt verbatim to avoid losing semantic details
            enhanced_prompt = (prompt or '').strip()
            starting_image = None
            cleanup_paths: List[str] = []
            
            # Handle image input
            if image_file:
                # Save uploaded image temporarily
                image_path = os.path.join(Config.TEMP_UPLOAD_FOLDER, f"{segment_id}_input.jpg")
                image_file.save(image_path)
                
                # Upload to cloud storage
                image_gcs_path = f"stories/{story_id}/segments/{segment_id}/input_image.jpg"
                image_url = self.cloud_service.upload_file_to_gcs(image_path, image_gcs_path)
                
                # Create Image type for Veo
                starting_image = types.Image.from_file(location=image_path)
                
                # Include original scene text; avoid rewriting to preserve intent
                # Add a light note for I2V continuity
                enhanced_prompt = f"Use the provided reference image for visual continuity. Scene details: {prompt}".strip()
                # Defer cleanup until after generation call
                cleanup_paths.append(image_path)
                
            elif use_previous_frame and previous_segments:
                # Prefer the latest completed segment with a video_url
                completed_with_video = [s for s in previous_segments if s.get('video_url')]
                previous_segment = (
                    max(completed_with_video, key=lambda x: x.get('sequence_number', 0))
                    if completed_with_video else
                    max(previous_segments, key=lambda x: x.get('sequence_number', 0))
                )
                self.logger.info(f"🎬 CONTINUITY: Found {len(previous_segments)} previous segments")
                self.logger.info(f"🎬 CONTINUITY: Using segment #{previous_segment.get('sequence_number', 0)} as reference")
                self.logger.info(f"🎬 CONTINUITY: Previous prompt was: '{previous_segment.get('original_prompt', 'N/A')}'")
                self.logger.info(f"🎬 CONTINUITY: Previous video URL: {previous_segment.get('video_url', 'N/A')}")

                if previous_segment.get('video_url'):
                    self.logger.info("🎬 CONTINUITY: Attempting frame extraction from previous video...")
                    starting_image = self._extract_last_frame_as_image(previous_segment['video_url'])
                    # Always include prior prompt as textual context
                    continuity_context = f"This scene continues from the previous scene. Previous prompt: {previous_segment.get('original_prompt', '')}"
                    if starting_image:
                        self.logger.info("🎬 CONTINUITY: ✅ Frame extraction successful - using image + original scene text")
                        enhanced_prompt = f"{continuity_context}. Scene details: {prompt}".strip()
                    else:
                        # Fallback to text-only with continuity context; keep original text intact
                        self.logger.info("🎬 CONTINUITY: ❌ Frame extraction failed - using text continuity context")
                        self.logger.info(f"🎬 CONTINUITY: Context being added: '{continuity_context}'")
                        enhanced_prompt = f"{continuity_context}. {prompt}".strip()
                        self.logger.info(f"🎬 CONTINUITY: Final prompt: '{enhanced_prompt}'")
                else:
                    self.logger.warning("🎬 CONTINUITY: No video URL found in previous segments - using text continuity context")
                    continuity_context = f"This scene continues from the previous scene. Previous prompt: {previous_segment.get('original_prompt', '')}"
                    enhanced_prompt = self.cloud_service.generate_enhanced_prompt(f"{continuity_context}. {prompt}")
            else:
                # Text-only generation; pass through the scene prompt as-is to Veo
                enhanced_prompt = (prompt or '').strip()
            
            # Always log the final enhanced/refined prompt that will be used
            try:
                self.logger.info(f"🎬 PROMPT: Final enhanced prompt: '{enhanced_prompt}'")
            except Exception:
                pass

            # Create segment document
            segment_data = {
                'story_id': story_id,
                'sequence_number': sequence_number,
                'original_prompt': prompt,
                'enhanced_prompt': enhanced_prompt,
                'status': 'generating',
                'created_at': datetime.utcnow().isoformat(),
                'operation_id': operation_id,
                'has_input_image': image_file is not None,
                'uses_previous_frame': use_previous_frame
            }
            
            self.cloud_service.save_document(Config.SEGMENTS_COLLECTION, segment_id, segment_data)
            
            # Start video generation
            self._start_video_generation(segment_id, enhanced_prompt, starting_image)
            
            # Best-effort cleanup of any temp files used for seeding
            for p in cleanup_paths:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass
            
            return {
                'segment_id': segment_id,
                'operation_id': operation_id,
                'status': 'generating',
                'enhanced_prompt': enhanced_prompt,
                'sequence_number': sequence_number
            }
            
        except Exception as e:
            self.logger.error(f"Error generating video segment: {str(e)}")
            raise
    
    def _start_video_generation(self, segment_id: str, prompt: str, image: types.Image = None):
        """Start the video generation process"""
        try:
            # Choose model based on whether we have an image
            model = Config.VEO_MODEL_IMAGE if image else Config.VEO_MODEL_FAST
            
            # Configure generation parameters
            config = types.GenerateVideosConfig(
                aspect_ratio=Config.DEFAULT_ASPECT_RATIO,
                number_of_videos=1,
                duration_seconds=Config.DEFAULT_VIDEO_DURATION,
                resolution=Config.DEFAULT_RESOLUTION,
                person_generation="allow_adult",
                enhance_prompt=True,
                generate_audio=True,
                output_gcs_uri=f"gs://{Config.GCS_BUCKET_NAME}/videos/{segment_id}/"
            )
            
            # Start generation
            operation = self.cloud_service.generate_videos(
                model=model,
                prompt=prompt,
                config=config,
                image=image
            )
            
            # Save operation details - store by operation_id for proper lookup
            operation_data = {
                'segment_id': segment_id,
                'operation_name': operation.name,
                'status': 'running',
                'created_at': datetime.utcnow().isoformat(),
                'model_used': model
            }
            
            # Get operation_id from segment data to use as document ID
            segment_doc = self.cloud_service.get_document(Config.SEGMENTS_COLLECTION, segment_id)
            operation_id = segment_doc['operation_id']
            
            self.cloud_service.save_document(Config.OPERATIONS_COLLECTION, operation_id, operation_data)
            
            self.logger.info(f"Video generation started for segment {segment_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to start video generation: {str(e)}")
            # Update segment status to failed
            self.cloud_service.update_document(
                Config.SEGMENTS_COLLECTION, 
                segment_id, 
                {'status': 'failed', 'error': str(e)}
            )
            raise
    
    def check_operation_status(self, operation_id: str) -> Dict[str, Any]:
        """Check the status of a video generation operation and finalize when done."""
        try:
            # Get operation details from Firestore
            operation_doc = self.cloud_service.get_document(Config.OPERATIONS_COLLECTION, operation_id)
            if not operation_doc:
                return {'status': 'not_found'}

            operation_name = operation_doc['operation_name']
            operation = self.cloud_service.get_operation_status(operation_name)

            status_response = {
                'status': 'running' if not getattr(operation, 'done', False) else 'completed',
                'segment_id': operation_doc['segment_id'],
                'model_used': operation_doc.get('model_used'),
                'operation_name': operation_name
            }

            # If still running, return early
            if not getattr(operation, 'done', False):
                return status_response

            # If errored, mark failed
            if getattr(operation, 'error', None):
                error_msg = str(operation.error)
                self.cloud_service.update_document(
                    Config.SEGMENTS_COLLECTION,
                    operation_doc['segment_id'],
                    {
                        'status': 'failed',
                        'error': error_msg,
                        'failed_at': datetime.utcnow().isoformat()
                    }
                )
                status_response.update({'status': 'failed', 'error': error_msg})
                return status_response

            # Parse response for videos (gcsUri preferred; bytes fallback)
            primary_url: Optional[str] = None
            video_urls: List[str] = []
            resp: Dict[str, Any] = getattr(operation, 'response', {}) or {}
            videos = resp.get('videos') if isinstance(resp, dict) else None
            if isinstance(videos, list):
                for idx, v in enumerate(videos):
                    if isinstance(v, dict):
                        gcs_uri = v.get('gcsUri')
                        if gcs_uri:
                            video_urls.append(gcs_uri)
                            continue
                        b64 = v.get('bytesBase64Encoded')
                        if b64:
                            try:
                                video_bytes = base64.b64decode(b64)
                                temp_path = os.path.join(
                                    Config.TEMP_UPLOAD_FOLDER,
                                    f"{operation_doc['segment_id']}_{idx}.mp4",
                                )
                                with open(temp_path, 'wb') as f:
                                    f.write(video_bytes)
                                dest_path = f"videos/{operation_doc['segment_id']}/generated_{idx}.mp4"
                                uploaded_url = self.cloud_service.upload_file_to_gcs(temp_path, dest_path)
                                os.remove(temp_path)
                                video_urls.append(uploaded_url)
                            except Exception as ex:
                                self.logger.error(f"Failed saving returned video bytes: {ex}")

            primary_url = video_urls[0] if video_urls else None

            # If operation says done but response did not include videos, fall back to GCS listing
            if not primary_url:
                gcs_uri = self.cloud_service.find_segment_video_gcs_uri(operation_doc['segment_id'])
                if gcs_uri:
                    primary_url = gcs_uri
                    video_urls = [gcs_uri]

            # Convert gs:// URI to browser-playable https URL
            if primary_url and primary_url.startswith('gs://'):
                http_url = self.cloud_service.gcs_uri_to_http_url(primary_url, make_public=True)
                if http_url:
                    primary_url = http_url

            # If we have the URL now, mark completed
            if primary_url:
                self.cloud_service.update_document(
                    Config.SEGMENTS_COLLECTION,
                    operation_doc['segment_id'],
                    {
                        'status': 'completed',
                        'completed_at': datetime.utcnow().isoformat(),
                        'video_url': primary_url,
                        'video_urls': video_urls,
                    },
                )
                status_response.update({'status': 'completed', 'video_url': primary_url, 'video_urls': video_urls})
                return status_response

            # Otherwise, operation is done but the GCS artifact may not be listed yet.
            # Report an intermediate state and keep polling instead of failing prematurely.
            self.cloud_service.update_document(
                Config.SEGMENTS_COLLECTION,
                operation_doc['segment_id'],
                {
                    'status': 'publishing',
                    'completed_at': datetime.utcnow().isoformat(),
                },
            )
            status_response.update({'status': 'publishing'})
            return status_response

        except Exception as e:
            self.logger.error(f"Error checking operation status: {str(e)}")
            return {'status': 'error', 'error': str(e)}
    
    def _extract_last_frame_as_image(self, video_url: str) -> types.Image:
        """Extract the final frame from the given video URL and return as types.Image.

        Supports public HTTPS URLs and gs:// URIs. Downloads video to a temp file,
        grabs the last frame with OpenCV, encodes to PNG, and wraps in google.genai types.Image.
        """
        self.logger.info(f"🎬 FRAME EXTRACTION: Attempting to extract last frame from: {video_url}")
        try:
            import cv2  # type: ignore
            from PIL import Image  # type: ignore
        except Exception as e:
            self.logger.error(f"🎬 FRAME EXTRACTION: Missing libs (opencv-python, pillow): {e}")
            return None

        # Determine download source and local temp path
        temp_dir = tempfile.mkdtemp(prefix="lastframe_")
        local_video_path = os.path.join(temp_dir, "input.mp4")

        try:
            # If URL is gs://, try converting to https and make public via CloudService
            source_url = video_url
            if video_url.startswith("gs://"):
                http_url = self.cloud_service.gcs_uri_to_http_url(video_url, make_public=True)
                source_url = http_url or video_url

            # Download video
            import requests  # lazy import
            self.logger.info(f"🎬 FRAME EXTRACTION: Downloading video from: {source_url}")
            with requests.get(source_url, stream=True, timeout=30) as r:
                r.raise_for_status()
                with open(local_video_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)

            # Read last frame via OpenCV
            cap = cv2.VideoCapture(local_video_path)
            if not cap.isOpened():
                self.logger.error("🎬 FRAME EXTRACTION: Failed to open downloaded video")
                return None

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames <= 0:
                self.logger.error("🎬 FRAME EXTRACTION: CAP_PROP_FRAME_COUNT returned 0")
                cap.release()
                return None

            # Seek to last frame - 1 (0-indexed)
            target_index = max(total_frames - 1, 0)
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_index)
            success, frame = cap.read()
            cap.release()

            if not success or frame is None:
                self.logger.error("🎬 FRAME EXTRACTION: Could not read the final frame")
                return None

            # Convert BGR to RGB and encode as PNG bytes
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            temp_png_path = os.path.join(temp_dir, "last_frame.png")
            Image.fromarray(rgb).save(temp_png_path, format="PNG")

            # Wrap as types.Image (file path)
            img = types.Image.from_file(location=temp_png_path)
            self.logger.info("🎬 FRAME EXTRACTION: ✅ Successfully extracted last frame as image")
            return img
        except Exception as e:
            self.logger.error(f"🎬 FRAME EXTRACTION: Exception during extraction: {e}")
            return None
        finally:
            # Clean up temp dir best-effort, but keep the PNG if we returned it
            try:
                # Do not remove the entire temp dir here if image is returned. Since we don't
                # know here, just remove the video file; the PNG will be cleaned up by OS/tmp later.
                if os.path.exists(local_video_path):
                    os.remove(local_video_path)
            except Exception:
                pass
    
    def stitch_story_videos(self, story_id: str) -> Dict[str, Any]:
        """Stitch all completed video segments into a single final MP4 and upload to GCS.

        - Downloads each completed segment to a temp directory
        - Concatenates with MoviePy (compose mode for safe size/fps handling)
        - Uploads the stitched file to GCS and updates story
        """
        self.logger.info(f"🎬 STITCH: Starting stitching for story {story_id}")
        try:
            # MoviePy v2 import paths
            from moviepy.video.io.VideoFileClip import VideoFileClip  # type: ignore
            from moviepy.video.compositing.CompositeVideoClip import concatenate_videoclips  # type: ignore
            import requests  # type: ignore
        except Exception as e:
            self.logger.error(f"🎬 STITCH: Missing libraries (moviepy/requests): {e}")
            raise

        # 1) Gather completed segments with playable URLs
        segments = self.cloud_service.query_documents(
            Config.SEGMENTS_COLLECTION,
            filters=[('story_id', '==', story_id), ('status', '==', 'completed')]
        )
        if not segments:
            raise ValueError("No completed segments found for story")

        # Sort by sequence
        segments.sort(key=lambda x: x.get('sequence_number', 0))
        self.logger.info(f"🎬 STITCH: Found {len(segments)} completed segments")

        # 2) Download each video segment locally
        temp_dir = tempfile.mkdtemp(prefix="stitch_")
        local_paths: List[str] = []
        clips = []
        try:
            for seg in segments:
                url = seg.get('video_url')
                if not url:
                    self.logger.warning(f"🎬 STITCH: Segment {seg.get('id')} missing video_url; skipping")
                    continue

                # Convert gs:// to public https if needed
                source_url = url
                if url.startswith('gs://'):
                    converted = self.cloud_service.gcs_uri_to_http_url(url, make_public=True)
                    if converted:
                        source_url = converted
                
                local_path = os.path.join(temp_dir, f"segment_{seg.get('sequence_number', 0)}.mp4")
                self.logger.info(f"🎬 STITCH: Downloading segment #{seg.get('sequence_number', 0)} from {source_url}")
                try:
                    with requests.get(source_url, stream=True, timeout=60) as r:
                        r.raise_for_status()
                        with open(local_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=1024 * 1024):
                                if chunk:
                                    f.write(chunk)
                    local_paths.append(local_path)
                except Exception as e:
                    self.logger.error(f"🎬 STITCH: Failed to download segment #{seg.get('sequence_number', 0)}: {e}")
                    continue

            if not local_paths:
                raise ValueError("No downloadable video files for stitching")

            # 3) Load clips and concatenate
            self.logger.info("🎬 STITCH: Loading clips into MoviePy")
            for p in local_paths:
                try:
                    clip = VideoFileClip(p)
                    clips.append(clip)
                except Exception as e:
                    self.logger.error(f"🎬 STITCH: Failed to load clip {p}: {e}")

            if not clips:
                raise ValueError("Failed to load any video clips for stitching")

            self.logger.info("🎬 STITCH: Concatenating clips (compose mode)")
            try:
                final = concatenate_videoclips(clips, method='compose')
            except Exception as e:
                # Try without compose as fallback
                self.logger.warning(f"🎬 STITCH: Compose failed ({e}); retrying without compose")
                final = concatenate_videoclips(clips)

            # 4) Write final video
            stitched_local = os.path.join(temp_dir, "stitched_final.mp4")
            self.logger.info(f"🎬 STITCH: Writing final video to {stitched_local}")
            try:
                # Let moviepy pick fps from clips; set codecs explicitly
                final.write_videofile(
                    stitched_local,
                    codec='libx264',
                    audio_codec='aac',
                    temp_audiofile=os.path.join(temp_dir, "temp-audio.m4a"),
                    remove_temp=True,
                    threads=2,
                )
            finally:
                try:
                    final.close()  # type: ignore
                except Exception:
                    pass

            # 5) Upload to GCS and update story
            dest_blob = f"stories/{story_id}/final/stitched_{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}.mp4"
            public_url = self.cloud_service.upload_file_to_gcs(stitched_local, dest_blob)
            self.logger.info(f"🎬 STITCH: Uploaded final video to {public_url}")

            updated_story = self.cloud_service.update_document(
                Config.STORIES_COLLECTION,
                story_id,
                {
                    'final_video_url': public_url,
                    'stitched_at': datetime.utcnow().isoformat(),
                    'status': 'completed',
                },
            )

            return {
                'status': 'completed',
                'final_video_url': public_url,
                'total_segments': len(segments),
            }

        finally:
            # Cleanup moviepy clips
            for c in clips:
                try:
                    c.close()
                except Exception:
                    pass
            # Cleanup temp files
            for p in local_paths:
                try:
                    if os.path.exists(p):
                        os.remove(p)
                except Exception:
                    pass
            # stitched_local removed after upload attempt (keep temp dir cleanup)
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for name in files:
                    try:
                        os.remove(os.path.join(root, name))
                    except Exception:
                        pass
                for name in dirs:
                    try:
                        os.rmdir(os.path.join(root, name))
                    except Exception:
                        pass
            try:
                os.rmdir(temp_dir)
            except Exception:
                pass
