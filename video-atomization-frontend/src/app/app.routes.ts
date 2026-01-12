import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/videos',
    pathMatch: 'full'
  },
  {
    path: 'upload',
    loadComponent: () => import('./upload/upload').then(m => m.Upload)
  },
  {
    path: 'videos',
    loadComponent: () => import('./video-list/video-list').then(m => m.VideoList)
  },
  {
    path: 'videos/:id',
    loadComponent: () => import('./video-details/video-details').then(m => m.VideoDetails)
  }
];
