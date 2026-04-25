export enum ProjectMemberRole {
  Viewer  = 0,
  Member  = 1,
  Lead    = 2,
  Manager = 3,
}

export const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  [ProjectMemberRole.Viewer]:  'Viewer',
  [ProjectMemberRole.Member]:  'Member',
  [ProjectMemberRole.Lead]:    'Lead',
  [ProjectMemberRole.Manager]: 'Manager',
};

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  fullName: string;
  email: string;
  role: ProjectMemberRole;
  openTaskCount: number;
  joinedAt: string;
}
