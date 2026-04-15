import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

import { API_CONFIG } from './api.config';

export type HealthLevel = 'ok' | 'degraded' | 'down';

export interface HealthStatusSnapshot {
  productsApi: HealthLevel;
  productsDb: HealthLevel;
  invoicesApi: HealthLevel;
  invoicesDb: HealthLevel;
  overall: HealthLevel;
  lastUpdated: string;
}

interface HealthEndpointPayload {
  status?: string;
  databaseOnline?: boolean;
  timestamp?: string;
}

interface EndpointHealthResult {
  api: HealthLevel;
  db: HealthLevel;
  timestamp?: string;
}

@Injectable({ providedIn: 'root' })
export class HealthStatusService {
  private readonly http = inject(HttpClient);

  getHealthStatus(): Observable<HealthStatusSnapshot> {
    return forkJoin({
      products: this.checkEndpoint('/products/health'),
      invoices: this.checkEndpoint('/invoices/health'),
    }).pipe(
      map(({ products, invoices }) => {
        const statuses = [products.api, products.db, invoices.api, invoices.db];

        return {
          productsApi: products.api,
          productsDb: products.db,
          invoicesApi: invoices.api,
          invoicesDb: invoices.db,
          overall: this.getWorstStatus(statuses),
          lastUpdated: this.getMostRecentTimestamp(products.timestamp, invoices.timestamp),
        };
      }),
    );
  }

  private checkEndpoint(path: string): Observable<EndpointHealthResult> {
    return this.http
      .get<HealthEndpointPayload>(`${API_CONFIG.baseUrl}${path}`, {
        observe: 'response',
      })
      .pipe(
        map((response) => this.normalizeResponse(response)),
        catchError((error: HttpErrorResponse) => of(this.normalizeError(error))),
      );
  }

  private normalizeResponse(response: HttpResponse<HealthEndpointPayload>): EndpointHealthResult {
    if (response.status === 200) {
      return {
        api: 'ok',
        db: this.isDatabaseHealthy(response.body) ? 'ok' : 'degraded',
        timestamp: response.body?.timestamp,
      };
    }

    if (response.status === 503) {
      return {
        api: 'ok',
        db: 'down',
        timestamp: response.body?.timestamp,
      };
    }

    return {
      api: 'down',
      db: 'down',
      timestamp: response.body?.timestamp,
    };
  }

  private normalizeError(error: HttpErrorResponse): EndpointHealthResult {
    if (error.status === 503) {
      const payload = this.tryGetPayload(error.error);

      return {
        api: 'ok',
        db: 'down',
        timestamp: payload?.timestamp,
      };
    }

    if (error.status === 200) {
      const payload = this.tryGetPayload(error.error);

      return {
        api: 'ok',
        db: this.isDatabaseHealthy(payload) ? 'ok' : 'degraded',
        timestamp: payload?.timestamp,
      };
    }

    return {
      api: 'down',
      db: 'down',
      timestamp: this.tryGetPayload(error.error)?.timestamp,
    };
  }

  private tryGetPayload(value: unknown): HealthEndpointPayload | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    return value as HealthEndpointPayload;
  }

  private isDatabaseHealthy(payload: HealthEndpointPayload | null): boolean {
    if (!payload) {
      return false;
    }

    if (typeof payload.databaseOnline === 'boolean') {
      return payload.databaseOnline;
    }

    return payload.status === 'ok';
  }

  private getMostRecentTimestamp(...timestamps: Array<string | undefined>): string {
    const validDates = timestamps
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (validDates.length === 0) {
      return new Date().toISOString();
    }

    validDates.sort((a, b) => b.getTime() - a.getTime());
    return validDates[0].toISOString();
  }

  private getWorstStatus(statuses: HealthLevel[]): HealthLevel {
    if (statuses.includes('down')) {
      return 'down';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'ok';
  }
}