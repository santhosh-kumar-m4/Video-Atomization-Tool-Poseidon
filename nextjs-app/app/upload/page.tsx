'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const maxSize = 500 * 1024 * 1024;
    
    if (!file.type.startsWith('video/')) {
      setUploadError('Please select a video file');
      return;
    }

    if (file.size > maxSize) {
      setUploadError('File size exceeds 500MB limit');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const uploadVideo = async () => {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('video', selectedFile);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((100 * e.loaded) / e.total);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setIsUploading(false);
          setUploadSuccess(true);
          setSelectedFile(null);
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          const errorData = JSON.parse(xhr.responseText || '{}');
          const errorMsg = errorData.message || errorData.error || 'Upload failed';
          setUploadError(errorMsg);
          setIsUploading(false);
          setUploadProgress(0);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadError('Upload failed');
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', '/api/videos/upload');
      xhr.send(formData);
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="upload-container">
      <div className="header">
        <Link href="/" className="btn-back">Back to Videos</Link>
        <h2>Upload Video</h2>
      </div>

      {uploadSuccess && (
        <div className="success-message">
          Video uploaded successfully!
        </div>
      )}

      {uploadError && (
        <div className="error-message">
          {uploadError}
        </div>
      )}

      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {!selectedFile ? (
          <div className="upload-content">
            <p className="upload-icon">📹</p>
            <p>Drag and drop your video here</p>
            <p className="file-size-hint">Maximum file size: 500MB</p>
            <p className="or-text">or</p>
            <label htmlFor="file-input" className="file-button">Choose File</label>
            <input 
              type="file" 
              id="file-input" 
              accept="video/*" 
              onChange={onFileSelected}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div className="file-selected">
            <p>Selected: {selectedFile.name}</p>
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
            <div className="file-actions">
              <button onClick={clearSelection}>Change File</button>
              <button onClick={uploadVideo} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="progress-text">{uploadProgress}%</p>
        </div>
      )}
    </div>
  );
}
