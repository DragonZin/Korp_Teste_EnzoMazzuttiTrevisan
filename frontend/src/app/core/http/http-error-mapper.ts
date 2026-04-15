import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetails } from '../models/problem-details.model';

export type ErrorDomain = 'products' | 'invoices' | 'invoice-detail' | 'invoice-print';
export type ErrorOperation = 'load' | 'create';

interface HttpErrorMessageOptions {
  domain: ErrorDomain;
  operation?: ErrorOperation;
}

const CONNECTION_ERROR_MESSAGES: Record<ErrorDomain, string> = {
  products: 'Não foi possível conectar com a API de produtos. Verifique se os serviços estão em execução.',
  invoices: 'Não foi possível conectar com a API de notas fiscais. Verifique se os serviços estão em execução.',
  'invoice-detail': 'Não foi possível conectar com a API de notas fiscais. Verifique se os serviços estão em execução.',
  'invoice-print': 'Não foi possível conectar com a API de notas fiscais. Verifique se os serviços estão em execução.'
};

const NOT_FOUND_ERROR_MESSAGES: Partial<Record<ErrorDomain, string>> = {
  'invoice-detail': 'Nota fiscal não encontrada.',
  'invoice-print': 'Nota fiscal não encontrada.'
};

const DEFAULT_ERROR_MESSAGES: Record<ErrorDomain, Record<ErrorOperation, string>> = {
  products: {
    load: 'Não foi possível carregar os produtos no momento. Tente novamente em instantes.',
    create: 'Não foi possível salvar o produto no momento. Tente novamente em instantes.'
  },
  invoices: {
    load: 'Não foi possível carregar as notas fiscais no momento. Tente novamente em instantes.',
    create: 'Não foi possível criar a nota fiscal no momento. Tente novamente em instantes.'
  },
  'invoice-detail': {
    load: 'Não foi possível carregar a nota fiscal no momento. Tente novamente em instantes.',
    create: 'Não foi possível carregar a nota fiscal no momento. Tente novamente em instantes.'
  },
  'invoice-print': {
    load: 'Não foi possível carregar a nota fiscal no momento. Tente novamente em instantes.',
    create: 'Não foi possível carregar a nota fiscal no momento. Tente novamente em instantes.'
  }
};

export function extractProblemDetailsMessage(error: HttpErrorResponse): string | null {
  const problemDetails = error.error as Partial<ProblemDetails> | null;

  const detail = typeof problemDetails?.detail === 'string' ? problemDetails.detail.trim() : '';
  if (detail) {
    return detail;
  }

  const title = typeof problemDetails?.title === 'string' ? problemDetails.title.trim() : '';
  if (title) {
    return title;
  }

  return null;
}

export function mapHttpErrorMessage(error: HttpErrorResponse, options: HttpErrorMessageOptions): string {
  const operation = options.operation ?? 'load';

  if (error.status === 0) {
    return CONNECTION_ERROR_MESSAGES[options.domain];
  }

  if (error.status === 404 && NOT_FOUND_ERROR_MESSAGES[options.domain]) {
    return NOT_FOUND_ERROR_MESSAGES[options.domain] as string;
  }

  return extractProblemDetailsMessage(error) ?? DEFAULT_ERROR_MESSAGES[options.domain][operation];
}