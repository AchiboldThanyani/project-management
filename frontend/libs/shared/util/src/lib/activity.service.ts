import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Activity } from '@pm/shared/models';
import { environment } from './environment';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/activity`;

  getRecent(count = 50) {
    return this.http.get<Activity[]>(`${this.base}?count=${count}`);
  }
}
