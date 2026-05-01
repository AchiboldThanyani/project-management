export enum ProjectStatus {
  Planning = 'Planning',
  Active = 'Active',
  OnHold = 'OnHold',
  Completed = 'Completed',
  Archived = 'Archived',
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  teamId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  teamId?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.Planning]: 'Planning',
  [ProjectStatus.Active]: 'Active',
  [ProjectStatus.OnHold]: 'On Hold',
  [ProjectStatus.Completed]: 'Completed',
  [ProjectStatus.Archived]: 'Archived',
};
