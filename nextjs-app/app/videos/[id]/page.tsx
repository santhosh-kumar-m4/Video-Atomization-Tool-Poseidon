'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  duration: number | null;
  status: string;
  created_at: string;
}

interface Transcript {
  id: number;
  video_id: number;
  transcript_text: string;
  status: string;
}

interface Moment {
  id: number;
  video_id: number;
  start_time: number;
  end_time: number;
  title: string;
}

interface Clip {
  id: number;
  video_id: number;
  start_time: number;
  end_time: number;
  title: string;
  horizontal_path: string | null;
  vertical_path: string | null;
}

export default function VideoDetailsPage() {
  const params = useParams();
  const videoId = params.id ? parseInt(params.id as string) : NaN;

  const [video, setVideo] = useState<Video | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isDetectingMoments, setIsDetectingMoments] = useState(false);
  const [isGeneratingClips, setIsGeneratingClips] = useState(false);
  
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoId && !isNaN(videoId)) {
      loadVideoDetails(videoId);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [videoId]);

  const loadVideoDetails = async (id: number) => {
    setIsLoading(true);
    setError(null);
    setDataLoaded(false);

    try {
      const [videoRes, transcriptRes, momentsRes, clipsRes] = await Promise.all([
        fetch(`/api/videos/${id}`),
        fetch(`/api/transcripts/${id}`),
        fetch(`/api/moments/${id}`),
        fetch(`/api/clips/${id}`)
      ]);

      if (!videoRes.ok) {
        throw new Error('Failed to load video');
      }

      const videoData = await videoRes.json();
      setVideo(videoData.video);

      if (transcriptRes.ok) {
        const transcriptData = await transcriptRes.json();
        if (transcriptData.success && transcriptData.transcript) {
          setTranscript(transcriptData.transcript);
        }
      }

      if (momentsRes.ok) {
        const momentsData = await momentsRes.json();
        if (momentsData.success) {
          setMoments(momentsData.moments || []);
        }
      } else {
        setMoments([]);
      }

      if (clipsRes.ok) {
        const clipsData = await clipsRes.json();
        if (clipsData.success) {
          setClips(clipsData.clips || []);
        }
      } else {
        setClips([]);
      }

      setDataLoaded(true);
    } catch (err) {
      setError('Failed to load video');
      console.error('Error loading video:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClips = async (id: number) => {
    try {
      const response = await fetch(`/api/clips/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClips(data.clips || []);
        }
      }
    } catch (err) {
      setClips([]);
    }
  };

  const generateTranscript = async () => {
    if (!video) return;

    setIsGeneratingTranscript(true);
    
    try {
      const response = await fetch(`/api/transcripts/${video.id}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to generate transcript');
      }
      
      const data = await response.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
      
      if (data.transcript?.status === 'processing') {
        pollTranscriptStatus(video.id);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate transcript';
      setOperationError(errorMsg);
      setTimeout(() => setOperationError(null), 5000);
      console.error('Transcript error:', err);
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  const pollTranscriptStatus = (id: number) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/transcripts/${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.transcript) {
            setTranscript(data.transcript);
            if (data.transcript.status === 'completed' || data.transcript.status === 'failed') {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }
        }
      } catch (err) {
      }
    }, 2000);

    setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }, 300000);
  };

  const detectMoments = async () => {
    if (!video) return;

    setIsDetectingMoments(true);
    
    try {
      const response = await fetch(`/api/moments/${video.id}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to detect moments');
      }
      
      const data = await response.json();
      if (data.moments) {
        setMoments(data.moments);
        loadClips(video.id);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to detect moments';
      setOperationError(errorMsg);
      setTimeout(() => setOperationError(null), 5000);
      console.error('Moments error:', err);
    } finally {
      setIsDetectingMoments(false);
    }
  };

  const generateClips = async () => {
    if (!video) return;

    setIsGeneratingClips(true);
    
    try {
      const response = await fetch(`/api/clips/${video.id}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to generate clips');
      }
      
      const data = await response.json();
      loadClips(video.id);
      const count = data.results?.filter((r: any) => r.status === 'generated').length || 0;
      setOperationSuccess(`Generated ${count} clips successfully`);
      setTimeout(() => setOperationSuccess(null), 5000);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate clips';
      setOperationError(errorMsg);
      setTimeout(() => setOperationError(null), 5000);
      console.error('Clips error:', err);
    } finally {
      setIsGeneratingClips(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone
    });
  };

  const copyTranscriptToClipboard = () => {
    if (!transcript || !transcript.transcript_text) {
      return;
    }

    navigator.clipboard.writeText(transcript.transcript_text).then(() => {
      setOperationSuccess('Transcript copied to clipboard!');
      setTimeout(() => setOperationSuccess(null), 3000);
    }).catch((err) => {
      setOperationError('Failed to copy transcript');
      setTimeout(() => setOperationError(null), 3000);
      console.error('Copy error:', err);
    });
  };

  const getGeneratedClipsCount = (): number => {
    return clips.filter(c => c.horizontal_path && c.vertical_path).length;
  };

  const allClipsGenerated = (): boolean => {
    if (clips.length === 0) return false;
    return clips.every(c => c.horizontal_path && c.vertical_path);
  };

  const downloadClip = (clipId: number, format: 'horizontal' | 'vertical', e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `/api/clips/download/${clipId}/${format}`;
    window.open(url, '_blank');
  };

  if (isLoading || !dataLoaded) {
    return (
      <div className="video-details-container">
        <div className="loading">Loading video details...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-details-container">
        <div className="error">{error || 'Video not found'}</div>
        <Link href="/" className="btn-back" style={{ marginTop: '1rem', display: 'inline-block' }}>← Back to Videos</Link>
      </div>
    );
  }

  return (
    <div className="video-details-container">
      <div className="header">
        <Link href="/" className="btn-back">← Back to Videos</Link>
        <h1>Video Details</h1>
      </div>

      {operationError && (
        <div className="operation-error">{operationError}</div>
      )}
      
      {operationSuccess && (
        <div className="operation-success">{operationSuccess}</div>
      )}

      <div className="video-info-section">
        <h2>{video.original_filename}</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">File Size:</span>
            <span>{formatFileSize(video.file_size)}</span>
          </div>
          <div className="info-item">
            <span className="label">Duration:</span>
            <span>{formatDuration(video.duration)}</span>
          </div>
          <div className="info-item">
            <span className="label">Status:</span>
            <span className={`status-badge status-${video.status}`}>{video.status}</span>
          </div>
          <div className="info-item">
            <span className="label">Uploaded:</span>
            <span>{formatDate(video.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="pipeline-section">
        <h2>Processing Pipeline</h2>

        <div className="pipeline-step">
          <div className="step-header">
            <h3>1. Transcript Generation</h3>
            {transcript ? (
              <span className={`status-badge status-${transcript.status}`}>
                {transcript.status}
              </span>
            ) : (
              <span className="status-badge status-pending">Not Started</span>
            )}
          </div>
          
          {transcript && transcript.status === 'completed' && (
            <div className="step-content">
              <p className="transcript-preview">
                {transcript.transcript_text.substring(0, 200)}...
              </p>
              <button 
                className="btn-copy" 
                onClick={copyTranscriptToClipboard}
                title="Copy full transcript to clipboard"
              >
                📋 Copy Full Transcript
              </button>
            </div>
          )}
          
          <button 
            className="btn-action" 
            disabled={isGeneratingTranscript || (transcript?.status === 'processing')}
            onClick={generateTranscript}
          >
            {isGeneratingTranscript || transcript?.status === 'processing' 
              ? 'Generating...' 
              : transcript && transcript.status === 'completed'
              ? 'Regenerate Transcript'
              : 'Generate Transcript'}
          </button>
        </div>

        <div className="pipeline-step">
          <div className="step-header">
            <h3>2. Detect Key Moments</h3>
            {moments.length > 0 ? (
              <span className="status-badge status-completed">{moments.length} moments</span>
            ) : (
              <span className="status-badge status-pending">Not Started</span>
            )}
          </div>
          
          {moments.length > 0 && (
            <div className="moments-list">
              {moments.map((moment) => (
                <div key={moment.id} className="moment-item">
                  <strong>{moment.title}</strong>
                  <span>{formatTime(moment.start_time)} - {formatTime(moment.end_time)}</span>
                </div>
              ))}
            </div>
          )}
          
          <button 
            className="btn-action" 
            disabled={isDetectingMoments || !transcript || transcript.status !== 'completed'}
            onClick={detectMoments}
          >
            {isDetectingMoments 
              ? 'Detecting...' 
              : moments.length > 0
              ? 'Re-detect Moments'
              : 'Detect Moments'}
          </button>
          {(!transcript || transcript.status !== 'completed') && (
            <p className="step-hint">Generate transcript first</p>
          )}
        </div>

        <div className="pipeline-step">
          <div className="step-header">
            <h3>3. Generate Clips</h3>
            {clips.length > 0 ? (
              <span className={`status-badge ${allClipsGenerated() ? 'status-completed' : 'status-processing'}`}>
                {getGeneratedClipsCount()}/{clips.length} generated
              </span>
            ) : (
              <span className="status-badge status-pending">Not Started</span>
            )}
          </div>
          
          {clips.length > 0 && (
            <div className="clips-gallery">
              {clips.map((clip) => (
                <div key={clip.id} className="clip-card">
                  <div className="clip-card-header">
                    <h4>{clip.title}</h4>
                    <span className="clip-duration">{formatTime(clip.start_time)} - {formatTime(clip.end_time)}</span>
                  </div>
                  
                  <div className="clip-formats-section">
                    <div className="format-item">
                      <div className="format-label">
                        <span className="format-name">16:9 (Horizontal)</span>
                        {clip.horizontal_path ? (
                          <span className="format-badge ready">Ready</span>
                        ) : (
                          <span className="format-badge pending">Not Generated</span>
                        )}
                      </div>
                      {clip.horizontal_path && (
                        <button 
                          className="btn-download" 
                          onClick={(e) => downloadClip(clip.id, 'horizontal', e)}
                        >
                          Download
                        </button>
                      )}
                    </div>
                    
                    <div className="format-item">
                      <div className="format-label">
                        <span className="format-name">9:16 (Vertical)</span>
                        {clip.vertical_path ? (
                          <span className="format-badge ready">Ready</span>
                        ) : (
                          <span className="format-badge pending">Not Generated</span>
                        )}
                      </div>
                      {clip.vertical_path && (
                        <button 
                          className="btn-download" 
                          onClick={(e) => downloadClip(clip.id, 'vertical', e)}
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button 
            className="btn-action" 
            disabled={isGeneratingClips || moments.length === 0}
            onClick={generateClips}
          >
            {isGeneratingClips 
              ? 'Generating...' 
              : clips.length > 0
              ? 'Regenerate All Clips'
              : 'Generate Clips'}
          </button>
          {moments.length === 0 && (
            <p className="step-hint">Detect moments first</p>
          )}
        </div>
      </div>
    </div>
  );
}
