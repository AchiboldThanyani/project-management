import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProjectService } from '@pm/projects/data-access';
import { Project, PROJECT_STATUS_LABELS, ProjectStatus } from '@pm/shared/models';
import { ConfirmDialogComponent } from '@pm/shared/util';

@Component({
  selector: 'pm-project-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="page-wrap">

      <!-- Topbar -->
      <div class="topbar">
        <div class="topbar-title">Projects</div>
        <div class="topbar-right">
          <div class="search-bar">
            <span class="material-icons-round">search</span>
            <span>Search projects…</span>
          </div>
          <button class="add-btn" (click)="openCreate()">
            <span class="material-icons-round">add</span> New Project
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="content">

        <div *ngIf="loading()" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div class="projects-grid" *ngIf="!loading()">

          <div class="pj-card" *ngFor="let p of projects()">
            <div class="pj-top" [class]="accentClass(p.id)"></div>
            <div class="pj-body">
              <div class="pj-head">
                <div class="pj-name" [routerLink]="['/projects', p.id]">{{ p.name }}</div>
                <div class="more-menu">
                  <button class="more-btn" (click)="menuOpen = menuOpen === p.id ? null : p.id; $event.stopPropagation()">
                    <span class="material-icons-round">more_vert</span>
                  </button>
                  <div class="dropdown" *ngIf="menuOpen === p.id">
                    <div class="dd-item" (click)="openEdit(p); menuOpen=null">
                      <span class="material-icons-round">edit</span> Edit
                    </div>
                    <div class="dd-item danger" (click)="confirmDelete(p); menuOpen=null">
                      <span class="material-icons-round">delete</span> Delete
                    </div>
                  </div>
                </div>
              </div>
              <div class="pj-desc" [routerLink]="['/projects', p.id]">{{ p.description || 'No description' }}</div>
              <div class="pj-footer">
                <span class="ph-badge" [class]="statusClass(p.status)">{{ statusLabel(p.status) }}</span>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div class="empty-state" *ngIf="projects().length === 0">
            <span class="material-icons-round">folder_open</span>
            <p>No projects yet</p>
            <button class="add-btn" (click)="openCreate()">
              <span class="material-icons-round">add</span> Create your first project
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Backdrop for menu -->
    <div class="menu-backdrop" *ngIf="menuOpen" (click)="menuOpen=null"></div>

    <!-- Create / Edit Dialog -->
    <div class="dialog-overlay" *ngIf="showForm()" (click)="closeForm()">
      <div class="dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="dialog-title">{{ editingProject() ? 'Edit Project' : 'New Project' }}</div>
          <button class="close-btn" (click)="closeForm()">
            <span class="material-icons-round">close</span>
          </button>
        </div>
        <form [formGroup]="form" (ngSubmit)="submitForm()">
          <div class="field">
            <label>Project Name</label>
            <input formControlName="name" placeholder="e.g. Mobile App Redesign" />
            <span class="field-error" *ngIf="form.get('name')?.invalid && form.get('name')?.touched">Name is required</span>
          </div>
          <div class="field">
            <label>Description <span class="optional">optional</span></label>
            <textarea formControlName="description" rows="3" placeholder="What is this project about?"></textarea>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn-ghost" (click)="closeForm()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
              <div class="spinner-sm" *ngIf="saving()"></div>
              <span *ngIf="!saving()">{{ editingProject() ? 'Save changes' : 'Create project' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    /* Topbar */
    .topbar {
      background: var(--white); border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; gap: 12px;
    }
    .topbar-title { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
    .topbar-right { display: flex; align-items: center; gap: 8px; }
    .search-bar { display: flex; align-items: center; gap: 7px; padding: 7px 13px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-full); width: 220px; }
    .search-bar .material-icons-round { font-size: 15px; color: var(--soft); }
    .search-bar span { font-size: 12px; color: var(--soft); }
    .add-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--r-full);
      background: var(--violet); color: #fff; border: none;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; box-shadow: 0 2px 8px rgba(102,68,221,0.3);
      transition: background 0.15s, transform 0.1s;
    }
    .add-btn:hover { background: var(--violet-2); transform: translateY(-1px); }
    .add-btn .material-icons-round { font-size: 16px; }

    /* Content */
    .content { flex: 1; overflow-y: auto; padding: 22px 24px; }

    /* Loading */
    .loading-state { display: flex; justify-content: center; padding: 64px 0; }
    .spinner { width: 28px; height: 28px; border: 2px solid var(--border); border-top-color: var(--violet); border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Grid */
    .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }

    .pj-card {
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); overflow: hidden;
      transition: box-shadow 0.15s, transform 0.15s;
    }
    .pj-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }

    .pj-top { height: 5px; }
    .pj-top.accent-0 { background: linear-gradient(90deg, #6644dd, #7c5ce8); }
    .pj-top.accent-1 { background: linear-gradient(90deg, #00b8a0, #00d4b8); }
    .pj-top.accent-2 { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .pj-top.accent-3 { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .pj-top.accent-4 { background: linear-gradient(90deg, #10b981, #34d399); }
    .pj-top.accent-5 { background: linear-gradient(90deg, #f43f5e, #fb7185); }

    .pj-body { padding: 16px; }
    .pj-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; position: relative; }
    .pj-name { font-size: 15px; font-weight: 700; letter-spacing: -0.2px; cursor: pointer; flex: 1; }
    .pj-name:hover { color: var(--violet); }
    .pj-desc { font-size: 12px; color: var(--muted); margin-bottom: 14px; line-height: 1.5; cursor: pointer; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .pj-footer { display: flex; align-items: center; }

    /* More menu */
    .more-menu { position: relative; }
    .more-btn { background: none; border: none; cursor: pointer; color: var(--soft); display: flex; padding: 2px; border-radius: 4px; }
    .more-btn:hover { color: var(--muted); background: var(--surface); }
    .more-btn .material-icons-round { font-size: 18px; }
    .dropdown {
      position: absolute; right: 0; top: 100%; margin-top: 4px;
      background: var(--white); border: 1px solid var(--border);
      border-radius: var(--r-lg); box-shadow: var(--shadow-md);
      min-width: 140px; z-index: 100; overflow: hidden;
    }
    .dd-item { display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: pointer; font-size: 13px; color: var(--ink); transition: background 0.12s; }
    .dd-item:hover { background: var(--surface); }
    .dd-item .material-icons-round { font-size: 15px; color: var(--muted); }
    .dd-item.danger { color: var(--rose); }
    .dd-item.danger .material-icons-round { color: var(--rose); }
    .menu-backdrop { position: fixed; inset: 0; z-index: 90; }

    /* Empty */
    .empty-state { grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 64px 0; color: var(--soft); }
    .empty-state .material-icons-round { font-size: 56px; opacity: 0.4; }
    .empty-state p { font-size: 14px; margin: 0; }

    /* Dialog */
    .dialog-overlay { position: fixed; inset: 0; background: rgba(15,15,20,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
    .dialog { background: var(--white); border-radius: var(--r-xl); width: 480px; max-width: 95vw; box-shadow: var(--shadow-lg); }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; margin-bottom: 16px; }
    .dialog-title { font-size: 16px; font-weight: 700; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--muted); display: flex; padding: 4px; border-radius: var(--r-sm); }
    .close-btn:hover { background: var(--surface); }
    .close-btn .material-icons-round { font-size: 20px; }

    form { padding: 0 24px 24px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 12px; font-weight: 600; color: var(--ink-4); margin-bottom: 6px; }
    .field .optional { font-weight: 400; color: var(--soft); margin-left: 4px; }
    .field input, .field textarea {
      width: 100%; padding: 9px 12px;
      background: var(--surface); border: 1.5px solid var(--border);
      border-radius: var(--r-md); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--ink);
      outline: none; transition: border-color 0.15s;
      resize: none;
    }
    .field input:focus, .field textarea:focus { border-color: var(--violet); background: var(--white); }
    .field-error { font-size: 11px; color: var(--rose); margin-top: 4px; display: block; }

    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
    .btn-ghost { padding: 8px 16px; border-radius: var(--r-full); border: 1px solid var(--border); background: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: var(--muted); cursor: pointer; }
    .btn-ghost:hover { background: var(--surface); }
    .btn-primary { padding: 8px 20px; border-radius: var(--r-full); border: none; background: var(--violet); color: #fff; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(102,68,221,0.3); }
    .btn-primary:hover:not(:disabled) { background: var(--violet-2); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner-sm { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
  `],
})
export class ProjectListComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  projects = signal<Project[]>([]);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  editingProject = signal<Project | null>(null);
  menuOpen: string | null = null;

  private readonly ACCENT_COUNT = 6;
  private readonly STATUS_CLASSES = ['planning', 'active', 'on-hold', 'completed', 'archived'];
  private readonly STATUS_LABELS = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'];

  form = this.fb.group({ name: ['', Validators.required], description: [''] });

  ngOnInit() {
    this.projectService.getAll().subscribe({
      next: (p) => { this.projects.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  accentClass(id: string): string {
    return `accent-${id.charCodeAt(0) % this.ACCENT_COUNT}`;
  }

  statusClass(status: number): string { return this.STATUS_CLASSES[status] ?? 'planning'; }
  statusLabel(status: number): string { return this.STATUS_LABELS[status] ?? 'Planning'; }

  openCreate() { this.editingProject.set(null); this.form.reset(); this.showForm.set(true); }
  openEdit(p: Project) { this.editingProject.set(p); this.form.patchValue({ name: p.name, description: p.description ?? '' }); this.showForm.set(true); }
  closeForm() { this.showForm.set(false); this.editingProject.set(null); }

  submitForm() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const editing = this.editingProject();
    if (editing) {
      this.projectService.update(editing.id, { name: this.form.value.name!, description: this.form.value.description ?? undefined, status: editing.status } as any).subscribe({
        next: (updated) => { this.projects.update(all => all.map(p => p.id === updated.id ? updated : p)); this.closeForm(); this.saving.set(false); this.toast('Project updated'); },
        error: () => { this.saving.set(false); this.toast('Failed to update project', true); },
      });
    } else {
      this.projectService.create(this.form.value as any).subscribe({
        next: (p) => { this.projects.update(prev => [p, ...prev]); this.closeForm(); this.saving.set(false); this.toast('Project created'); },
        error: (err) => { this.saving.set(false); this.toast(err?.error?.errors?.Name?.[0] ?? 'Failed to create project', true); },
      });
    }
  }

  confirmDelete(p: Project) {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Project', message: `Delete "${p.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.projectService.delete(p.id).subscribe({
        next: () => { this.projects.update(all => all.filter(x => x.id !== p.id)); this.toast('Project deleted'); },
        error: () => this.toast('Failed to delete project', true),
      });
    });
  }

  private toast(message: string, isError = false) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 3000, panelClass: isError ? ['snack-error'] : ['snack-success'],
      horizontalPosition: 'right', verticalPosition: 'bottom',
    });
  }
}
