"""
AI-powered story generation service for creating detailed story structures
"""

import uuid
import math
import logging
import re
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

from google.genai import types
from config.settings import Config
from services.cloud_service import CloudService


class StoryGenerationService:
    """Service for generating detailed story structures, storyboards, and content"""
    
    def __init__(self, cloud_service: CloudService):
        self.cloud_service = cloud_service
        self.logger = logging.getLogger(__name__)
    
    def generate_story_from_prompt(self, prompt: str, user_preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate a complete story structure from a single prompt
        Returns detailed story with characters, scenes, and storyboards
        """
        try:
            self.logger.info(f"Generating story from prompt: {prompt[:100]}...")
            
            # Get AI-generated story structure (honor duration preferences when present)
            preferences = user_preferences or {}
            story_structure = self._generate_story_structure(prompt, preferences)

            # Ensure key_entities always includes entities explicitly named in the user prompt
            try:
                extracted = self._extract_key_entities_from_prompt(prompt)
                existing = story_structure.get('key_entities') or []
                if isinstance(existing, list):
                    # Merge and de-duplicate while preserving order
                    seen = set()
                    merged = []
                    for ent in (existing + extracted):
                        ent_norm = str(ent).strip().lower()
                        if ent_norm and ent_norm not in seen:
                            seen.add(ent_norm)
                            merged.append(ent_norm)
                    story_structure['key_entities'] = merged
                else:
                    story_structure['key_entities'] = extracted
            except Exception:
                # Best-effort only; safe to continue
                story_structure.setdefault('key_entities', [])

            # Normalize scene count/durations to meet target_total and per-scene cap deterministically
            target_total = int(preferences.get('target_total_duration_seconds') or 0)
            max_scene_seconds = int(preferences.get('max_scene_duration_seconds', 8) or 8)
            if target_total > 0 and max_scene_seconds > 0:
                try:
                    desired_count = max(1, math.ceil(target_total / max_scene_seconds))
                    remainder = max(1, min(max_scene_seconds, target_total - max_scene_seconds * (desired_count - 1)))
                    base_scenes = story_structure.get('scene_structure', []) or []
                    normalized_scenes = []
                    for i in range(desired_count):
                        base = base_scenes[i % len(base_scenes)] if base_scenes else {}
                        duration = max_scene_seconds if i < desired_count - 1 else remainder
                        normalized_scenes.append({
                            'sequence': i + 1,
                            'title': base.get('title') or f'Scene {i + 1}',
                            'purpose': base.get('purpose') or 'development',
                            'location': base.get('location') or story_structure.get('setting') or 'location',
                            'time_of_day': base.get('time_of_day') or 'daytime',
                            'estimated_duration': int(duration),
                            'key_actions': base.get('key_actions') or [],
                            'mood': base.get('mood') or story_structure.get('tone') or 'cinematic'
                        })
                    story_structure['scene_structure'] = normalized_scenes
                    story_structure['estimated_duration'] = int(target_total)
                except Exception:
                    # If normalization fails, at least align top-level estimated duration
                    story_structure['estimated_duration'] = int(target_total)
            
            # Generate detailed scenes and storyboards with per-scene duration cap (default 8s for Veo)
            detailed_scenes = self._generate_detailed_scenes(story_structure, prompt, max_scene_seconds)
            
            # Generate character profiles
            character_profiles = self._generate_character_profiles(story_structure)
            
            # Create comprehensive story data
            story_data = {
                'id': str(uuid.uuid4()),
                'original_prompt': prompt,
                'title': story_structure.get('title'),
                'premise': story_structure.get('premise'),
                'genre': story_structure.get('genre'),
                'tone': story_structure.get('tone'),
                'setting': story_structure.get('setting'),
                'estimated_duration': story_structure.get('estimated_duration'),
                'target_audience': story_structure.get('target_audience'),
                'visual_style': story_structure.get('visual_style'),
                'key_entities': story_structure.get('key_entities') or [],
                'characters': character_profiles,
                'scenes': detailed_scenes,
                'scene_count': len(detailed_scenes),
                'story_arc': story_structure.get('story_arc'),
                'themes': story_structure.get('themes', []),
                'created_at': datetime.utcnow().isoformat(),
                'status': 'generated'
            }
            
            self.logger.info(f"Generated story with {len(detailed_scenes)} scenes and {len(character_profiles)} characters")
            return story_data
            
        except Exception as e:
            self.logger.error(f"Error generating story from prompt: {str(e)}")
            raise

    def _extract_key_entities_from_prompt(self, prompt: str) -> List[str]:
        """Lightweight heuristic entity extractor to preserve critical nouns from the user's prompt.
        Targets common humans/animals/objects; de-dupes and lowercases for stability."""
        try:
            text = (prompt or '').lower()
            # Very small dictionary of common entities we care about preserving
            seed_terms = [
                'man','woman','boy','girl','child','kid','baby','teen','person','people','friend','father','mother','dad','mom',
                'dog','cat','horse','bird','wolf','fox','bear','lion','tiger','elephant','rabbit','puppy','kitten',
                'robot','alien','monster','ghost','dragon','wizard','witch','knight','pirate',
                'car','truck','bus','train','bicycle','motorcycle','spaceship','boat','submarine',
                'city','forest','desert','beach','mountain','castle','village','farm','school','office','park'
            ]
            found = []
            for term in seed_terms:
                # strict word boundary to avoid partial matches
                if re.search(rf"\b{re.escape(term)}\b", text):
                    found.append(term)
            # Also capture simple quoted proper nouns
            quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', prompt)
            for q in quoted:
                for candidate in q:
                    if candidate:
                        val = candidate.strip().lower()
                        if val and val not in found:
                            found.append(val)
            # return unique order-preserving list
            seen = set()
            unique = []
            for ent in found:
                if ent not in seen:
                    seen.add(ent)
                    unique.append(ent)
            return unique
        except Exception:
            return []
    
    def _generate_story_structure(self, prompt: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Generate high-level story structure and metadata"""
        try:
            target_total = preferences.get('target_total_duration_seconds')
            max_scene = int(preferences.get('max_scene_duration_seconds', 8) or 8)
            duration_instructions = ""
            if target_total:
                duration_instructions = f"""

ADDITIONAL CONSTRAINTS:
- The total estimated_duration MUST be {int(target_total)} seconds
- Create enough scenes to approximately fill {int(target_total)} seconds with each scene ≤ {max_scene} seconds
- Prefer consistent scene durations between 6 and {max_scene} seconds; never exceed {max_scene}
"""
            else:
                duration_instructions = f"""

ADDITIONAL CONSTRAINTS:
- Each scene duration MUST be ≤ {max_scene} seconds
"""

            # Escape braces in static JSON template to avoid f-string formatting errors
            response_format_json = (
                """
{
  "title": "Engaging story title",
  "premise": "One-sentence story premise",
  "genre": "Primary genre (adventure, comedy, drama, fantasy, sci-fi, thriller, etc.)",
  "tone": "Emotional tone (cinematic, playful, dramatic, mysterious, etc.)",
  "setting": "Primary setting/location",
  "time_period": "When story takes place",
  "estimated_duration": 180, // total seconds for all scenes
  "target_audience": "Target demographic",
  "visual_style": "Visual/cinematic style description",
  "story_arc": ["Setup", "Inciting incident", "Rising action", "Climax", "Resolution"],
  "themes": ["theme1", "theme2"],
  "key_entities": ["list of canonical entities extracted from the user prompt, e.g., 'man', 'dog'"] ,
  "scene_structure": [
    {
      "sequence": 1,
      "title": "Scene title",
      "purpose": "Story function (setup/conflict/resolution)",
      "location": "Specific location",
      "time_of_day": "lighting condition",
      "estimated_duration": 30,
      "key_actions": ["action1", "action2"],
      "mood": "emotional mood"
    }
  ]
}
                """
                .replace('{', '{{')
                .replace('}', '}}')
            )

            system_prompt = f"""You are an expert story architect and screenwriter. Based on the user's prompt, create a comprehensive story structure.

CRITICAL REQUIREMENTS:
- Analyze the prompt to infer the best story length, genre, tone, and visual style
- Create the right number of distinct scenes to meet duration goals
- Focus on visual storytelling suitable for video generation
- Ensure each scene has clear visual elements and action
- Make intelligent decisions about all story parameters - never leave anything unspecified
{duration_instructions}

IMPORTANT: Faithfully reflect the user's prompt. Identify and preserve the core entities (people, animals, objects, places) mentioned by the user and carry them through the story. Do not replace or rename them unless the prompt explicitly allows it.

RESPONSE FORMAT (JSON):
{response_format_json}

ORIGINAL USER PROMPT:
"""
            
            response = self.cloud_service.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.8,
                    max_output_tokens=2000,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=Config.GEMINI_THINKING_BUDGET
                    ),
                    system_instruction=system_prompt,
                    response_mime_type="application/json"
                ),
            )
            
            # With response_mime_type set to application/json, prefer .text and parse directly
            response_text = getattr(response, 'text', '') or ''
            try:
                story_structure = json.loads(response_text)
                return story_structure
            except Exception:
                # Try strict JSON extraction, otherwise fail hard (no fallbacks)
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    return parsed
                raise ValueError("Model did not return valid JSON story structure")
            
        except Exception as e:
            self.logger.error(f"Error generating story structure: {str(e)}")
            raise
    
    def _generate_detailed_scenes(self, story_structure: Dict[str, Any], original_prompt: str, max_scene_seconds: int = 8) -> List[Dict[str, Any]]:
        """Generate detailed scene descriptions for video generation, clamping duration per scene"""
        try:
            scenes = []
            scene_structure = story_structure.get('scene_structure', [])
            
            for scene_info in scene_structure:
                detailed_scene = self._generate_scene_details(scene_info, story_structure, original_prompt)
                # Clamp duration_seconds to max_scene_seconds if present
                try:
                    if isinstance(detailed_scene.get('duration_seconds'), (int, float)):
                        detailed_scene['duration_seconds'] = int(min(max_scene_seconds, max(1, detailed_scene['duration_seconds'])))
                    else:
                        detailed_scene['duration_seconds'] = max_scene_seconds
                except Exception:
                    detailed_scene['duration_seconds'] = max_scene_seconds
                scenes.append(detailed_scene)
            
            return scenes
            
        except Exception as e:
            self.logger.error(f"Error generating detailed scenes: {str(e)}")
            raise
    
    def _generate_scene_details(self, scene_info: Dict[str, Any], story_context: Dict[str, Any], original_prompt: str) -> Dict[str, Any]:
        """Generate comprehensive details for a single scene"""
        try:
            system_prompt = f"""You are an expert cinematographer and video generation specialist. Create a detailed scene description for video generation.

STORY CONTEXT:
Title: {story_context.get('title')}
Genre: {story_context.get('genre')}
Tone: {story_context.get('tone')}
Visual Style: {story_context.get('visual_style')}
Setting: {story_context.get('setting')}
 Key Entities (from user prompt, must be visible and consistent): {story_context.get('key_entities')}

SCENE INFO:
{scene_info}

CRITICAL REQUIREMENTS:
- Generate extremely detailed visual descriptions for Veo video generation
- Include specific camera angles, movements, and shot types
- Describe lighting, mood, and environmental details
- Include character actions, expressions, and positioning
- Specify any props, costumes, or special visual elements
- Ensure continuity with the overall story style
- Make all technical decisions intelligently (duration, aspect ratio, etc.)
 - Maintain fidelity to the user's prompt by explicitly depicting key_entities: {story_context.get('key_entities')}. Do not replace or rename these entities. Ensure they are visibly present unless logically absent.

RESPONSE FORMAT (JSON):
{{
  "id": "unique_scene_id",
  "sequence": {scene_info.get('sequence', 1)},
  "title": "{scene_info.get('title', 'Scene')}",
  "location": "Detailed location description",
  "time_of_day": "lighting condition with specific details",
  "duration_seconds": min(8, int({story_context.get('estimated_duration', 180)} / max(1, len({story_context.get('scene_structure', [])}) or 1))),
  "aspect_ratio": "16:9",
  "camera_work": {{
    "primary_shot": "wide shot/close-up/medium shot/etc",
    "camera_movement": "static/pan/tilt/tracking/etc",
    "angle": "eye level/low angle/high angle/etc"
  }},
  "lighting": {{
    "type": "natural/artificial/mixed",
    "mood": "bright/moody/dramatic/etc", 
    "direction": "front/back/side/overhead/etc"
  }},
  "visual_description": "Comprehensive scene description for video generation",
  "veo_prompt": "Optimized prompt specifically for Veo video generation",
  "character_details": [
    {{
      "name": "character name",
      "description": "detailed visual description",
      "actions": ["specific actions in this scene"],
      "emotions": "emotional state and expressions"
    }}
  ],
  "props_and_elements": ["list of important visual elements"],
  "mood_tags": ["atmospheric", "dramatic", "etc"],
  "continuity_notes": "Notes for maintaining visual consistency",
  "technical_notes": "Any specific technical requirements"
}}

SCENE TO DETAIL:"""

            response = self.cloud_service.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=[json.dumps(scene_info)],
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1500,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=Config.GEMINI_THINKING_BUDGET
                    ),
                    system_instruction=system_prompt,
                    response_mime_type="application/json"
                ),
            )
            
            response_text = getattr(response, 'text', '') or ''
            try:
                detailed_scene = json.loads(response_text)
                detailed_scene['id'] = str(uuid.uuid4())
                return detailed_scene
            except Exception:
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    detailed_scene = json.loads(json_match.group(0))
                    detailed_scene['id'] = str(uuid.uuid4())
                    return detailed_scene
                raise ValueError("Model did not return valid JSON for scene details")
            
        except Exception as e:
            self.logger.error(f"Error generating scene details: {str(e)}")
            raise
    
    def _generate_character_profiles(self, story_structure: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate detailed character profiles"""
        try:
            system_prompt = f"""You are a character development specialist. Create detailed character profiles for this story.

STORY CONTEXT:
{story_structure}

REQUIREMENTS:
- Create 1-4 main characters based on the story
- Provide detailed physical descriptions for visual consistency
- Include personality traits, motivations, and speaking style
- Ensure characters fit the story's genre, tone, and setting
- Make all character details specific and actionable for video generation
 - If key_entities includes animals or named persons (e.g., man and dog), include matching profiles or ensure they are present within scenes. Key entities to include: {story_structure.get('key_entities')}

RESPONSE FORMAT (JSON):
{{
  "characters": [
    {{
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting",
      "age_range": "approximate age",
      "physical_description": "Detailed visual description for video generation",
      "clothing_style": "Typical clothing and accessories",
      "personality_traits": ["trait1", "trait2", "trait3"],
      "motivations": "Primary character motivation",
      "speaking_style": "How they speak and express themselves",
      "key_relationships": "Relationships with other characters",
      "character_arc": "How they change throughout the story",
      "visual_references": "Any specific visual styling notes"
    }}
  ]
}}

Generate characters for this story:"""

            response = self.cloud_service.genai_client.models.generate_content(
                model=Config.GEMINI_MODEL,
                contents=["Generate character profiles based on the system instruction"],
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1200,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=Config.GEMINI_THINKING_BUDGET
                    ),
                    system_instruction=system_prompt,
                    response_mime_type="application/json"
                ),
            )
            
            response_text = getattr(response, 'text', '') or ''
            try:
                character_data = json.loads(response_text)
                characters = character_data.get('characters', [])
                for character in characters:
                    character['id'] = str(uuid.uuid4())
                return characters
            except Exception:
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    character_data = json.loads(json_match.group(0))
                    characters = character_data.get('characters', [])
                    for character in characters:
                        character['id'] = str(uuid.uuid4())
                    return characters
                raise ValueError("Model did not return valid JSON for character profiles")
            
        except Exception as e:
            self.logger.error(f"Error generating character profiles: {str(e)}")
            raise
    
    def _extract_story_from_text(self, response_text: str, prompt: str) -> Dict[str, Any]:
        """Deprecated: no text extraction fallbacks. Always raise to surface failure upstream."""
        raise ValueError("Model did not return structured JSON; no fallback allowed")
    
    def _create_fallback_structure(self, prompt: str) -> Dict[str, Any]:
        """Deprecated: no structure fallbacks allowed."""
        raise ValueError("Fallback structure is disabled")
    
    def _create_fallback_scenes(self, prompt: str) -> List[Dict[str, Any]]:
        """Deprecated: no scene fallbacks allowed."""
        raise ValueError("Fallback scenes are disabled")
    
    def update_story_element(self, story_data: Dict[str, Any], element_type: str, element_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a specific story element (scene, character, etc.)"""
        try:
            if element_type == 'scene':
                scenes = story_data.get('scenes', [])
                for i, scene in enumerate(scenes):
                    if scene.get('id') == element_id:
                        scenes[i] = {**scene, **updates}
                        break
                story_data['scenes'] = scenes
                
            elif element_type == 'character':
                characters = story_data.get('characters', [])
                for i, character in enumerate(characters):
                    if character.get('id') == element_id:
                        characters[i] = {**character, **updates}
                        break
                story_data['characters'] = characters
                
            elif element_type == 'story':
                # Update story metadata
                allowed_fields = ['title', 'premise', 'tone', 'genre', 'visual_style', 'setting']
                for field in allowed_fields:
                    if field in updates:
                        story_data[field] = updates[field]
            
            # Update timestamp
            story_data['updated_at'] = datetime.utcnow().isoformat()
            
            self.logger.info(f"Updated {element_type} {element_id} in story")
            return story_data
            
        except Exception as e:
            self.logger.error(f"Error updating story element: {str(e)}")
            raise
    
    def regenerate_story_element(self, story_data: Dict[str, Any], element_type: str, element_id: str = None) -> Dict[str, Any]:
        """Regenerate a specific story element or entire story"""
        try:
            if element_type == 'full_story':
                # Regenerate entire story from original prompt
                return self.generate_story_from_prompt(story_data.get('original_prompt', ''))
                
            elif element_type == 'scenes':
                # Regenerate all scenes
                story_structure = {
                    'title': story_data.get('title'),
                    'genre': story_data.get('genre'),
                    'tone': story_data.get('tone'),
                    'visual_style': story_data.get('visual_style'),
                    'setting': story_data.get('setting'),
                    'scene_structure': [scene for scene in story_data.get('scenes', [])]
                }
                new_scenes = self._generate_detailed_scenes(story_structure, story_data.get('original_prompt', ''))
                story_data['scenes'] = new_scenes
                story_data['scene_count'] = len(new_scenes)
                
            elif element_type == 'characters':
                # Regenerate character profiles
                new_characters = self._generate_character_profiles(story_data)
                story_data['characters'] = new_characters
            
            # Update timestamp
            story_data['updated_at'] = datetime.utcnow().isoformat()
            
            self.logger.info(f"Regenerated {element_type} for story")
            return story_data
            
        except Exception as e:
            self.logger.error(f"Error regenerating story element: {str(e)}")
            raise