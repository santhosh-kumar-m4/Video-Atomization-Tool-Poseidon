'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  duration: number | null;
  status: string;
  created_at: string;
}

export default function Home() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/videos');
      if (!response.ok) {
        throw new Error('Failed to load videos');
      }
      const data = await response.json();
      setVideos(data.videos);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Error loading videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
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

  const getStatusClass = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'uploaded': 'status-uploaded',
      'processing': 'status-processing',
      'completed': 'status-completed',
      'failed': 'status-failed'
    };
    return statusMap[status] || 'status-default';
  };

  const viewVideo = (id: number) => {
    router.push(`/videos/${id}`);
  };

  const deleteVideo = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    setDeleteError(null);

    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to delete video');
      }
      
      loadVideos();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete video';
      setDeleteError(errorMsg);
      setTimeout(() => setDeleteError(null), 5000);
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="video-list-container">
      <div className="header">
        <h1>Video Dashboard</h1>
        <Link href="/upload" className="btn-primary">Upload Video</Link>
      </div>

      {isLoading && (
        <div className="loading">Loading videos...</div>
      )}

      {error && (
        <>
          <div className="error">{error}</div>
          <button className="btn-retry" onClick={loadVideos}>Retry</button>
        </>
      )}

      {!isLoading && !error && (
        <>
          {deleteError && (
            <div className="delete-error">{deleteError}</div>
          )}
          
          {videos.length === 0 ? (
            <div className="empty-state">
              <p>No videos uploaded yet.</p>
              <Link href="/upload" className="btn-primary">Upload Your First Video</Link>
            </div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => (
                <div key={video.id} className="video-card" onClick={() => viewVideo(video.id)}>
                  <div className="video-card-header">
                    <h3>{video.original_filename}</h3>
                    <span className={`status-badge ${getStatusClass(video.status)}`}>
                      {video.status}
                    </span>
                  </div>
                  
                  <div className="video-card-body">
                    <div className="video-info">
                      <span className="info-label">Size:</span>
                      <span>{formatFileSize(video.file_size)}</span>
                    </div>
                    <div className="video-info">
                      <span className="info-label">Duration:</span>
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                    <div className="video-info">
                      <span className="info-label">Uploaded:</span>
                      <span>{formatDate(video.created_at)}</span>
                    </div>
                  </div>

                  <div className="video-card-actions">
                    <button 
                      className="btn-view" 
                      onClick={(e) => {
                        e.stopPropagation();
                        viewVideo(video.id);
                      }}
                    >
                      View Details
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={(e) => deleteVideo(video.id, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
