# Video Atomization Tool - Poseidon

A web application that automatically transforms long-form videos into short, shareable clips using AI-powered moment detection.

## Overview

This tool processes long-form videos (10-30 minutes) and automatically:
1. Generates transcripts using AI (Whisper)
2. Identifies key moments using AI (with estimated timestamps)
3. Creates short clips from detected moments
4. Exports clips in both horizontal (16:9) and vertical (9:16) formats

## Tech Stack

- **Frontend:** Angular
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (using Neon for easy setup)
- **Video Processing:** ffmpeg
- **AI:** Groq (Whisper for transcription), OpenRouter (GPT-OSS-20B for moment detection)

## Project Structure

```
Video-Atomization-Tool-Poseidon/
├── video-atomization-frontend/  # Angular frontend
├── backend/                      # Node.js backend API
│   ├── src/                      # Source code (routes, controllers, etc)
│   ├── uploads/                  # Uploaded videos
│   └── clips/                    # Generated clips
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL database (or use Neon for cloud setup)
- ffmpeg installed on your system
- Groq API key (free) - for transcription
- OpenRouter API key (free) - for moment detection
- Optional: OpenAI API key (if you prefer paid models)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/video_atomization
UPLOAD_DIR=./uploads
CLIPS_DIR=./clips

# AI Services (Free options)
USE_GROQ=true
GROQ_API_KEY=your_groq_api_key_here
USE_OPENROUTER=true
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=openai/gpt-oss-20b:free
APP_URL=http://localhost:3000

# Optional: OpenAI (if you prefer paid models)
OPENAI_API_KEY=your_openai_api_key_here
```

4. Initialize database:
```bash
npm run db:init
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd video-atomization-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm start
```

## Architecture

### System Overview

The application follows a client-server architecture with a clear separation between frontend and backend:

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Angular   │ ──────> │   Express    │ ──────> │  PostgreSQL │
│  Frontend   │  HTTP   │    Backend    │  SQL    │  (Neon DB)  │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ├──> Groq API (Whisper transcription)
                              ├──> OpenRouter API (Moment detection)
                              └──> FFmpeg (Video Processing)
```

### Tech Stack Decisions

**Frontend: Angular (instead of Next.js)**
- Chose Angular over Next.js for this project because:
  - Better fit for the team's existing experience
  - Strong component-based architecture for dashboard UI
  - Built-in dependency injection and services
  - TypeScript-first approach aligns with backend patterns
  - The assignment emphasizes "working pipeline" over specific framework choice

**Backend: Node.js + Express**
- RESTful API design
- Service layer pattern for business logic
- Database connection pooling with `pg`
- File handling with Multer

**Database: PostgreSQL (Neon)**
- Relational data model (videos, transcripts, clips)
- Foreign key constraints with CASCADE deletes
- Indexes on frequently queried columns

### Data Flow

1. **Upload**: User uploads video → Stored in `uploads/` → Metadata saved to DB
2. **Transcription**: Video sent to Groq Whisper → Transcript stored in DB
3. **Moment Detection**: Transcript analyzed by OpenRouter (GPT-OSS-20B) → Key moments identified → Clips created in DB
4. **Clip Generation**: FFmpeg processes video → Generates 16:9 and 9:16 formats → Files saved to `clips/`
5. **Download**: User requests clip → Backend serves file from `clips/` directory

### Database Schema

- **videos**: Stores uploaded video metadata
- **transcripts**: One-to-one with videos, stores transcript text and status
- **clips**: One-to-many with videos, stores moment timestamps and file paths

### API Endpoints

- `POST /api/videos/upload` - Upload video
- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video
- `POST /api/transcripts/:videoId/generate` - Generate transcript
- `GET /api/transcripts/:videoId` - Get transcript
- `POST /api/moments/:videoId/detect` - Detect key moments
- `GET /api/moments/:videoId` - Get moments
- `POST /api/clips/:videoId/generate` - Generate all clips
- `GET /api/clips/:videoId` - Get clips for video
- `GET /api/clips/:clipId/download/:format` - Download clip (horizontal/vertical)

### Trade-offs & Assumptions

1. **File Storage**: Videos and clips stored locally (not in cloud storage)
   - Trade-off: Simpler setup, but not scalable for production
   - Assumption: Single-server deployment

2. **Synchronous Processing**: Transcript and clip generation are blocking operations
   - Trade-off: Simpler code, but user waits for completion
   - Future: Could add job queue (Bull, BullMQ) for async processing

3. **No Authentication**: No user auth implemented
   - Assumption: Single-user or internal tool usage

4. **Error Handling**: Basic error handling with try-catch
   - Trade-off: Works for MVP, but could use centralized error middleware

5. **Video Duration**: Extracted on upload using ffprobe
   - Duration is automatically extracted when video is uploaded
   - If extraction fails, duration is set to null (upload still succeeds)

## AI Usage

### AI Service Integration

The application uses **free AI services** to keep costs at zero:

**Groq API** (for transcription):
- Service: Groq (free tier)
- Model: `whisper-large-v3-turbo`
- Input: Video file stream
- Output: Plain text transcript
- Usage: Called when user clicks "Generate Transcript"
- Why Groq: Free, fast, and uses the latest Whisper model

**OpenRouter API** (for moment detection):
- Service: OpenRouter (free tier)
- Model: `openai/gpt-oss-20b:free` (21B parameter model)
- Input: Transcript text with prompt
- Output: JSON array of moments with titles and timestamps
- Temperature: 0.7 (balanced creativity/consistency)
- Usage: Called when user clicks "Detect Moments"
- Why OpenRouter: Free access to powerful open-source models, OpenAI-compatible API

### Alternative: OpenAI (Paid)

The code supports OpenAI as a fallback:
- Set `USE_GROQ=false` to use OpenAI Whisper
- Set `USE_OPENROUTER=false` to use OpenAI GPT-4
- Requires valid `OPENAI_API_KEY` with credits

### Prompt Engineering

The moment detection prompt asks the LLM to:
- Identify 3-5 key moments
- Generate short titles (< 50 chars)
- Estimate timestamps based on transcript position
- Return structured JSON array

The system prompt sets context: "You are a video editor. Find the most interesting moments in transcripts that would work as short clips."

### AI Usage Notes

- API calls are made synchronously (user waits)
- Transcripts are cached in database (no re-generation)
- Moments are cached (can re-detect if needed)
- Error handling includes proper error messages for API failures
- Free tier limits: Groq has generous limits, OpenRouter has 50 free requests/day (1000/day with $10+ credits)

## Testing

### Manual Testing Checklist

1. **Video Upload**
   - Upload a video file (max 500MB)
   - Verify file size validation works
   - Check video appears in dashboard
   - Verify duration is extracted

2. **Transcript Generation**
   - Generate transcript for uploaded video
   - Verify transcript appears in video details
   - Check transcript status updates correctly

3. **Moment Detection**
   - Detect moments from transcript
   - Verify 3-5 moments are detected
   - Check moment titles and timestamps

4. **Clip Generation**
   - Generate clips for detected moments
   - Verify both horizontal (16:9) and vertical (9:16) formats
   - Check clips appear in gallery

5. **Download**
   - Download horizontal clip
   - Download vertical clip
   - Verify files download correctly

6. **Error Handling**
   - Test with invalid file types
   - Test with files exceeding size limit
   - Verify error messages display correctly

## Project Status

✅ **Completed Features:**
- Video upload with validation (500MB limit)
- Video duration extraction using ffprobe
- Transcript generation with Groq Whisper (free)
- AI-powered moment detection with OpenRouter GPT-OSS-20B (free)
- Clip generation in 16:9 and 9:16 formats
- Download functionality for generated clips
- Dashboard UI with video listing
- Video details page with processing pipeline
- Environment configuration with free AI services
- Error handling and user feedback
- File size and type validation

✅ **Code Quality:**
- Proper error handling
- Input validation
- Clean code structure
- Comprehensive documentation

## Next Steps (Future Enhancements)

- Add job queue for async processing (Bull/BullMQ)
- Implement user authentication
- Add cloud storage integration (S3, etc.)
- Add video preview/thumbnail generation
- Implement search and filtering
- Add batch processing capabilities
- Improve error logging and monitoring
