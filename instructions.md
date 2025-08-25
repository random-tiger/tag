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

### **Updated Create Story Flow**

**Simple, Fast, Fun** - Built for short attention spans and instant gratification.

---

#### **1. Prompt Your Story**
*   **What it is:** One text box to describe your story idea
*   **UI:** Full-screen hero with large multiline prompt box, placeholder examples, and a primary "Create Story" button
*   **How it works:**
    *   Type a single prompt and submit
    *   AI infers length, genre, tone, characters, setting, and visual style from your prompt
    *   The wizard pre-fills all subsequent steps with AI selections; you can accept or tweak them
*   **Example prompt:** "A boy and his dog save the world in a modern city at golden hour. Cinematic, adventurous tone."

#### **2. Create Your Story Board** 
*   **What it is:** AI generates your complete storyboards for each scene
*   **UI:** Cool cosmic loading animation with story elements appearing
*   **What you see:** Characters forming, scenes building, progress bar

#### **3. Review & Edit Your Story**
*   **What it is:** See your complete story as storyboard cards and make quick edits
*   **UI:** Grid of storyboard cards with a right-side summary panel
*   **What you can do:**
    *   Click any storyboard card to open its edit panel
    *   Use "Edit All" to step through scenes sequentially
    *   View/update story summary and main characters
*   **Primary actions:**
    *   **🔥 Love it** - Start making videos
    *   **🔄 Try again** - Generate a new version

#### **4. Guided Edits**

*   **What it is:** Structured edit panels that open from storyboard cards or "Edit dAll"
*   **How it works:** Use dedicated panels to update key elements
    *   Story Overview → Edit title, premise, tone, length
    *   Characters → Update appearance, traits, motivations; add/remove characters
    *   Scenes → For each scene, adjust setting, camera/shot types, pacing, and dialog intensity with sliders, toggles, and dropdowns
*   **Save flow:** Changes save instantly; use "Done" to return to step 3

#### **5. Start Making Videos**
*   **What it is:** Choose how to create your video story
*   **Two options:**
    *   **🎬 Make Whole Story** - AI creates all videos at once (3-5 minutes)
    *   **🎨 One Scene at a Time** - Review each scene and generate individually.
*   **Background mode:** Start creation and get notified when done

---

#### **Smart Features**
*   **Auto-save:** Never lose your story progress
*   **Background creation:** Start video generation and keep using the app
*   **Push notifications:** Get alerted when your videos are ready
*   **Share before creating:** Send story ideas to friends before making videos

#### **Touch-Friendly Design**
*   Large tap targets (minimum 44px)
*   Simple vertical scrolling
*   Thumb-friendly bottom buttons for main actions
*   Satisfying cosmic animations and micro-interactions

---

### **Backend Content Generation Requirements**

**Critical:** While the frontend is simple for users, the backend must generate extremely detailed content for high-quality video generation.

#### **Story Structure Generation**
*   **Character Details:** Full character profiles with physical descriptions, personality traits, motivations, speaking style, and mannerisms
*   **Scene Breakdowns:** Detailed scene descriptions including:
    *   Setting/location with specific environmental details
    *   Camera angles and shot types (wide shot, close-up, tracking shot, etc.)
    *   Lighting conditions and mood (golden hour, dramatic shadows, soft light, etc.)
    *   Character positioning and movements
    *   Props and background elements
*   **Dialog:** Complete, natural-sounding dialog with:
    *   Character-specific voice and tone and specific text.
    *   Emotional context and delivery notes
    *   Pacing and timing information

#### **Video Generation Prompts**
*   **Detailed Veo Prompts:** Each scene must include:
    *   Comprehensive visual descriptions (clothing, facial expressions, body language)
    *   Specific action descriptions with timing
    *   Environmental storytelling elements
    *   Continuity details (character appearance consistency, prop placement)
    *   Technical video parameters (aspect ratio, duration, style)

#### **User Abstraction**
*   **Frontend Simplicity:** Users only see story summaries and simple scene descriptions
*   **Backend Complexity:** Full technical details generated automatically for optimal video quality
*   **Intelligent Defaults:** AI determines all technical parameters (shot types, lighting, pacing) based on story context and user preferences

---

### **Agent Flow Schema (Human Prompt → Output)**

```mermaid
flowchart TD
  A[User: Prompt Your Story (Step 1)] --> B[Frontend: actions.generateStoryFromPrompt]
  B --> C[POST /api/stories/generate]
  C --> D[Flask: generate_story_from_prompt]
  D --> E[StoryGenerationService.generate_story_from_prompt]
  E --> F[Gemini: Story Structure\nmodels.generate_content\nresponse_mime_type=application/json\nThinkingConfig(budget)]
  F --> G[Parse structured JSON\n(title, premise, arc, scenes meta)]
  G --> H[Gemini: Detailed Scenes (per scene)\nJSON]
  G --> I[Gemini: Character Profiles\nJSON]
  H --> J[Assemble Story Data]
  I --> J
  J --> K[Return story JSON → Frontend]
  K --> L[Create Your Story Board (Step 2) + Review & Edit (Step 3)]
  L --> M[Guided Edits (Step 4) → regenerate/update]
  M --> N{Start Making Videos (Step 5)}
  N --> O[Whole Story Mode]
  N --> P[One Scene at a Time]
  O --> Q[Create Story + loop scenes\nPOST /api/stories/{id}/generate]
  P --> Q
  Q --> R[VideoService starts operation\nVeo config → GCS]
  R --> S[Poll status\nGET /api/generation-status/{opId}]
  S --> T[Segments complete in Firestore]
  T --> U[POST /api/stories/{id}/stitch]
  U --> V[Final video in GCS\nHTTP URL via CloudService]
  V --> W[Frontend playback / share]

  subgraph Observability & Storage
    X[Structured logging]
    Y[Firestore: stories, segments, operations]
    Z[GCS: videos/, stories/]
  end

  D -. logs .-> X
  E -. writes .-> Y
  R -. writes .-> Z
  T -. updates .-> Y
```
