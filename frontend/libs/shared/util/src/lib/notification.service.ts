import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification } from '@pm/shared/models';
import { environment } from './environment';
import { SignalRService } from './signalr.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly signalr = inject(SignalRService);

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal(0);

  init(): void {
    this.load();
    this.signalr.events$.subscribe(({ event, payload }) => {
      if (event === 'Notification') {
        const n = payload as Notification;
        this.notifications.update(list => [n, ...list]);
        this.unreadCount.update(c => c + 1);
      }
    });
  }

  load(): void {
    this.http.get<Notification[]>(`${environment.apiUrl}/notifications`).subscribe(list => {
      this.notifications.set(list);
      this.unreadCount.set(list.filter(n => !n.isRead).length);
    });
  }

  markRead(id: string): void {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe(() => {
      this.notifications.update(list =>
        list.map(n => n.id === id ? { ...n, isRead: true } : n));
      this.unreadCount.update(c => Math.max(0, c - 1));
    });
  }

  markAllRead(): void {
    this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}).subscribe(() => {
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    });
  }
}
