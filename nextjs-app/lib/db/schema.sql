-- schema for video atomization app

-- videos table
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  duration INTEGER, -- in seconds
  file_size BIGINT, -- bytes
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  transcript_text TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- clips table
CREATE TABLE IF NOT EXISTS clips (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10, 2) NOT NULL, -- seconds
  end_time DECIMAL(10, 2) NOT NULL, -- seconds
  title VARCHAR(255),
  horizontal_path VARCHAR(500), -- 16:9 clip path
  vertical_path VARCHAR(500), -- 9:16 clip path
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON clips(video_id);
