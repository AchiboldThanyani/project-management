import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { CreateProjectRequest, Project, UpdateProjectRequest } from '@pm/shared/models';
import { CreateSprintRequest, Sprint, UpdateSprintRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${environment.apiUrl}/projects`;
  private readonly sprintsBase = `${environment.apiUrl}/sprints`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<PagedResult<Project>>(this.base).pipe(map(r => r.items));
  }

  getById(id: string) {
    return this.http.get<Project>(`${this.base}/${id}`);
  }

  create(request: CreateProjectRequest) {
    return this.http.post<Project>(this.base, request);
  }

  update(id: string, request: UpdateProjectRequest) {
    return this.http.put<Project>(`${this.base}/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getSprints(projectId: string) {
    return this.http.get<Sprint[]>(`${this.base}/${projectId}/sprints`);
  }

  getFutureSprints(projectId: string) {
    return this.http.get<Sprint[]>(`${this.sprintsBase}/project/${projectId}/future`);
  }

  createSprint(projectId: string, request: CreateSprintRequest) {
    return this.http.post<Sprint>(`${this.base}/${projectId}/sprints`, request);
  }

  updateSprint(sprintId: string, request: UpdateSprintRequest) {
    return this.http.put<Sprint>(`${this.sprintsBase}/${sprintId}`, request);
  }

  deleteSprint(sprintId: string) {
    return this.http.delete<void>(`${this.sprintsBase}/${sprintId}`);
  }

  activateSprint(sprintId: string) {
    return this.http.post<Sprint>(`${this.sprintsBase}/${sprintId}/activate`, {});
  }

  completeSprint(sprintId: string, retroNotes?: string, targetSprintId?: string | null) {
    return this.http.post<Sprint>(`${this.sprintsBase}/${sprintId}/complete`, {
      retroNotes: retroNotes ?? null,
      targetSprintId: targetSprintId ?? null,
    });
  }
}
