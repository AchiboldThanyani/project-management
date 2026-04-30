import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';
import { UpdatesFeedDay } from '@pm/shared/models';

@Injectable({ providedIn: 'root' })
export class UpdatesService {
  private http = inject(HttpClient);

  getFeed(projectId: string, days = 14) {
    return this.http.get<UpdatesFeedDay[]>(
      `${environment.apiUrl}/projects/${projectId}/updates/feed`,
      { params: { days } }
    );
  }
}
