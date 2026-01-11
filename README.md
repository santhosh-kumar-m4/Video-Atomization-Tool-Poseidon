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

Will document once the core pipeline is working

## AI Usage

Using OpenAI API for:
- Whisper API for video transcription
- GPT-4 for analyzing transcripts and detecting key moments

More details to be added...
