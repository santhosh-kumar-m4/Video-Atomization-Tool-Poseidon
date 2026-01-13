import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';

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

@Component({
  selector: 'app-video-details',
  imports: [CommonModule, RouterModule],
  templateUrl: './video-details.html',
  styleUrl: './video-details.css',
})
export class VideoDetails implements OnInit {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  video = signal<Video | null>(null);
  transcript = signal<Transcript | null>(null);
  moments = signal<Moment[]>([]);
  clips = signal<Clip[]>([]);
  
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  isGeneratingTranscript = signal(false);
  isDetectingMoments = signal(false);
  isGeneratingClips = signal(false);
  
  operationError = signal<string | null>(null);
  operationSuccess = signal<string | null>(null);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const videoId = params['id'];
      if (videoId) {
        this.loadVideoDetails(parseInt(videoId));
      }
    });
  }

  loadVideoDetails(videoId: number) {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<{ video: Video }>(`${this.apiUrl}/videos/${videoId}`).subscribe({
      next: (response) => {
        this.video.set(response.video);
        this.isLoading.set(false);
        this.loadTranscript(videoId);
        this.loadMoments(videoId);
        this.loadClips(videoId);
      },
      error: (err) => {
        this.error.set('Failed to load video');
        this.isLoading.set(false);
        console.error('Error loading video:', err);
      }
    });
  }

  loadTranscript(videoId: number) {
    this.http.get<{ success: boolean; transcript: Transcript }>(`${this.apiUrl}/transcripts/${videoId}`).subscribe({
      next: (response) => {
        if (response.success && response.transcript) {
          this.transcript.set(response.transcript);
        }
      },
      error: () => {
        this.transcript.set(null);
      }
    });
  }

  loadMoments(videoId: number) {
    this.http.get<{ success: boolean; moments: Moment[] }>(`${this.apiUrl}/moments/${videoId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.moments.set(response.moments || []);
        }
      },
      error: () => {
        this.moments.set([]);
      }
    });
  }

  loadClips(videoId: number) {
    this.http.get<{ success: boolean; clips: Clip[] }>(`${this.apiUrl}/clips/${videoId}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.clips.set(response.clips || []);
        }
      },
      error: () => {
        this.clips.set([]);
      }
    });
  }

  generateTranscript() {
    const video = this.video();
    if (!video) return;

    this.isGeneratingTranscript.set(true);
    
    this.http.post(`${this.apiUrl}/transcripts/${video.id}/generate`, {}).subscribe({
      next: (response: any) => {
        this.isGeneratingTranscript.set(false);
        if (response.transcript) {
          this.transcript.set(response.transcript);
        }
        this.pollTranscriptStatus(video.id);
      },
      error: (err) => {
        this.isGeneratingTranscript.set(false);
        const errorMsg = err.error?.message || err.error?.error || 'Failed to generate transcript';
        this.operationError.set(errorMsg);
        setTimeout(() => this.operationError.set(null), 5000);
        console.error('Transcript error:', err);
      }
    });
  }

  pollTranscriptStatus(videoId: number) {
    const interval = setInterval(() => {
      this.loadTranscript(videoId);
      const transcript = this.transcript();
      if (transcript && transcript.status === 'completed') {
        clearInterval(interval);
      } else if (transcript && transcript.status === 'failed') {
        clearInterval(interval);
      }
    }, 2000);

    setTimeout(() => clearInterval(interval), 300000);
  }

  detectMoments() {
    const video = this.video();
    if (!video) return;

    this.isDetectingMoments.set(true);
    
    this.http.post(`${this.apiUrl}/moments/${video.id}/detect`, {}).subscribe({
      next: (response: any) => {
        this.isDetectingMoments.set(false);
        if (response.moments) {
          this.moments.set(response.moments);
          this.loadClips(video.id);
        }
      },
      error: (err) => {
        this.isDetectingMoments.set(false);
        const errorMsg = err.error?.message || err.error?.error || 'Failed to detect moments';
        this.operationError.set(errorMsg);
        setTimeout(() => this.operationError.set(null), 5000);
        console.error('Moments error:', err);
      }
    });
  }

  generateClips() {
    const video = this.video();
    if (!video) return;

    this.isGeneratingClips.set(true);
    
    this.http.post(`${this.apiUrl}/clips/${video.id}/generate`, {}).subscribe({
      next: (response: any) => {
        this.isGeneratingClips.set(false);
        this.loadClips(video.id);
        const count = response.results?.filter((r: any) => r.status === 'generated').length || 0;
        this.operationSuccess.set(`Generated ${count} clips successfully`);
        setTimeout(() => this.operationSuccess.set(null), 5000);
      },
      error: (err) => {
        this.isGeneratingClips.set(false);
        const errorMsg = err.error?.message || err.error?.error || 'Failed to generate clips';
        this.operationError.set(errorMsg);
        setTimeout(() => this.operationError.set(null), 5000);
        console.error('Clips error:', err);
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    let date: Date;
    
    if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString + 'Z');
    }
    
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  copyTranscriptToClipboard() {
    const transcript = this.transcript();
    if (!transcript || !transcript.transcript_text) {
      return;
    }

    navigator.clipboard.writeText(transcript.transcript_text).then(() => {
      this.operationSuccess.set('Transcript copied to clipboard!');
      setTimeout(() => this.operationSuccess.set(null), 3000);
    }).catch((err) => {
      this.operationError.set('Failed to copy transcript');
      setTimeout(() => this.operationError.set(null), 3000);
      console.error('Copy error:', err);
    });
  }

  getGeneratedClipsCount(): number {
    return this.clips().filter(c => c.horizontal_path && c.vertical_path).length;
  }

  allClipsGenerated(): boolean {
    const clipsList = this.clips();
    if (clipsList.length === 0) return false;
    return clipsList.every(c => c.horizontal_path && c.vertical_path);
  }

  downloadClip(clipId: number, format: 'horizontal' | 'vertical', event: Event) {
    event.stopPropagation();
    const url = `${this.apiUrl}/clips/${clipId}/download/${format}`;
    window.open(url, '_blank');
  }
}
