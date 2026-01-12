const OpenAI = require('openai');
const pool = require('../config');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function detectMoments(videoId, transcriptText) {
  const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
  if (videoResult.rows.length === 0) {
    throw new Error('Video not found');
  }

  if (!transcriptText || transcriptText.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  const prompt = `Look at this video transcript and pick out 3-5 key moments that would make good short clips.
For each moment give me:
1. A short title (keep it under 50 chars)
2. Start time in seconds (rough estimate based on where it is in the transcript)
3. End time in seconds (each clip should be around 15-30 seconds)

Transcript:
${transcriptText}

Return a JSON array in this format:
[
  {
    "title": "Moment title",
    "start_time": 45.5,
    "end_time": 75.2
  }
]

Just return the JSON array, nothing else.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a video editor. Find the most interesting moments in transcripts that would work as short clips.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const content = response.choices[0].message.content.trim();
  
  let moments;
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      moments = JSON.parse(jsonMatch[0]);
    } else {
      moments = JSON.parse(content);
    }
  } catch (parseError) {
    console.error('Error parsing GPT response:', parseError);
    throw new Error('Failed to parse moment detection results');
  }

  const savedMoments = [];
  for (const moment of moments) {
    if (!moment.title || !moment.start_time || !moment.end_time) {
      continue;
    }

    if (moment.end_time <= moment.start_time) {
      moment.end_time = moment.start_time + 20;
    }

    const result = await pool.query(
      `INSERT INTO clips (video_id, start_time, end_time, title)
       VALUES ($1, $2, $3, $4)
       RETURNING id, video_id, start_time, end_time, title, created_at`,
      [videoId, moment.start_time, moment.end_time, moment.title]
    );

    savedMoments.push(result.rows[0]);
  }

  return savedMoments;
}

async function getMoments(videoId) {
  const result = await pool.query(
    'SELECT * FROM clips WHERE video_id = $1 ORDER BY start_time ASC',
    [videoId]
  );
  return result.rows;
}

module.exports = {
  detectMoments,
  getMoments
};
