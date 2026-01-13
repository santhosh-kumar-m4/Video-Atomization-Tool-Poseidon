import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../environments/environment';

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  duration: number | null;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-video-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './video-list.html',
  styleUrl: './video-list.css',
})
export class VideoList implements OnInit {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private router = inject(Router);

  videos = signal<Video[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  deleteError = signal<string | null>(null);

  ngOnInit() {
    this.loadVideos();
  }

  loadVideos() {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<{ videos: Video[] }>(`${this.apiUrl}/videos`).subscribe({
      next: (response) => {
        this.videos.set(response.videos);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load videos');
        this.isLoading.set(false);
        console.error('Error loading videos:', err);
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

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    let date: Date;
    
    if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString + 'Z');
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleString('en-IN', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'uploaded': 'status-uploaded',
      'processing': 'status-processing',
      'completed': 'status-completed',
      'failed': 'status-failed'
    };
    return statusMap[status] || 'status-default';
  }

  viewVideo(id: number) {
    this.router.navigate(['/videos', id]);
  }

  deleteVideo(id: number, event: Event) {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    this.deleteError.set(null);

    this.http.delete(`${this.apiUrl}/videos/${id}`).subscribe({
      next: () => {
        this.loadVideos();
      },
      error: (err) => {
        const errorMsg = err.error?.message || err.error?.error || 'Failed to delete video';
        this.deleteError.set(errorMsg);
        setTimeout(() => this.deleteError.set(null), 5000);
        console.error('Delete error:', err);
      }
    });
  }
}
