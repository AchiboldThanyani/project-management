import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '@pm/shared/models';
import { environment } from '@pm/shared/util';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly base = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<User[]>(this.base);
  }
}
