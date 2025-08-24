# Tag

A cutting-edge web application that enables users to create captivating video narratives using Google's Veo 3 AI technology. Build longer, more compelling stories by generating sequential video segments that flow seamlessly together.

## 🌟 Features

### 🎬 AI-Powered Video Generation
- **Google Veo 3 Integration**: Leverage Google's state-of-the-art video generation models
- **Text-to-Video**: Create videos from detailed text descriptions
- **Image-to-Video**: Generate videos starting from uploaded images
- **Frame Continuity**: Seamlessly connect segments using the last frame of previous videos

### 📖 Sequential Storytelling
- **Multi-Segment Stories**: Build narratives with multiple connected video segments
- **Automatic Stitching**: Combine all segments into a final, cohesive video
- **Real-Time Progress**: Track generation status with live updates
- **Story Management**: Organize and manage multiple story projects

### 🎨 Cosmic UI Design
- **Premium Dark Theme**: Space-inspired design with vibrant gradients
- **Tubi Brand Colors**: Cosmic purple, magenta, and signature yellow accents
- **Responsive Design**: Beautiful experience across all devices
- **Smooth Animations**: Framer Motion-powered transitions and interactions

### ☁️ Cloud-Native Architecture
- **Google Cloud Platform**: Reliable, scalable infrastructure
- **Cloud Storage**: Secure video storage and delivery
- **Firestore Database**: Real-time data synchronization
- **Observability**: Structured logging and error tracking

## 🏗️ Architecture

### Backend Stack
- **Flask**: Python web framework
- **Google Cloud SDK**: Veo 3 integration and cloud services
- **Firestore**: NoSQL database for stories and segments
- **Cloud Storage**: Video file storage and delivery
- **MoviePy**: Video processing and stitching
- **OpenCV**: Frame extraction and image processing

### Frontend Stack
- **React 18**: Modern UI framework
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Animation library
- **Lucide React**: Beautiful icons
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Google Cloud Project with billing enabled
- Vertex AI API enabled

### 1. Clone the Repository
```bash
git clone <repository-url>
cd simple
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your Google Cloud project details

# Ensure service account key is in place
# Place your service-account-key.json in the root directory
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Start the Backend
```bash
# From backend directory
cd backend
python app.py
```

### 5. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## 📚 User Guide

### Creating Your First Story

1. **Navigate to Create Story**
   - Click "Start Creating" from the homepage
   - Or go to the "Create" section

2. **Enter Story Details**
   - Provide a compelling title
   - Add an optional description
   - Choose from quick-start templates or create custom

3. **Create First Scene**
   - Write a detailed prompt describing your opening scene
   - Optionally upload a starting image
   - Click "Create & Generate First Scene"

4. **Add More Scenes**
   - From your story page, click "Add Scene"
   - Describe what happens next
   - The AI will use the last frame from the previous scene

5. **Create Final Video**
   - Once you have multiple scenes, click "Create Final Video"
   - The platform will stitch all segments together

### Best Practices for Prompts

- **Be Specific**: Include details about setting, characters, mood, and camera angles
- **Use Cinematic Language**: Describe camera movements, lighting, and atmosphere
- **Maintain Continuity**: Reference elements from previous scenes
- **Consider Audio**: Mention desired sound effects or dialogue

## 🛠️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | Your GCP project ID | Required |
| `GOOGLE_CLOUD_REGION` | GCP region for services | us-central1 |
| `GCS_BUCKET_NAME` | Cloud Storage bucket name | Required |
| `FLASK_DEBUG` | Enable debug mode | false |
| `PORT` | Backend server port | 8080 |

### Video Generation Settings

The platform supports various configuration options aligned with Veo 3 capabilities:

- **Duration**: 8-second segments (configurable)
- **Resolution**: 1080p or 720p
- **Aspect Ratio**: 16:9 (optimized for storytelling)
- **Audio**: Automatic audio generation enabled
- **Enhancement**: AI prompt optimization enabled

## 🔧 Development

### Project Structure
```
simple/
├── backend/                 # Flask backend
│   ├── services/           # Business logic services
│   ├── config/            # Configuration management
│   ├── utils/             # Utility functions
│   └── app.py            # Main Flask application
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── services/      # API client services
│   └── public/           # Static assets
├── instructions.md         # Original requirements
├── service-account-key.json # GCP credentials
└── veo3_video_generation.py # Reference implementation
```

### API Endpoints

- `POST /api/stories` - Create new story
- `GET /api/stories/{id}` - Get story details
- `POST /api/stories/{id}/generate` - Generate video segment
- `POST /api/stories/{id}/stitch` - Stitch story segments
- `GET /api/generation-status/{id}` - Check generation status

### Testing

```bash
# Backend tests
cd backend
python -m pytest tests/

# Frontend tests
cd frontend
npm test
```

## 🌐 Deployment

### Google Cloud Run (Recommended)

1. **Build and Deploy Backend**
```bash
cd backend
gcloud run deploy videostory-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

2. **Deploy Frontend**
```bash
cd frontend
npm run build
# Deploy build/ to your preferred static hosting service
```

### Docker Deployment

```bash
# Backend
cd backend
docker build -t videostory-backend .
docker run -p 8080:8080 videostory-backend

# Frontend
cd frontend
docker build -t videostory-frontend .
docker run -p 3000:3000 videostory-frontend
```

## 📝 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🔗 Resources

- [Google Veo 3 Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/video/overview)
- [Vertex AI Python SDK](https://github.com/googleapis/python-aiplatform)
- [React Documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📞 Support

For support, please:
1. Check the documentation above
2. Search existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ using Google Veo 3, React, and Flask**
