import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectMember, ProjectMemberRole } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class ProjectMemberService {
  private base(projectId: string) { return `${environment.apiUrl}/projects/${projectId}/members`; }

  constructor(private http: HttpClient) {}

  getByProject(projectId: string) {
    return this.http.get<ProjectMember[]>(this.base(projectId));
  }

  add(projectId: string, userId: string, role: ProjectMemberRole) {
    return this.http.post<ProjectMember>(this.base(projectId), { userId, role });
  }

  updateRole(projectId: string, userId: string, role: ProjectMemberRole) {
    return this.http.patch<ProjectMember>(`${this.base(projectId)}/${userId}/role`, { role });
  }

  remove(projectId: string, userId: string) {
    return this.http.delete<void>(`${this.base(projectId)}/${userId}`);
  }
}
