import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-upload',
  imports: [CommonModule, RouterModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css',
})
export class Upload {
  private apiUrl = 'http://localhost:3000/api'; // TODO: move to env config
  private router = inject(Router);
  
  isDragging = signal(false);
  uploadProgress = signal(0);
  isUploading = signal(false);
  uploadError = signal<string | null>(null);
  uploadSuccess = signal(false);
  selectedFile: File | null = null;

  constructor(private http: HttpClient) {}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    // basic validation
    if (!file.type.startsWith('video/')) {
      this.uploadError.set('Please select a video file');
      return;
    }

    this.selectedFile = file;
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
  }

  uploadVideo() {
    if (!this.selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('video', this.selectedFile);

    this.isUploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set(null);

    this.http.post(`${this.apiUrl}/videos/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress.set(progress);
        } else if (event.type === HttpEventType.Response) {
          this.isUploading.set(false);
          this.uploadSuccess.set(true);
          this.selectedFile = null;
          setTimeout(() => {
            this.router.navigate(['/videos']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isUploading.set(false);
        this.uploadError.set(error.error?.message || 'Upload failed');
        this.uploadProgress.set(0);
      }
    });
  }

  clearSelection() {
    this.selectedFile = null;
    this.uploadError.set(null);
    this.uploadSuccess.set(false);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
}
