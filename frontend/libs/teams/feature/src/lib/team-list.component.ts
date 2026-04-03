import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TeamService } from '@pm/teams/data-access';
import { UserService } from '@pm/auth/data-access';
import { Team, TeamRole, TEAM_ROLE_LABELS, User } from '@pm/shared/models';
import { ConfirmDialogComponent } from '@pm/shared/util';

@Component({
  selector: 'pm-team-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div *ngIf="loading()" class="loading-wrap">
      <div class="spinner"></div>
    </div>

    <div *ngIf="error() && !loading()" class="error-state">
      <span class="material-icons-round error-ico">error_outline</span>
      <p>Could not load teams. Check your connection and try again.</p>
      <button class="btn-outline" (click)="ngOnInit()">Retry</button>
    </div>

    <div *ngIf="!loading() && !error()" class="teams-page">

      <!-- Topbar -->
      <div class="topbar">
        <div>
          <h1 class="page-title">Teams</h1>
          <p class="page-sub">Manage your teams and members</p>
        </div>
        <button class="btn-primary" (click)="openCreateTeam()">
          <span class="material-icons-round">group_add</span>
          New Team
        </button>
      </div>

      <!-- Teams grid -->
      <div class="teams-grid">

        <div *ngFor="let team of teams()" class="team-card">
          <div class="card-header">
            <div class="team-ico-wrap">
              <span class="material-icons-round team-ico">group</span>
            </div>
            <div class="team-info">
              <div class="team-name">{{ team.name }}</div>
              <div class="team-meta">{{ team.members.length }} member{{ team.members.length !== 1 ? 's' : '' }}</div>
            </div>
          </div>

          <p *ngIf="team.description" class="team-desc">{{ team.description }}</p>

          <div class="members-list">
            <div *ngFor="let m of team.members" class="member-row">
              <div class="member-ava">{{ memberInitials(m.fullName) }}</div>
              <div class="member-details">
                <span class="member-name">{{ m.fullName }}</span>
                <span class="member-email">{{ m.email }}</span>
              </div>
              <span class="role-badge role-{{ m.role }}">{{ roleLabel(m.role) }}</span>
              <button class="remove-btn" title="Remove member"
                      (click)="confirmRemoveMember(team, m.userId, m.fullName)">
                <span class="material-icons-round">person_remove</span>
              </button>
            </div>
            <p *ngIf="team.members.length === 0" class="no-members">No members yet</p>
          </div>

          <!-- Add member form -->
          <div *ngIf="addingToTeamId() === team.id" class="add-member-form">
            <form [formGroup]="memberForm" (ngSubmit)="submitAddMember(team.id)">
              <div class="form-row">
                <div class="field-group">
                  <label class="field-label">User</label>
                  <select class="field-select" formControlName="userId">
                    <option value="" disabled>Select user…</option>
                    <option *ngFor="let u of availableUsers(team)" [value]="u.id">
                      {{ u.fullName }} ({{ u.email }})
                    </option>
                  </select>
                </div>
                <div class="field-group">
                  <label class="field-label">Role</label>
                  <select class="field-select" formControlName="role">
                    <option *ngFor="let r of roleOptions" [value]="r.value">{{ r.label }}</option>
                  </select>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="cancelAddMember()">Cancel</button>
                <button type="submit" class="btn-primary sm" [disabled]="memberForm.invalid || addingMember()">
                  <span class="spinner-xs" *ngIf="addingMember()"></span>
                  <span *ngIf="!addingMember()">Add</span>
                </button>
              </div>
            </form>
          </div>

          <div class="card-footer" *ngIf="addingToTeamId() !== team.id">
            <button class="btn-ghost sm" (click)="openAddMember(team.id)"
                    [disabled]="availableUsers(team).length === 0">
              <span class="material-icons-round">person_add</span>
              {{ availableUsers(team).length === 0 ? 'All users added' : 'Add Member' }}
            </button>
          </div>
        </div>

        <p *ngIf="teams().length === 0" class="empty-text">No teams yet. Create your first team!</p>
      </div>
    </div>

    <!-- Create team dialog overlay -->
    <div *ngIf="showCreate()" class="overlay" (click)="showCreate.set(false)">
      <div class="dialog-card" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2 class="dialog-title">New Team</h2>
          <button class="close-btn" (click)="showCreate.set(false)">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="form" (ngSubmit)="createTeam()">
          <div class="field-group">
            <label class="field-label">Team Name</label>
            <input class="field-input" formControlName="name" placeholder="e.g. Frontend Team" />
          </div>
          <div class="field-group">
            <label class="field-label">Description</label>
            <textarea class="field-input" formControlName="description" rows="2"
                      placeholder="What does this team work on?"></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-ghost" (click)="showCreate.set(false)">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid">Create Team</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .loading-wrap { display: flex; justify-content: center; padding: 64px; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 3px solid var(--border); border-top-color: var(--violet);
      animation: spin 0.7s linear infinite;
    }
    .spinner-xs {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 64px; color: var(--rose);
    }
    .error-ico { font-size: 48px; opacity: 0.6; }

    .teams-page {
      padding: 28px 32px;
      display: flex; flex-direction: column; gap: 24px;
    }

    /* Topbar */
    .topbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
    .page-title { margin: 0 0 2px; font-size: 20px; font-weight: 700; color: var(--ink); }
    .page-sub   { margin: 0; font-size: 13px; color: var(--muted); }

    /* Buttons */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: var(--violet); color: #fff;
      border: none; border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background 0.15s, opacity 0.15s;
    }
    .btn-primary .material-icons-round { font-size: 16px; }
    .btn-primary:hover:not(:disabled) { background: var(--violet-2); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary.sm { padding: 7px 14px; }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 7px 14px; background: transparent;
      border: 1px solid var(--border); border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
      color: var(--muted); cursor: pointer; transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost .material-icons-round { font-size: 15px; }
    .btn-ghost:hover:not(:disabled) { border-color: var(--violet); color: var(--violet); }
    .btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-ghost.sm { padding: 5px 12px; font-size: 12px; }

    .btn-outline {
      padding: 8px 18px; background: transparent;
      border: 1px solid var(--rose); border-radius: var(--r-full);
      color: var(--rose); font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; cursor: pointer;
    }

    /* Teams grid */
    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
    }

    /* Team card */
    .team-card {
      background: var(--white);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 20px;
      display: flex; flex-direction: column; gap: 14px;
      box-shadow: var(--shadow-sm);
    }

    .card-header { display: flex; align-items: center; gap: 12px; }
    .team-ico-wrap {
      width: 36px; height: 36px; border-radius: var(--r-md);
      background: var(--violet-c); flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .team-ico { font-size: 18px; color: var(--violet); }
    .team-name { font-size: 14px; font-weight: 700; color: var(--ink); }
    .team-meta { font-size: 11px; color: var(--muted); margin-top: 1px; }

    .team-desc { margin: 0; font-size: 12px; color: var(--muted); }

    /* Members */
    .members-list { display: flex; flex-direction: column; gap: 6px; }
    .member-row {
      display: flex; align-items: center; gap: 8px;
      padding: 4px 0;
    }
    .member-ava {
      width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--violet), var(--teal));
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700;
    }
    .member-details { flex: 1; min-width: 0; }
    .member-name {
      font-size: 12px; font-weight: 600; color: var(--ink);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
    }
    .member-email {
      font-size: 11px; color: var(--soft);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;
    }

    .role-badge {
      font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--r-full);
      white-space: nowrap; flex-shrink: 0;
    }
    .role-0 { background: var(--surface);   color: var(--muted);    }
    .role-1 { background: var(--blue-c);    color: var(--blue);     }
    .role-2 { background: var(--emerald-c); color: var(--emerald);  }
    .role-3 { background: var(--amber-c);   color: var(--amber);    }

    .remove-btn {
      background: none; border: none; cursor: pointer; padding: 3px;
      color: var(--soft); display: flex; align-items: center;
      border-radius: var(--r-sm); opacity: 0;
      transition: opacity 0.12s, color 0.12s, background 0.12s;
    }
    .remove-btn .material-icons-round { font-size: 15px; }
    .member-row:hover .remove-btn { opacity: 1; }
    .remove-btn:hover { color: var(--rose); background: var(--rose-c); }

    .no-members { margin: 0; font-size: 12px; color: var(--soft); }

    /* Add member form */
    .add-member-form {
      padding-top: 12px; border-top: 1px solid var(--border);
    }
    .form-row { display: flex; gap: 10px; margin-bottom: 10px; }
    .field-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
    .field-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; }
    .field-input, .field-select {
      width: 100%; padding: 8px 10px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r-md); color: var(--ink);
      font-family: 'DM Sans', sans-serif; font-size: 13px;
      outline: none; transition: border-color 0.15s; box-sizing: border-box;
    }
    .field-input:focus, .field-select:focus { border-color: var(--violet); }
    textarea.field-input { resize: vertical; }

    .form-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .card-footer { border-top: 1px solid var(--border); padding-top: 12px; }

    .empty-text { color: var(--soft); text-align: center; padding: 40px; grid-column: 1 / -1; font-size: 13px; }

    /* Dialog overlay */
    .overlay {
      position: fixed; inset: 0; background: rgba(15,15,20,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .dialog-card {
      width: 100%; max-width: 460px;
      background: var(--white);
      border-radius: var(--r-xl);
      padding: 28px;
      box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column; gap: 16px;
    }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; }
    .dialog-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink); }
    .close-btn {
      background: none; border: none; cursor: pointer; padding: 4px;
      color: var(--soft); display: flex; border-radius: var(--r-sm);
      transition: color 0.12s;
    }
    .close-btn:hover { color: var(--ink); }
    .close-btn .material-icons-round { font-size: 20px; }
  `],
})
export class TeamListComponent implements OnInit {
  private teamService = inject(TeamService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  teams = signal<Team[]>([]);
  users = signal<User[]>([]);
  loading = signal(true);
  error = signal(false);
  showCreate = signal(false);
  addingToTeamId = signal<string | null>(null);
  addingMember = signal(false);

  form = this.fb.group({ name: ['', Validators.required], description: [''] });
  memberForm = this.fb.group({
    userId: ['', Validators.required],
    role: [TeamRole.Member, Validators.required],
  });

  readonly roleOptions = [
    { value: TeamRole.Viewer,  label: TEAM_ROLE_LABELS[TeamRole.Viewer] },
    { value: TeamRole.Member,  label: TEAM_ROLE_LABELS[TeamRole.Member] },
    { value: TeamRole.Admin,   label: TEAM_ROLE_LABELS[TeamRole.Admin] },
    { value: TeamRole.Owner,   label: TEAM_ROLE_LABELS[TeamRole.Owner] },
  ];

  ngOnInit() {
    this.teamService.getMyTeams().subscribe({
      next: (t) => { this.teams.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); this.toast('Failed to load teams', true); },
    });
    this.userService.getAll().subscribe({
      next: (u) => this.users.set(u),
      error: (err) => console.error('Failed to load users', err),
    });
  }

  availableUsers(team: Team): User[] {
    const memberIds = new Set(team.members.map(m => m.userId));
    return this.users().filter(u => !memberIds.has(u.id));
  }

  openCreateTeam() { this.form.reset(); this.showCreate.set(true); }

  createTeam() {
    if (this.form.invalid) return;
    this.teamService.create(this.form.value as any).subscribe({
      next: (t) => { this.teams.update(prev => [...prev, t]); this.showCreate.set(false); this.form.reset(); this.toast('Team created'); },
      error: () => this.toast('Failed to create team', true),
    });
  }

  openAddMember(teamId: string) {
    this.memberForm.reset({ role: TeamRole.Member });
    this.addingToTeamId.set(teamId);
  }

  cancelAddMember() { this.addingToTeamId.set(null); this.memberForm.reset(); }

  submitAddMember(teamId: string) {
    if (this.memberForm.invalid) return;
    const { userId, role } = this.memberForm.value;
    this.addingMember.set(true);
    this.teamService.addMember(teamId, userId!, role!).subscribe({
      next: (updatedTeam) => {
        this.teams.update(all => all.map(t => t.id === teamId ? updatedTeam : t));
        this.cancelAddMember();
        this.addingMember.set(false);
        this.toast('Member added');
      },
      error: (err) => {
        this.addingMember.set(false);
        this.toast(err?.error?.error ?? 'Failed to add member', true);
      },
    });
  }

  confirmRemoveMember(team: Team, userId: string, name: string) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Remove Member', message: `Remove ${name} from ${team.name}?`, confirmLabel: 'Remove', danger: true },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.teamService.removeMember(team.id, userId).subscribe({
        next: updatedTeam => { this.teams.update(all => all.map(t => t.id === team.id ? updatedTeam : t)); this.toast(`${name} removed`); },
        error: () => this.toast('Failed to remove member', true),
      });
    });
  }

  memberInitials(name: string): string {
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  roleLabel(role: number): string { return TEAM_ROLE_LABELS[role as keyof typeof TEAM_ROLE_LABELS] ?? ''; }

  private toast(message: string, isError = false) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000,
      panelClass: isError ? ['snack-error'] : ['snack-success'],
      horizontalPosition: 'right', verticalPosition: 'bottom',
    });
  }
}
