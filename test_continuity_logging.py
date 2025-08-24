#!/usr/bin/env python3
"""
Test script to demonstrate continuity logging when generating video segments
"""

import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:8080"
STORY_ID = "test-story-continuity"

def create_test_story():
    """Create a test story"""
    response = requests.post(f"{BASE_URL}/api/stories", json={
        "title": "Continuity Test Story",
        "description": "Testing frame extraction and context passing"
    })
    if response.status_code == 201:
        story_data = response.json()
        return story_data['id']
    else:
        print(f"Failed to create story: {response.status_code}")
        return None

def generate_segment(story_id, prompt, use_previous_frame=False):
    """Generate a video segment"""
    print(f"\n🎬 Generating segment: '{prompt}' (use_previous_frame={use_previous_frame})")
    
    response = requests.post(f"{BASE_URL}/api/stories/{story_id}/generate", json={
        "prompt": prompt,
        "use_previous_frame": use_previous_frame
    })
    
    if response.status_code == 201:
        segment_data = response.json()
        operation_id = segment_data['operation_id']
        print(f"✅ Generation started. Operation ID: {operation_id}")
        return operation_id
    else:
        print(f"❌ Failed to generate segment: {response.status_code}")
        print(response.text)
        return None

def main():
    print("🎬 CONTINUITY LOGGING TEST")
    print("=" * 50)
    
    # Create story
    story_id = create_test_story()
    if not story_id:
        return
    
    print(f"Created story: {story_id}")
    
    # Generate first segment (no previous frame)
    print("\n--- FIRST SEGMENT (no continuity) ---")
    op1 = generate_segment(story_id, "a dog sits in a park", use_previous_frame=False)
    
    if op1:
        print("\n--- SECOND SEGMENT (with continuity attempt) ---")
        # Generate second segment with previous frame request
        op2 = generate_segment(story_id, "a human pets the dog", use_previous_frame=True)
        
        if op2:
            print(f"\n🎬 Check your backend logs to see the continuity logging!")
            print(f"Look for lines starting with '🎬 CONTINUITY:' and '🎬 FRAME EXTRACTION:'")
            print(f"\nYou should see:")
            print("- How many previous segments were found")
            print("- Which segment is being used as reference")
            print("- The previous prompt being used for context")
            print("- Frame extraction attempt and fallback to text continuity")
            print("- The final enhanced prompt with context")

if __name__ == "__main__":
    main()
