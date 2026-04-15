import { AbstractControl, ValidationErrors } from '@angular/forms';

export type ValidationMessage = string | ((error: unknown) => string);
export type ValidationMessageMap = Record<string, ValidationMessage>;
export type FieldValidationMessages<TField extends string> = Partial<Record<TField, ValidationMessageMap>>;

const DEFAULT_ERROR_PRIORITY = [
  'required',
  'trimRequired',
  'email',
  'minlength',
  'maxlength',
  'min',
  'max',
  'pattern',
] as const;

export const DEFAULT_VALIDATION_MESSAGES: ValidationMessageMap = {
  required: 'Este campo é obrigatório.',
  trimRequired: 'Este campo é obrigatório.',
  email: 'Informe um e-mail válido.',
  minlength: (error) => `Valor deve ter no mínimo ${getErrorMetric(error, 'requiredLength')} caracteres.`,
  maxlength: (error) => `Valor deve ter no máximo ${getErrorMetric(error, 'requiredLength')} caracteres.`,
  min: (error) => `Valor deve ser maior ou igual a ${getErrorMetric(error, 'min')}.`,
  max: (error) => `Valor deve ser menor ou igual a ${getErrorMetric(error, 'max')}.`,
  pattern: 'Valor inválido.',
};

export function hasControlError(control: AbstractControl | null | undefined, apiError?: string | null): boolean {
  if (apiError) {
    return true;
  }

  if (!control) {
    return false;
  }

  return !!((control.touched || control.dirty) && control.invalid);
}

export function getFirstControlErrorMessage<TField extends string>(params: {
  control: AbstractControl | null | undefined;
  field: TField;
  apiError?: string | null;
  fieldMessages?: FieldValidationMessages<TField>;
  defaultMessages?: ValidationMessageMap;
  priority?: readonly string[];
  fallbackMessage?: string;
}): string {
  const {
    apiError,
    control,
    field,
    fieldMessages,
    defaultMessages = DEFAULT_VALIDATION_MESSAGES,
    priority = DEFAULT_ERROR_PRIORITY,
    fallbackMessage = 'Valor inválido.',
  } = params;

  if (apiError) {
    return apiError;
  }

  const errors = control?.errors;

  if (!errors) {
    return fallbackMessage;
  }

  const messagesForField = fieldMessages?.[field] ?? {};

  for (const errorKey of priority) {
    if (errors[errorKey] == null) {
      continue;
    }

    const message = resolveValidationMessage(messagesForField[errorKey] ?? defaultMessages[errorKey], errors[errorKey]);

    if (message) {
      return message;
    }
  }

  for (const errorKey of Object.keys(errors)) {
    const message = resolveValidationMessage(messagesForField[errorKey] ?? defaultMessages[errorKey], errors[errorKey]);

    if (message) {
      return message;
    }
  }

  return fallbackMessage;
}

function resolveValidationMessage(message: ValidationMessage | undefined, error: unknown): string | null {
  if (!message) {
    return null;
  }

  return typeof message === 'function' ? message(error) : message;
}

function getErrorMetric(error: unknown, key: string): string {
  if (!isValidationErrorObject(error)) {
    return '0';
  }

  const value = error[key];
  return typeof value === 'number' || typeof value === 'string' ? String(value) : '0';
}

function isValidationErrorObject(error: unknown): error is ValidationErrors {
  return typeof error === 'object' && error !== null;
}