import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'pm-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <div class="dialog">
      <div class="dialog-header">
        <div class="dialog-icon" [class.danger]="data.danger" [class.info]="!data.danger">
          <span class="material-icons-round">{{ data.danger ? 'warning' : 'help_outline' }}</span>
        </div>
        <h2 class="dialog-title">{{ data.title }}</h2>
      </div>
      <p class="dialog-message">{{ data.message }}</p>
      <div class="dialog-actions">
        <button class="btn-ghost" mat-dialog-close>Cancel</button>
        <button class="btn-confirm" [class.btn-danger]="data.danger" (click)="confirm()">
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog {
      padding: 24px;
      min-width: 320px; max-width: 420px;
    }

    .dialog-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    }

    .dialog-icon {
      width: 36px; height: 36px; border-radius: var(--r-md);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .dialog-icon.danger {
      background: var(--rose-c);
      color: var(--rose);
    }
    .dialog-icon.info {
      background: var(--violet-c);
      color: var(--violet);
    }
    .dialog-icon .material-icons-round { font-size: 20px; }

    .dialog-title {
      margin: 0; font-size: 15px; font-weight: 700; color: var(--ink);
    }

    .dialog-message {
      margin: 0 0 24px;
      font-size: 13px; color: var(--muted); line-height: 1.5;
    }

    .dialog-actions {
      display: flex; justify-content: flex-end; gap: 8px;
    }

    .btn-ghost {
      padding: 8px 18px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 600; color: var(--muted);
      cursor: pointer; transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost:hover { border-color: var(--ink-4); color: var(--ink); }

    .btn-confirm {
      padding: 8px 18px;
      background: var(--violet); color: #fff;
      border: none; border-radius: var(--r-full);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 700;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-confirm:hover { background: var(--violet-2); }
    .btn-confirm.btn-danger { background: var(--rose); }
    .btn-confirm.btn-danger:hover { background: #e02049; }
  `],
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  confirm() { this.dialogRef.close(true); }
}
