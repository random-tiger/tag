### **Overview**

You're building a web application where users can generate video segments using Google's Veo in sequential order to tell a longer story. 

For example, 

A user should be able to provide and image and / or text to generate a video. Then, when the video is generated, the user can choose to continue by writing a prompt, and the system will use frames from the previous video and it's initial prompt to see the next generation and so on. The platform will then stitch them all together. 

---

### **Design System & Visual Identity**

The app follows a **cosmic, premium dark theme** with vibrant gradients inspired by Tubi's brand identity:

**Color Palette:**
- **Primary Background:** Deep space gradient from `#0B0019` to `#1A0033` with cosmic purple undertones
- **Hero Gradient:** Vibrant purple-to-magenta gradient (`#8A2BE2` to `#FF1493` to `#9400D3`)
- **Primary Accent:** `#FFFF13` (Tubi signature yellow)
- **Primary Foreground:** `white` with high contrast
- **Secondary Purple:** `#9725C7`, `#5B25C7`, `#8A2BE2`
- **Cosmic Accents:** `#FF1493` (bright magenta), `#4B0082` (deep purple)
- **Error/Required:** `#F03E3E` (red)
- **Transparent Overlays:** 
  - 75%: `rgba(255, 255, 255, 0.75)`
  - 20%: `rgba(255, 255, 255, 0.20)`
  - 10%: `rgba(255, 255, 255, 0.10)`
  - 5%: `rgba(255, 255, 255, 0.05)`

**Typography:**
- **Primary Font:** 'Inter' (clean, modern for body text)
- **Display Font:** 'Tubi Stans Variable' (bold, space-age for headers/hero text)
- **Font Weights:** 190 (ultra-light), 500 (medium), 700 (bold), 900 (black)
- **Hero Text:** Large, bold white text with subtle glow effects

**Visual Elements:**
- **Cosmic Theme:** Space-inspired design with planetary elements, gradients, and cosmic imagery
- **Buttons:** Rounded pill shape (borderRadius: 999px) with yellow accent background (`#FFFF13`) and dark text
- **Hero Buttons:** Larger scale with subtle glow and hover animations
- **Cards:** 12px border radius with gradient backgrounds and cosmic elements
- **Form Inputs:** 12px border radius with 1px white outline (20% opacity)
- **Glass Effects:** Backdrop blur (20-30px) with semi-transparent gradient backgrounds
- **Gradients:** 
  - Hero sections: Purple-to-magenta gradients with cosmic depth
  - Background: Deep space gradients with subtle color transitions
  - Accent elements: Radial gradients around interactive elements
- **Planetary Icons:** Circular, 3D-styled planet icons with orbital rings and cosmic textures
- **Spacing:** Generous white space with cosmic scale proportions

---

### **Create Story Flow**


Of course. Here is that workflow converted into well-structured Markdown.

---

### **Mobile-Optimized Story Creation Workflow**

This document outlines the mobile-first user journey for creating compelling stories quickly and intuitively on phone-sized screens while preserving full storytelling power.

**Mobile Design Principles:**
- Single-focus screens with one primary action
- Swipe-based navigation for natural mobile interactions  
- Bottom sheets and modals for progressive disclosure
- Chat-like conversational interfaces
- Touch-optimized gestures and 44px minimum tap targets

---

#### **1. Story Prompting (Conversational Interface)**
*   **UI:** Full-screen chat interface with AI avatar and cosmic background
*   **Interaction:** 
    *   Large text input with voice-to-text button
    *   Suggested story starter pills: "Adventure", "Romance", "Mystery", "Comedy", "Sci-Fi"
    *   Pull-up drawer with example prompts for inspiration
*   **User Input:** Natural language story concept
    *   *Example:* "I want to create an uplifting story about a boy and his dog."
*   **Process:** Real-time processing with animated cosmic loading indicators

#### **2. AI Story Generation (Progressive Loading)**
*   **UI:** Animated cosmic loading screen with story elements materializing
*   **Visual Feedback:** 
    *   Character silhouettes fading in
    *   Setting mood colors shifting across background
    *   Scene count incrementing with progress bar
    *   Estimated completion time display

#### **3. Story Overview (Swipeable Card Stack)**
*   **UI:** Full-screen swipeable cards replacing complex accordion interfaces
*   **Card Sequence:**
    1. **Synopsis Card:** Key story elements with cosmic visual backdrop
    2. **Characters Card:** Swipe horizontally through character profiles with portraits
    3. **World Card:** Immersive setting description with mood-appropriate visuals
    4. **Scenes Card:** Vertically scrollable timeline with scene thumbnails

*   **Quick Actions (Bottom Fixed Bar):**
    *   ❤️ **Love it** - Proceed to storyboard (primary CTA)
    *   ✏️ **Tweak it** - Quick edit mode
    *   🔄 **Rethink** - New prompt with context retained

#### **4. Quick Edit Mode (Bottom Sheet - Optional)**
*Only appears if user selects "Tweak it"*

*   **UI:** Slide-up panel with three quick-edit tabs
*   **Edit Options:**
    *   **Characters Tab:** Tap character names/traits to edit inline
    *   **Setting Tab:** Adjust mood/style with visual sliders and cosmic presets
    *   **Scenes Tab:** Add/remove/reorder scenes with drag-and-drop gestures
*   **Save Action:** Auto-saves changes, slides down to reveal updated story cards

#### **5. Storyboard Preview (Horizontal Scene Scroll)**
*   **UI:** Netflix-style horizontal scrolling scene tiles with cosmic frames
*   **Scene Tiles:** 
    *   Visual thumbnail with scene number
    *   One-line scene description overlay
    *   Character presence indicators (small avatar dots)
    *   Scene duration badge (max 8 seconds)
*   **Interactions:**
    *   **Swipe horizontally** to browse through scenes
    *   **Tap tile** for full-screen scene details modal
    *   **Long-press tile** for quick edit context menu
    *   **Pinch out** for overview of entire storyboard

#### **6. Scene Detail Editor (Full-Screen Modal)**
*   **UI:** Full-screen modal triggered by tapping any scene tile
*   **Layout:**
    *   Scene preview area with cosmic background matching story mood
    *   Auto-expanding textarea for scene description
    *   Character presence toggle chips (tap to add/remove characters)
    *   Key actions list with + button for new actions
    *   Smart suggestion pills based on story context
*   **Navigation:** Swipe left/right to move between scene editors

#### **7. Generation Choice (Action Sheet)**
*   **UI:** Bottom slide-up action sheet with clear visual distinction
*   **Options:**
    *   **🎬 Quick Story** - Generate entire story at once
        *   Subtitle: "Full story in 3-5 minutes"
        *   Visual: Progress timeline graphic
    *   **🎨 Scene by Scene** - Generate with scene-level control
        *   Subtitle: "Review each scene as it's created" 
        *   Visual: Step-by-step creation graphic
*   **Background Processing:** Option to start generation and receive notification when complete

---

### **Mobile-Specific Enhancements**

#### **Gesture Navigation**
```javascript
// Horizontal swipe between story overview cards
// Horizontal swipe through scene tiles in storyboard
// Vertical scroll for scene details and long content
// Pinch gesture for storyboard overview
// Long-press for context menus and quick actions
// Pull-down to refresh/regenerate elements
```

#### **Progressive Disclosure**
*   **Essential View:** Core story elements always visible
*   **Detail View:** Advanced options in modals and bottom sheets  
*   **Power User Features:** Accessible via long-press and settings

#### **Smart Mobile Features**
*   **Voice Input:** Available for all text fields with cosmic voice wave animation
*   **Share Story Concepts:** Before generating videos, share story outlines
*   **Auto-Save Drafts:** Never lose progress with background saving
*   **Background Generation:** Start video creation and continue using app
*   **Push Notifications:** Alert when generation is complete

#### **Touch Optimization**
*   All interactive elements minimum 44px touch targets
*   Swipe areas with visual feedback and haptic responses
*   Thumb-friendly bottom navigation and primary actions
*   Cosmic-themed loading states with satisfying micro-interactions

**Result:** Reduced from 8 complex steps to 5 streamlined interactions, cutting completion time from 3-5 minutes to 1-2 minutes while maintaining full creative control.