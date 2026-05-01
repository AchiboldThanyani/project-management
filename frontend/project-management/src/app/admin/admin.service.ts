import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@pm/shared/util';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Staff' | 'ProjectManager' | 'Client' | 'Admin';
  fullName: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  getUsers() {
    return this.http.get<AdminUser[]>(`${this.base}/users`);
  }

  changeRole(userId: string, role: string) {
    return this.http.patch<void>(`${this.base}/users/${userId}/role`, { role });
  }
}
