import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Issue, IssueComment, CreateIssueRequest, UpdateIssueRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class IssueService {
  private readonly base = `${environment.apiUrl}/issues`;

  constructor(private http: HttpClient) {}

  getByProject(projectId: string, page = 1, pageSize = 200) {
    return this.http.get<PagedResult<Issue>>(
      `${this.base}/project/${projectId}`, { params: { page, pageSize } }
    ).pipe(map(r => r.items));
  }

  getById(id: string) {
    return this.http.get<Issue>(`${this.base}/${id}`);
  }

  create(request: CreateIssueRequest) {
    return this.http.post<Issue>(this.base, request);
  }

  update(id: string, request: UpdateIssueRequest) {
    return this.http.put<Issue>(`${this.base}/${id}`, request);
  }

  close(id: string) {
    return this.http.patch<Issue>(`${this.base}/${id}/close`, {});
  }

  reopen(id: string) {
    return this.http.patch<Issue>(`${this.base}/${id}/reopen`, {});
  }

  convertToTask(id: string, sprintId: string | null, priority: number | null) {
    return this.http.post<any>(`${this.base}/${id}/convert`, { sprintId, priority });
  }

  getComments(id: string) {
    return this.http.get<IssueComment[]>(`${this.base}/${id}/comments`);
  }

  addComment(id: string, content: string) {
    return this.http.post<IssueComment>(`${this.base}/${id}/comments`, { content });
  }
}
