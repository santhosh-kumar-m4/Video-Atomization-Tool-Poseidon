-- Database schema for Video Atomization Tool

-- Videos table - stores uploaded video metadata
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  duration INTEGER, -- duration in seconds
  file_size BIGINT, -- file size in bytes
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transcripts table - stores video transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  transcript_text TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clips table - stores generated clip metadata
CREATE TABLE IF NOT EXISTS clips (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10, 2) NOT NULL, -- start time in seconds
  end_time DECIMAL(10, 2) NOT NULL, -- end time in seconds
  title VARCHAR(255),
  horizontal_path VARCHAR(500), -- path to 16:9 clip
  vertical_path VARCHAR(500), -- path to 9:16 clip
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON clips(video_id);
