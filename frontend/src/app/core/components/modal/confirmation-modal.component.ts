import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BaseModalComponent } from './base-modal.component';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, BaseModalComponent],
  templateUrl: './confirmation-modal.component.html',
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirmar ação';
  @Input() subtitle = '';
  @Input() message = '';
  @Input() emphasisText = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() processingLabel = 'Processando...';
  @Input() isProcessing = false;

  @Output() readonly confirmed = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  onCancel(): void {
    if (this.isProcessing) {
      return;
    }

    this.cancelled.emit();
  }

  onConfirm(): void {
    if (this.isProcessing) {
      return;
    }

    this.confirmed.emit();
  }
}