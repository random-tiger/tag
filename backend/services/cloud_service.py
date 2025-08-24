"""
Google Cloud services integration
"""

import os
import logging
from typing import Dict, List, Optional, Any
import requests
from datetime import datetime
from google.cloud import storage, firestore
from google.cloud.exceptions import NotFound
from google import genai
from google.genai import types
import json

from config.settings import Config

class CloudService:
    """Service for managing Google Cloud integrations"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize Google Cloud credentials
        credentials_path = os.path.abspath('../service-account-key.json')
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        
        # Initialize clients
        self.storage_client = storage.Client(project=Config.GOOGLE_CLOUD_PROJECT)
        self.firestore_client = firestore.Client(project=Config.GOOGLE_CLOUD_PROJECT)
        self.genai_client = genai.Client(
            vertexai=True,
            project=Config.GOOGLE_CLOUD_PROJECT,
            location=Config.GOOGLE_CLOUD_REGION
        )

        # In-memory cache for live Operation handles (keyed by operation.name)
        # Needed because google-genai operations.get expects an Operation object, not a string
        self._operation_cache: Dict[str, Any] = {}
        
        # Initialize storage bucket
        self._init_storage_bucket()
        
        self.logger.info("CloudService initialized successfully")
    
    def _init_storage_bucket(self):
        """Initialize the storage bucket, creating it if it doesn't exist"""
        self.bucket = self.storage_client.bucket(Config.GCS_BUCKET_NAME)
        try:
            exists = self.bucket.exists()
        except Exception as e:
            self.logger.warning(f"Bucket exists() check failed: {e}")
            exists = False
        if not exists:
            self.logger.info(f"Creating storage bucket: {Config.GCS_BUCKET_NAME}")
            self.bucket = self.storage_client.create_bucket(
                bucket_or_name=Config.GCS_BUCKET_NAME,
                location=Config.GOOGLE_CLOUD_REGION,
            )

    def find_segment_video_gcs_uri(self, segment_id: str) -> Optional[str]:
        """Search GCS for a generated video for this segment and return a gs:// URI if found."""
        try:
            prefix = f"videos/{segment_id}/"
            blobs = list(self.storage_client.list_blobs(self.bucket.name, prefix=prefix))
            # Prefer mp4 files
            mp4s = [b for b in blobs if b.name.lower().endswith('.mp4')]
            blob = mp4s[0] if mp4s else (blobs[0] if blobs else None)
            if not blob:
                return None
            return f"gs://{self.bucket.name}/{blob.name}"
        except Exception as e:
            self.logger.warning(f"GCS lookup for segment {segment_id} failed: {e}")
            return None

    def gcs_uri_to_http_url(self, gcs_uri: str, make_public: bool = True, expires_minutes: int = 60) -> Optional[str]:
        """Convert gs://bucket/path to an HTTPS URL playable by browsers.

        If make_public=True, sets the blob to public and returns blob.public_url.
        Otherwise returns a signed URL valid for expires_minutes.
        """
        try:
            if not gcs_uri.startswith("gs://"):
                return gcs_uri
            _, rest = gcs_uri.split("gs://", 1)
            bucket_name, blob_name = rest.split("/", 1)
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            if make_public:
                try:
                    blob.make_public()
                except Exception:
                    # ignore if already public
                    pass
                return blob.public_url
            else:
                from datetime import timedelta
                return blob.generate_signed_url(expiration=timedelta(minutes=expires_minutes), method="GET")
        except Exception as e:
            self.logger.warning(f"Failed to convert GCS URI to HTTP URL: {e}")
            return None
    
    def upload_file_to_gcs(self, file_path: str, destination_blob_name: str) -> str:
        """Upload a file to Google Cloud Storage"""
        try:
            blob = self.bucket.blob(destination_blob_name)
            
            with open(file_path, 'rb') as file_data:
                blob.upload_from_file(file_data)
            
            # Make the blob publicly readable (optional, based on your security requirements)
            blob.make_public()
            
            self.logger.info(f"File uploaded to GCS: {destination_blob_name}")
            return blob.public_url
            
        except Exception as e:
            self.logger.error(f"Failed to upload file to GCS: {str(e)}")
            raise

    def delete_gcs_prefix(self, prefix: str) -> int:
        """Delete all blobs under a prefix. Returns count deleted."""
        try:
            deleted = 0
            for blob in list(self.storage_client.list_blobs(self.bucket.name, prefix=prefix)):
                try:
                    blob.delete()
                    deleted += 1
                except Exception as e:
                    self.logger.warning(f"Failed to delete blob {blob.name}: {e}")
            if deleted:
                self.logger.info(f"Deleted {deleted} blobs under gs://{self.bucket.name}/{prefix}")
            return deleted
        except Exception as e:
            self.logger.error(f"Failed deleting GCS prefix {prefix}: {e}")
            return 0

    def delete_gcs_uri(self, gcs_uri: str) -> bool:
        """Delete a single object by gs:// URI. Returns True if deleted."""
        try:
            if not gcs_uri or not gcs_uri.startswith("gs://"):
                return False
            _, rest = gcs_uri.split("gs://", 1)
            bucket_name, blob_name = rest.split("/", 1)
            blob = self.storage_client.bucket(bucket_name).blob(blob_name)
            blob.delete()
            self.logger.info(f"Deleted GCS object: {gcs_uri}")
            return True
        except Exception as e:
            self.logger.warning(f"Failed to delete GCS object {gcs_uri}: {e}")
            return False
    
    def download_file_from_gcs(self, blob_name: str, destination_path: str) -> str:
        """Download a file from Google Cloud Storage"""
        try:
            blob = self.bucket.blob(blob_name)
            blob.download_to_filename(destination_path)
            
            self.logger.info(f"File downloaded from GCS: {blob_name}")
            return destination_path
            
        except Exception as e:
            self.logger.error(f"Failed to download file from GCS: {str(e)}")
            raise
    
    def save_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a document to Firestore"""
        try:
            doc_ref = self.firestore_client.collection(collection).document(document_id)
            doc_ref.set(data)
            
            # Return the document with ID
            result = {"id": document_id, **data}
            self.logger.info(f"Document saved to Firestore: {collection}/{document_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to save document to Firestore: {str(e)}")
            raise

    def delete_document(self, collection: str, document_id: str) -> bool:
        """Delete a Firestore document if it exists."""
        try:
            doc_ref = self.firestore_client.collection(collection).document(document_id)
            doc_ref.delete()
            self.logger.info(f"Document deleted from Firestore: {collection}/{document_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to delete document {collection}/{document_id}: {e}")
            return False
    
    def get_document(self, collection: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document from Firestore"""
        try:
            doc_ref = self.firestore_client.collection(collection).document(document_id)
            doc = doc_ref.get()
            
            if doc.exists:
                result = {"id": doc.id, **doc.to_dict()}
                self.logger.info(f"Document retrieved from Firestore: {collection}/{document_id}")
                return result
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Failed to get document from Firestore: {str(e)}")
            raise
    
    def update_document(self, collection: str, document_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a document in Firestore"""
        try:
            doc_ref = self.firestore_client.collection(collection).document(document_id)
            doc_ref.update(data)
            
            # Get the updated document
            updated_doc = self.get_document(collection, document_id)
            self.logger.info(f"Document updated in Firestore: {collection}/{document_id}")
            return updated_doc
            
        except Exception as e:
            self.logger.error(f"Failed to update document in Firestore: {str(e)}")
            raise
    
    def query_documents(self, collection: str, filters: List[tuple] = None, limit: int = None) -> List[Dict[str, Any]]:
        """Query documents from Firestore"""
        try:
            query = self.firestore_client.collection(collection)
            
            # Apply filters
            if filters:
                for field, operator, value in filters:
                    query = query.where(field, operator, value)
            
            # Apply limit
            if limit:
                query = query.limit(limit)
            
            docs = query.stream()
            results = [{"id": doc.id, **doc.to_dict()} for doc in docs]
            
            self.logger.info(f"Queried {len(results)} documents from {collection}")
            return results
            
        except Exception as e:
            self.logger.error(f"Failed to query documents from Firestore: {str(e)}")
            raise
    
    def generate_videos(self, model: str, prompt: str, config: types.GenerateVideosConfig, image: types.Image = None):
        """Generate videos using Veo models"""
        try:
            self.logger.info(f"Starting video generation with model: {model}")
            
            operation = self.genai_client.models.generate_videos(
                model=model,
                prompt=prompt,
                image=image,
                config=config
            )
            
            self.logger.info(f"Video generation operation started: {operation.name}")
            # Cache the live operation handle so we can poll later
            try:
                if getattr(operation, 'name', None):
                    self._operation_cache[operation.name] = operation
            except Exception:
                pass
            return operation
            
        except Exception as e:
            self.logger.error(f"Failed to generate video: {str(e)}")
            raise
    
    def get_operation_status(self, operation_name: str):
        """Get the status of a long-running operation.

        - Uses cached Operation handle when available for fastest/most accurate polling
        - Falls back to Vertex AI REST operations endpoint by name (survives restarts)
        """
        # 1) Try cached live handle via SDK
        op = self._operation_cache.get(operation_name)
        if op is not None:
            try:
                updated = self.genai_client.operations.get(op)
                if getattr(updated, 'name', None):
                    self._operation_cache[updated.name] = updated
                return updated
            except Exception as e:
                self.logger.warning(f"SDK get(op) failed, falling back to REST: {str(e)}")

        # 2) Fallback: use Veo's documented polling endpoint (model-scoped fetchPredictOperation)
        try:
            # Acquire OAuth2 token
            import google.auth
            from google.auth.transport.requests import Request as GAPICRequest

            creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            if not creds.valid:
                creds.refresh(GAPICRequest())

            # operation_name format (from start request):
            # projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}/operations/{OP_ID}
            parts = operation_name.split('/')
            project = parts[1] if len(parts) > 1 else Config.GOOGLE_CLOUD_PROJECT
            location = parts[3] if len(parts) > 3 else Config.GOOGLE_CLOUD_REGION
            model_id = None
            for i, p in enumerate(parts):
                if p == 'models' and i + 1 < len(parts):
                    model_id = parts[i + 1]
                    break
            if not model_id:
                raise ValueError(f"Could not parse model id from name: {operation_name}")

            url = (
                f"https://{location}-aiplatform.googleapis.com/v1/"
                f"projects/{project}/locations/{location}/publishers/google/models/{model_id}:fetchPredictOperation"
            )
            headers = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}
            payload = {"operationName": operation_name}
            resp = requests.post(url, json=payload, headers=headers, timeout=20)
            resp.raise_for_status()
            data = resp.json()

            class OperationView:
                def __init__(self, name: str, payload: Dict[str, Any]):
                    self.name = name
                    self.done = bool(payload.get("done", False))
                    self.response = payload.get("response")  # contains videos when done
                    self.error = payload.get("error")

                def __repr__(self) -> str:
                    return f"OperationView(name={self.name}, done={self.done})"

            return OperationView(operation_name, data)

        except Exception as e:
            self.logger.error(f"Failed to get operation status for {operation_name}: {str(e)}")
            raise
    
    def generate_enhanced_prompt(self, base_prompt: str, keywords: List[str] = None, image_data: bytes = None) -> str:
        """Use Gemini to enhance and optimize prompts - following veo3_video_generation.py pattern"""
        try:
            if keywords:
                # Use the exact prompt pattern from veo3_video_generation.py
                enhancement_prompt = f"""
You are an expert video prompt engineer for Google's Veo model. Your task is to construct the most effective and optimal prompt string using the following keywords. Every single keyword MUST be included. Synthesize them into a single, cohesive, and cinematic instruction. Do not add any new core concepts. Output ONLY the final prompt string, without any introduction or explanation. Mandatory Keywords: {",".join(keywords)}
                """
            elif image_data:
                # Use the image-to-video prompt pattern from documentation
                enhancement_prompt = f"""
You are an expert prompt engineer for Google's Veo model. Analyze the provided image and combine its content with the following motion and audio keywords to generate a single, cohesive, and cinematic prompt. Integrate the image's subject and scene with the requested motion and audio effects. The final output must be ONLY the prompt itself, with no preamble. Base prompt: {base_prompt}
                """
            else:
                enhancement_prompt = f"""
You are an expert video prompt engineer for Google's Veo model. Enhance the following prompt to be more cinematic, detailed, and effective for video generation. Maintain the core concept but add appropriate camera movements, lighting, and atmospheric details. Output ONLY the enhanced prompt.

Original prompt: {base_prompt}
                """
            
            contents = [enhancement_prompt]
            
            # Add image if provided
            if image_data:
                contents.append(types.Part.from_bytes(data=image_data, mime_type="image/jpeg"))
            
            response = self.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(temperature=0.9, max_output_tokens=220)
            )
            
            enhanced_prompt = getattr(response, 'text', None)
            if isinstance(enhanced_prompt, str) and enhanced_prompt.strip():
                out = enhanced_prompt.strip()
                # If Gemini echoes or is too short, retry a stronger rewrite instead of deterministic fallback
                norm_in = ''.join(ch for ch in (base_prompt or '').lower() if ch.isalnum() or ch.isspace()).strip()
                norm_out = ''.join(ch for ch in out.lower() if ch.isalnum() or ch.isspace()).strip()
                if norm_out == norm_in or len(out.split()) < 10:
                    self.logger.info("Enhanced prompt too similar/short; retrying AI enrichment")
                    retry = self.genai_client.models.generate_content(
                        model=Config.GEMINI_MODEL,
                        contents=[f"Rewrite concisely and cinematically: {out}"],
                        config=types.GenerateContentConfig(temperature=0.8, max_output_tokens=200)
                    )
                    retry_text = getattr(retry, 'text', None)
                    return (retry_text or out).strip()
                self.logger.info("Prompt enhanced successfully")
                return out
            # If model returns empty, retry once with a clearer instruction
            self.logger.warning("Gemini returned empty enhancement; retrying once")
            retry = self.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=[f"Rewrite concisely and cinematically: {base_prompt}"],
                config=types.GenerateContentConfig(temperature=0.8, max_output_tokens=200)
            )
            retry_text = getattr(retry, 'text', None)
            return (retry_text or base_prompt).strip()
            
        except Exception as e:
            self.logger.error(f"Failed to enhance prompt: {str(e)}")
            return self._deterministic_enrich_prompt(base_prompt)

    def _deterministic_enrich_prompt(self, base_prompt: str) -> str:
        """Create a concise cinematic prompt without external calls, ensuring enrichment."""
        seed = (base_prompt or "").strip()
        if not seed:
            seed = "opening shot of the scene"
        # Keep concise, include camera, lighting, mood, and style cues
        return (
            f"Opening shot, slow dolly‑in: {seed}. Warm rim‑light, soft shadows, "
            f"cinematic depth of field, subtle parallax. 2D cel‑shaded style, bold lines, "
            f"rich color palette, gentle ambient audio."
        )

    def assist_scene_prompt(self, seed_idea: str, context_prompts: List[str] = None, 
                           last_frame_image: 'types.Image' = None,
                           visual_type: str = None, entities: List[str] = None,
                           mood: str = None) -> str:
        """Generate a cinematic video prompt from a seed idea and optional context."""
        try:
            context_text = ""
            if context_prompts:
                context_text = f"\n\nPrevious scene context:\n" + "\n".join(f"- {p}" for p in context_prompts[-2:])
            
            style_map = {
                '2D': '2D cel‑shaded animation, bold line art',
                '3D': '3D cinematic render, realistic lighting',
                'live_action': 'live‑action, cinematic grading',
                'stop_motion': 'stop‑motion, tactile handmade textures',
            }
            visual_phrase = style_map.get((visual_type or '').lower(), style_map.get(visual_type, '')) if visual_type else ''
            entities_phrase = ''
            if entities:
                entities_phrase = 'Include entities: ' + ', '.join([e for e in entities if e]) + '. '
            mood_phrase = f"Mood: {mood}. " if mood else ''


            system_prompt = (
                "You are a world‑class video prompt engineer for Google's Veo model. "
                "Rewrite the user's seed idea into ONE cinematic prompt (20–35 words). "
                "Must include: shot type and camera movement, lighting, mood, color/style cues, and key subject details. "
                "Do NOT mention 'seed idea', do NOT add meta commentary. "
                "CRITICAL: Adults only; never reference minors. Output ONLY the final prompt." 
                f" {context_text} {mood_phrase}{entities_phrase}{visual_phrase}"
            )
            
            content_parts = [f"Seed idea: {seed_idea}"]
            if last_frame_image:
                content_parts.append(last_frame_image)
                system_prompt += "\n\nA reference image from the previous scene is provided for visual continuity."
            
            response = self.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=[system_prompt] + content_parts,
                config=types.GenerateContentConfig(
                    temperature=0.8,
                    max_output_tokens=200,
                ),
            )
            # Safely extract text
            text = getattr(response, 'text', None)
            if isinstance(text, str) and text.strip():
                suggestion = text.strip()
            else:
                # Fallback: try candidates
                suggestion = None
                try:
                    for cand in getattr(response, 'candidates', []) or []:
                        cand_text = getattr(cand, 'content', None) or getattr(cand, 'text', None)
                        if isinstance(cand_text, str) and cand_text.strip():
                            suggestion = cand_text.strip()
                            break
                except Exception:
                    pass
            
            # Always pass through an enrichment step with AI; retry instead of deterministic fallback
            base_for_enhancement = suggestion or seed_idea
            for attempt in range(2):
                try:
                    enhanced = self.generate_enhanced_prompt(base_for_enhancement)
                    if isinstance(enhanced, str) and enhanced.strip():
                        normalized_in = ''.join(ch for ch in base_for_enhancement.lower() if ch.isalnum() or ch.isspace()).strip()
                        normalized_out = ''.join(ch for ch in enhanced.lower() if ch.isalnum() or ch.isspace()).strip()
                        if normalized_out != normalized_in and len(enhanced.split()) >= 10:
                            return enhanced.strip()
                        # If echo/short, nudge and retry
                        base_for_enhancement = base_for_enhancement + " | Add specific camera motion, lighting, mood, and color details."
                except Exception:
                    continue
            # If still not good, return the best AI suggestion we had (never deterministic)
            return (suggestion or seed_idea).strip()
            
        except Exception as e:
            self.logger.error(f"Failed to assist scene prompt: {str(e)}")
            return seed_idea
    
    def assist_unified_prompt(self, *args, **kwargs) -> str:
        """Deprecated: AI scene assist removed. Keeping no-op for safety until all refs are gone."""
        seed_idea = kwargs.get('seed_idea') if isinstance(kwargs, dict) else None
        return (seed_idea or "").strip()

    def assist_dialogue(self, characters: List[str], tone: str, beat: str, length: str,
                       context_prompts: List[str] = None, mood: str = None) -> str:
        """Generate dialogue between characters with given tone and goal."""
        try:
            context_text = ""
            if context_prompts:
                context_text = f"\n\nPrevious scene context for continuity:\n" + "\n".join(f"- {p}" for p in context_prompts[-2:])
            
            length_guide = {
                "very_short": "2-4 lines total",
                "short": "4-6 lines total", 
                "medium": "6-10 lines total"
            }
            
            char_list = ", ".join(characters) if characters else "Character A, Character B"
            
            system_prompt = f"""Generate dialogue between characters: {char_list}
Tone: {mood or tone}
Goal/beat: {beat}
Length: {length_guide.get(length, "4-6 lines total")}


CRITICAL: Only reference adults, never minors. Use "person" or "young adult" if age is relevant.
Format as:
Character Name: dialogue line
Character Name: dialogue line

Output ONLY the dialogue lines, no explanation.{context_text}"""
            
            response = self.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=[system_prompt],
                config=types.GenerateContentConfig(
                    temperature=0.9,
                    max_output_tokens=300,
                ),
            )
            # Safely extract text
            text = getattr(response, 'text', None)
            if isinstance(text, str) and text.strip():
                return text.strip()
            try:
                for cand in getattr(response, 'candidates', []) or []:
                    cand_text = getattr(cand, 'content', None) or getattr(cand, 'text', None)
                    if isinstance(cand_text, str) and cand_text.strip():
                        return cand_text.strip()
            except Exception:
                pass
            # Fallback minimal dialogue
            default_chars = characters or ["Character A", "Character B"]
            if len(default_chars) < 2:
                default_chars = [default_chars[0], "Character B"]
            return f"{default_chars[0]}: ...\n{default_chars[1]}: ..."
            
        except Exception as e:
            self.logger.error(f"Failed to assist dialogue: {str(e)}")
            # Return a minimal, non-crashing fallback
            chars = characters or ["Character A", "Character B"]
            if len(chars) < 2:
                chars = [chars[0] if chars else "Character A", "Character B"]
            return f"{chars[0]}: ...\n{chars[1]}: ..."

    def save_entity_to_library(self, entity_name: str, entity_description: str = "", user_id: str = "default_user") -> bool:
        """Save an entity to the user's entity library."""
        try:
            entity_data = {
                'name': entity_name.strip(),
                'description': entity_description.strip(),
                'user_id': user_id,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            }
            
            # Use entity name as document ID for easy retrieval and deduplication
            doc_id = f"{user_id}_{entity_name.lower().replace(' ', '_')}"
            
            self.firestore_client.collection('entity_library').document(doc_id).set(entity_data)
            self.logger.info(f"Saved entity to library: {entity_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save entity to library: {str(e)}")
            return False

    def get_user_entity_library(self, user_id: str = "default_user") -> List[Dict[str, Any]]:
        """Get all entities from the user's entity library."""
        try:
            entities = []
            docs = self.firestore_client.collection('entity_library').where('user_id', '==', user_id).stream()
            
            for doc in docs:
                entity_data = doc.to_dict()
                entity_data['id'] = doc.id
                entities.append(entity_data)
            
            # Sort by creation date (newest first)
            entities.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
            self.logger.info(f"Retrieved {len(entities)} entities from library for user {user_id}")
            return entities
            
        except Exception as e:
            self.logger.error(f"Failed to get entity library: {str(e)}")
            return []

    def delete_entity_from_library(self, entity_id: str, user_id: str = "default_user") -> bool:
        """Delete an entity from the user's entity library."""
        try:
            # Verify the entity belongs to the user
            doc_ref = self.firestore_client.collection('entity_library').document(entity_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                self.logger.warning(f"Entity not found: {entity_id}")
                return False
                
            entity_data = doc.to_dict()
            if entity_data.get('user_id') != user_id:
                self.logger.warning(f"User {user_id} attempted to delete entity belonging to {entity_data.get('user_id')}")
                return False
            
            doc_ref.delete()
            self.logger.info(f"Deleted entity from library: {entity_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete entity from library: {str(e)}")
            return False
