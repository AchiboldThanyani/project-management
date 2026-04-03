import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateTeamRequest, Team, TeamRole } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly base = `${environment.apiUrl}/teams`;

  constructor(private http: HttpClient) {}

  getMyTeams() { return this.http.get<Team[]>(this.base); }
  getById(id: string) { return this.http.get<Team>(`${this.base}/${id}`); }
  create(request: CreateTeamRequest) { return this.http.post<Team>(this.base, request); }
  addMember(teamId: string, userId: string, role: TeamRole) {
    return this.http.post<Team>(`${this.base}/${teamId}/members`, { userId, role });
  }

  removeMember(teamId: string, userId: string) {
    return this.http.delete<Team>(`${this.base}/${teamId}/members/${userId}`);
  }
}
