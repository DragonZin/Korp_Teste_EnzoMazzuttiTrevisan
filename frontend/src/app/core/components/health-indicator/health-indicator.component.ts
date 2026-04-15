import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  HealthLevel,
  HealthStatusService,
  HealthStatusSnapshot,
} from '../../api/health-status.service';

@Component({
  selector: 'app-health-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './health-indicator.component.html',
  styleUrl: './health-indicator.component.scss',
})
export class HealthIndicatorComponent {
  private readonly healthStatusService = inject(HealthStatusService);
  private closePanelTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly isPanelOpen = signal(false);
  readonly isLoading = signal(false);
  readonly snapshot = signal<HealthStatusSnapshot | null>(null);

  readonly overallStatus = computed<HealthLevel>(() => this.snapshot()?.overall ?? 'down');

  readonly lastUpdatedLabel = computed(() => {
    const current = this.snapshot();

    if (!current) {
      return 'Sem atualização';
    }

    return new Date(current.lastUpdated).toLocaleString('pt-BR');
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.isLoading.set(true);

    this.healthStatusService
      .getHealthStatus()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe((status) => {
        this.snapshot.set(status);
      });
  }

  openPanel(): void {
    this.clearClosePanelTimeout();
    this.isPanelOpen.set(true);
  }

  closePanel(): void {
    this.closePanelTimeoutId = setTimeout(() => {
      this.isPanelOpen.set(false);
      this.closePanelTimeoutId = null;
    }, 180);
  }

  handleFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as Node | null;

    if (!nextTarget) {
      this.closePanel();
      return;
    }

    const currentTarget = event.currentTarget as HTMLElement | null;

    if (!currentTarget?.contains(nextTarget)) {
      this.closePanel();
    }
  }

  statusLabel(status: HealthLevel): string {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'degraded':
        return 'Degradado';
      default:
        return 'Indisponível';
    }
  }

  statusClass(status: HealthLevel): string {
    return `health-dot--${status}`;
  }

  private clearClosePanelTimeout(): void {
    if (this.closePanelTimeoutId) {
      clearTimeout(this.closePanelTimeoutId);
      this.closePanelTimeoutId = null;
    }
  }
}