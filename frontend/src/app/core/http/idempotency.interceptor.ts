import {
  HttpContext,
  HttpContextToken,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from '@angular/common/http';

const IDEMPOTENCY_KEY_CONTEXT = new HttpContextToken<string | null>(() => null);

export function withIdempotencyKey(idempotencyKey?: string): HttpContext {
  return new HttpContext().set(IDEMPOTENCY_KEY_CONTEXT, idempotencyKey ?? crypto.randomUUID());
}

export const idempotencyInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const idempotencyKey = request.context.get(IDEMPOTENCY_KEY_CONTEXT);

  if (!idempotencyKey || request.headers.has('Idempotency-Key')) {
    return next(request);
  }

  return next(
    request.clone({
      headers: request.headers.set('Idempotency-Key', idempotencyKey)
    })
  );
};