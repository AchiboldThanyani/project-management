import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./team-list.component').then((m) => m.TeamListComponent),
  },
];
