import { Routes } from '@angular/router';

export const projectsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./list/project-list.component').then((m) => m.ProjectListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./detail/project-detail.component').then((m) => m.ProjectDetailComponent),
  },
];
