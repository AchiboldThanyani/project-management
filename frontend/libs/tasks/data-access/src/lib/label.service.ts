import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly base = `${environment.apiUrl}/labels`;

  constructor(private http: HttpClient) {}

  getByProject(projectId: string) {
    return this.http.get<Label[]>(`${this.base}/project/${projectId}`);
  }

  seed(projectId: string) {
    return this.http.post<void>(`${this.base}/project/${projectId}/seed`, {});
  }

  create(projectId: string, name: string, color: string) {
    return this.http.post<Label>(this.base, { projectId, name, color });
  }

  delete(labelId: string) {
    return this.http.delete<void>(`${this.base}/${labelId}`);
  }

  addToTask(labelId: string, taskId: string) {
    return this.http.post<void>(`${this.base}/${labelId}/tasks/${taskId}`, {});
  }

  removeFromTask(labelId: string, taskId: string) {
    return this.http.delete<void>(`${this.base}/${labelId}/tasks/${taskId}`);
  }
}
