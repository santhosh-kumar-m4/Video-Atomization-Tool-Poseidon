# Video Atomization Tool - Poseidon

A web application that automatically transforms long-form videos into short, shareable clips using AI-powered moment detection.

## Overview

This tool processes long-form videos (10-30 minutes) and automatically:
1. Generates timestamped transcripts
2. Identifies key moments using AI
3. Creates short clips from detected moments
4. Exports clips in both horizontal (16:9) and vertical (9:16) formats

## Tech Stack

- **Frontend:** Angular
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (using Neon for easy setup)
- **Video Processing:** ffmpeg
- **AI:** OpenAI API (Whisper for transcription, GPT-4 for moment detection)

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
- OpenAI API key

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
OPENAI_API_KEY=your_openai_api_key_here
UPLOAD_DIR=./uploads
CLIPS_DIR=./clips
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
                              ├──> OpenAI API (Whisper + GPT-4)
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
2. **Transcription**: Video sent to OpenAI Whisper → Transcript stored in DB
3. **Moment Detection**: Transcript analyzed by GPT-4 → Key moments identified → Clips created in DB
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

5. **Video Duration**: Not extracted on upload (TODO in code)
   - Assumption: Not critical for MVP, can add later with ffprobe

## AI Usage

### OpenAI API Integration

**Whisper API** (for transcription):
- Model: `whisper-1`
- Input: Video file stream
- Output: Plain text transcript
- Usage: Called when user clicks "Generate Transcript"

**GPT-4** (for moment detection):
- Model: `gpt-4`
- Input: Transcript text with prompt
- Output: JSON array of moments with titles and timestamps
- Temperature: 0.7 (balanced creativity/consistency)
- Usage: Called when user clicks "Detect Moments"

### Prompt Engineering

The moment detection prompt asks GPT-4 to:
- Identify 3-5 key moments
- Generate short titles (< 50 chars)
- Estimate timestamps based on transcript position
- Return structured JSON array

The system prompt sets context: "You are a video editor. Find the most interesting moments in transcripts that would work as short clips."

### AI Usage Notes

- API calls are made synchronously (user waits)
- Transcripts are cached in database (no re-generation)
- Moments are cached (can re-detect if needed)
- Error handling includes retry logic for API failures
