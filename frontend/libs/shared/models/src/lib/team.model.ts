export enum TeamRole {
  Viewer = 0,
  Member = 1,
  Admin = 2,
  Owner = 3,
}

export interface TeamMember {
  userId: string;
  fullName: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  members: TeamMember[];
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  [TeamRole.Viewer]: 'Viewer',
  [TeamRole.Member]: 'Member',
  [TeamRole.Admin]: 'Admin',
  [TeamRole.Owner]: 'Owner',
};
