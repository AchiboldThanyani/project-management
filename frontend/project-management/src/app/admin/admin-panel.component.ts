import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@pm/auth/data-access';
import { AdminService, AdminUser } from './admin.service';

const ROLE_LABELS: Record<number, string> = { 0: 'Internal', 1: 'Customer', 2: 'Admin' };
const ROLE_CLASSES: Record<number, string> = { 0: 'role-internal', 1: 'role-customer', 2: 'role-admin' };

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-wrap">
      <div class="topbar">
        <div class="topbar-left">
          <span class="material-icons-round topbar-icon">admin_panel_settings</span>
          <div>
            <div class="topbar-title">Admin Panel</div>
            <div class="topbar-sub">System user management</div>
          </div>
        </div>
        <div class="topbar-meta">
          <span class="stat-chip">{{ users().length }} users</span>
          <span class="stat-chip admins">{{ adminCount() }} admins</span>
        </div>
      </div>

      <div class="content">
        @if (loading()) {
          <div class="loading"><div class="spinner"></div></div>
        } @else {
          <!-- Search -->
          <div class="search-bar">
            <span class="material-icons-round">search</span>
            <input [(ngModel)]="search" placeholder="Search users by name or email…" />
          </div>

          <!-- Role filter tabs -->
          <div class="filter-tabs">
            <button [class.active]="roleFilter() === null" (click)="roleFilter.set(null)">All</button>
            <button [class.active]="roleFilter() === 2" (click)="roleFilter.set(2)">
              <span class="material-icons-round">shield</span> Admins
            </button>
            <button [class.active]="roleFilter() === 0" (click)="roleFilter.set(0)">Internal</button>
            <button [class.active]="roleFilter() === 1" (click)="roleFilter.set(1)">Customers</button>
          </div>

          <!-- User table -->
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Change Role</th>
                </tr>
              </thead>
              <tbody>
                @for (u of filtered(); track u.id) {
                  <tr [class.self-row]="u.id === currentUserId()">
                    <td class="user-cell">
                      <div class="avatar" [class]="avatarClass(u.role)">{{ initials(u.fullName) }}</div>
                      <div>
                        <div class="user-name">{{ u.fullName }}
                          @if (u.id === currentUserId()) {
                            <span class="you-badge">You</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="email-cell">{{ u.email }}</td>
                    <td>
                      <span [class]="'role-badge ' + roleClass(u.role)">{{ roleLabel(u.role) }}</span>
                    </td>
                    <td class="action-cell">
                      @if (u.id !== currentUserId()) {
                        <select [ngModel]="u.role" (ngModelChange)="changeRole(u, $event)" class="role-select">
                          <option [value]="0">Internal</option>
                          <option [value]="1">Customer</option>
                          <option [value]="2">Admin</option>
                        </select>
                      } @else {
                        <span class="no-change">Cannot change own role</span>
                      }
                    </td>
                  </tr>
                }
                @if (filtered().length === 0) {
                  <tr><td colspan="4" class="empty-row">No users match your search.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    .topbar {
      background: var(--white); border-bottom: 1px solid var(--border);
      padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .topbar-left { display: flex; align-items: center; gap: 12px; }
    .topbar-icon { font-size: 28px; color: var(--violet); }
    .topbar-title { font-size: 18px; font-weight: 700; color: var(--ink); }
    .topbar-sub { font-size: 12px; color: var(--muted); }
    .topbar-meta { display: flex; gap: 8px; }
    .stat-chip { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-full); padding: 4px 12px; font-size: 12px; font-weight: 600; color: var(--muted); }
    .stat-chip.admins { background: var(--amber-c); color: var(--amber); border-color: var(--amber); }

    .content { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 16px; }
    .loading { display: flex; justify-content: center; padding: 60px; }
    .spinner { width: 28px; height: 28px; border: 2px solid var(--border); border-top-color: var(--violet); border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .search-bar {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      background: var(--white); border: 1px solid var(--border); border-radius: var(--r-md);
    }
    .search-bar .material-icons-round { font-size: 18px; color: var(--soft); }
    .search-bar input { border: none; outline: none; flex: 1; font-size: 14px; color: var(--ink); background: transparent; }

    .filter-tabs { display: flex; gap: 6px; }
    .filter-tabs button {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 14px; border-radius: var(--r-full); border: 1px solid var(--border);
      background: var(--white); color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all .15s;
    }
    .filter-tabs button .material-icons-round { font-size: 15px; }
    .filter-tabs button.active { background: var(--violet-c); color: var(--violet); border-color: var(--violet); }

    .table-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--surface); }
    th { padding: 11px 16px; font-size: 11px; font-weight: 700; color: var(--muted); text-align: left; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid var(--border); }
    td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr.self-row { background: var(--violet-mid); }
    tr:hover:not(.self-row) td { background: var(--surface); }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
    .avatar.av-internal { background: var(--blue); }
    .avatar.av-customer { background: var(--teal); }
    .avatar.av-admin    { background: var(--amber); }
    .user-name { font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 6px; }
    .you-badge { font-size: 10px; font-weight: 600; background: var(--violet-c); color: var(--violet); padding: 1px 7px; border-radius: var(--r-full); }
    .email-cell { font-size: 13px; color: var(--muted); }

    .role-badge { padding: 3px 10px; border-radius: var(--r-full); font-size: 12px; font-weight: 600; }
    .role-internal { background: var(--blue-c);   color: var(--blue); }
    .role-customer  { background: var(--teal-c);   color: var(--teal); }
    .role-admin     { background: var(--amber-c);  color: var(--amber); }

    .action-cell { width: 180px; }
    .role-select { border: 1px solid var(--border); border-radius: var(--r-md); padding: 6px 10px; font-size: 13px; color: var(--ink); background: var(--surface); outline: none; cursor: pointer; width: 100%; }
    .role-select:focus { border-color: var(--violet); }
    .no-change { font-size: 12px; color: var(--soft); font-style: italic; }
    .empty-row { text-align: center; color: var(--soft); padding: 32px !important; font-size: 14px; }
  `],
})
export class AdminPanelComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private auth = inject(AuthService);

  users = signal<AdminUser[]>([]);
  loading = signal(true);
  search = '';
  roleFilter = signal<number | null>(null);

  currentUserId = () => this.auth.user()?.userId ?? '';
  adminCount = () => this.users().filter(u => u.role === 2).length;

  filtered(): AdminUser[] {
    const q = this.search.toLowerCase();
    return this.users().filter(u => {
      const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = this.roleFilter() === null || u.role === this.roleFilter();
      return matchSearch && matchRole;
    });
  }

  ngOnInit() {
    this.adminSvc.getUsers().subscribe({
      next: u => { this.users.set(u); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  changeRole(user: AdminUser, newRole: number) {
    const prevRole = user.role;
    this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    this.adminSvc.changeRole(user.id, newRole).subscribe({
      error: () => this.users.update(list => list.map(u => u.id === user.id ? { ...u, role: prevRole } : u)),
    });
  }

  roleLabel(r: number) { return ROLE_LABELS[r] ?? 'Internal'; }
  roleClass(r: number) { return ROLE_CLASSES[r] ?? 'role-internal'; }
  avatarClass(r: number) { return r === 2 ? 'av-admin' : r === 1 ? 'av-customer' : 'av-internal'; }
  initials(name: string) { return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase(); }
}
