import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { CreateTaskRequest, Task, UpdateTaskRequest, UpdateTaskStatusRequest } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

interface PagedResult<T> { items: T[]; totalCount: number; page: number; pageSize: number; }

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getByProject(projectId: string) {
    return this.http.get<PagedResult<Task>>(`${this.base}/project/${projectId}`).pipe(map(r => r.items));
  }

  getById(id: string) {
    return this.http.get<Task>(`${this.base}/${id}`);
  }

  create(request: CreateTaskRequest) {
    return this.http.post<Task>(this.base, request);
  }

  update(id: string, request: UpdateTaskRequest) {
    return this.http.put<Task>(`${this.base}/${id}`, request);
  }

  updateStatus(id: string, request: UpdateTaskStatusRequest) {
    return this.http.patch<Task>(`${this.base}/${id}/status`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
