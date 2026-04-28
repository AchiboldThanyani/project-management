import { Component, Input, Output, EventEmitter } from '@angular/core';
import { VaultDocumentDetail } from '@pm/shared/models';

@Component({ selector: 'pm-vault-document-editor', standalone: true, template: '' })
export class VaultDocumentEditorComponent {
  @Input({ required: true }) document!: VaultDocumentDetail;
  @Input() readonly = false;
  @Output() save = new EventEmitter<{ title: string; contentJson: string }>();
}
