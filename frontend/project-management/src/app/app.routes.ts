import { Route } from '@angular/router';
import { adminGuard, authGuard, clientGuard, guestGuard } from '@pm/shared/util';

export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('@pm/auth/feature').then((m) => m.authRoutes),
  },
  {
    path: 'join/:token',
    loadComponent: () => import('./join-project.component').then((m) => m.JoinProjectComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-panel.component').then(m => m.AdminPanelComponent),
  },
  {
    path: 'portal',
    canActivate: [clientGuard],
    loadComponent: () => import('./portal/portal-shell.component').then((m) => m.PortalShellComponent),
    children: [
      { path: '', redirectTo: 'tickets', pathMatch: 'full' },
      {
        path: 'tickets',
        loadComponent: () => import('./portal/portal-tickets.component').then((m) => m.PortalTicketsComponent),
      },
      {
        path: 'tickets/new',
        loadComponent: () => import('./portal/portal-new-ticket.component').then((m) => m.PortalNewTicketComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () => import('./portal/portal-ticket-detail.component').then((m) => m.PortalTicketDetailComponent),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@pm/layout/feature').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        loadChildren: () => import('@pm/projects/feature').then((m) => m.projectsRoutes),
      },
      {
        path: 'teams',
        loadChildren: () => import('@pm/teams/feature').then((m) => m.teamsRoutes),
      },
      {
        path: 'sprint-board',
        loadComponent: () => import('./sprint-board.component').then((m) => m.SprintBoardComponent),
      },
      {
        path: 'activity',
        loadComponent: () => import('./activity-feed.component').then((m) => m.ActivityFeedComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('@pm/auth/feature').then((m) => m.ProfileComponent),
      },
      {
        path: 'support',
        loadComponent: () => import('./customer-portal-page.component').then((m) => m.CustomerPortalPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
