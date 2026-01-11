// transcript service using OpenAI Whisper
const OpenAI = require('openai');
const fs = require('fs');
const pool = require('../config');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateTranscript(videoId, videoPath) {
  try {
    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (videoResult.rows.length === 0) {
      throw new Error('Video not found');
    }

    if (!fs.existsSync(videoPath)) {
      throw new Error('Video file not found');
    }

    const transcriptResult = await pool.query(
      `INSERT INTO transcripts (video_id, status) 
       VALUES ($1, 'processing') 
       RETURNING id`,
      [videoId]
    );
    const transcriptId = transcriptResult.rows[0].id;

    await pool.query(
      'UPDATE videos SET status = $1 WHERE id = $2',
      ['processing', videoId]
    );

    const videoFile = fs.createReadStream(videoPath);

    const transcription = await openai.audio.transcriptions.create({
      file: videoFile,
      model: 'whisper-1',
      response_format: 'text'
    });

    await pool.query(
      `UPDATE transcripts 
       SET transcript_text = $1, status = 'completed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [transcription, transcriptId]
    );

    await pool.query(
      'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['uploaded', videoId]
    );

    return {
      id: transcriptId,
      video_id: videoId,
      transcript_text: transcription,
      status: 'completed'
    };

  } catch (error) {
    console.error('Transcript generation error:', error);

    try {
      await pool.query(
        `UPDATE transcripts SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
         WHERE video_id = $1 AND status = 'processing'`,
        [videoId]
      );
    } catch (updateError) {
      console.error('Error updating transcript status:', updateError);
    }

    try {
      await pool.query(
        'UPDATE videos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['uploaded', videoId]
      );
    } catch (updateError) {
      console.error('Error updating video status:', updateError);
    }

    throw error;
  }
}

async function getTranscript(videoId) {
  try {
    const result = await pool.query(
      'SELECT * FROM transcripts WHERE video_id = $1 ORDER BY created_at DESC LIMIT 1',
      [videoId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
}

module.exports = {
  generateTranscript,
  getTranscript
};
