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

  readonly isPanelOpen = signal(false);
  readonly isLoading = signal(false);
  readonly snapshot = signal<HealthStatusSnapshot | null>(null);

  readonly overallStatus = computed<HealthLevel>(() => this.snapshot()?.overall ?? 'down');

  readonly productDomainStatus = computed<HealthLevel>(() => {
    const current = this.snapshot();

    if (!current) {
      return 'down';
    }

    return this.aggregateDomainStatus(current.productsApi, current.productsDb);
  });

  readonly invoiceDomainStatus = computed<HealthLevel>(() => {
    const current = this.snapshot();

    if (!current) {
      return 'down';
    }

    return this.aggregateDomainStatus(current.invoicesApi, current.invoicesDb);
  });

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
    this.isPanelOpen.set(true);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
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

  private aggregateDomainStatus(apiStatus: HealthLevel, dbStatus: HealthLevel): HealthLevel {
    if (apiStatus === 'down' && dbStatus === 'down') {
      return 'down';
    }

    if (apiStatus === 'ok' && dbStatus === 'ok') {
      return 'ok';
    }

    return 'degraded';
  }
}