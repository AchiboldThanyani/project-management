import { Component, Input } from '@angular/core';

@Component({ selector: 'pm-vault-tab', standalone: true, template: '' })
export class VaultTabComponent {
  @Input({ required: true }) projectId!: string;
}
