export enum ProjectMemberRole {
  Viewer  = 'Viewer',
  Member  = 'Member',
  Lead    = 'Lead',
  Manager = 'Manager',
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
  systemRole: number;
  openTaskCount: number;
  joinedAt: string;
}
