import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CreateProductRequest } from '../models/create-product-request.model';
import { Product } from '../models/product.model';
import { UpdateProductRequest } from '../models/update-product-request.model';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="mb-3">
        <label for="product-code" class="form-label">Código</label>
        <input
          id="product-code"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('code')"
          formControlName="code"
          maxlength="50"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('code')">
          {{ getControlErrorMessage('code') }}
        </div>
      </div>

      <div class="mb-3">
        <label for="product-name" class="form-label">Nome</label>
        <input
          id="product-name"
          type="text"
          class="form-control"
          [class.is-invalid]="hasControlError('name')"
          formControlName="name"
          maxlength="255"
        />
        <div class="invalid-feedback" *ngIf="hasControlError('name')">
          {{ getControlErrorMessage('name') }}
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="product-stock" class="form-label">Estoque</label>
          <input
            id="product-stock"
            type="number"
            class="form-control"
            [class.is-invalid]="hasControlError('stock')"
            formControlName="stock"
            min="0"
            step="1"
          />
          <div class="invalid-feedback" *ngIf="hasControlError('stock')">
            {{ getControlErrorMessage('stock') }}
          </div>
        </div>

        <div class="col-sm-6">
          <label for="product-price" class="form-label">Preço</label>
          <input
            id="product-price"
            type="number"
            class="form-control"
            [class.is-invalid]="hasControlError('price')"
            formControlName="price"
            min="0"
            step="0.01"
          />
          <div class="invalid-feedback" *ngIf="hasControlError('price')">
            {{ getControlErrorMessage('price') }}
          </div>
        </div>
      </div>

      <div *ngIf="apiErrorMessage()" class="alert alert-danger py-2" role="alert">
        {{ apiErrorMessage() }}
      </div>

      <div class="d-flex justify-content-end gap-2 mt-4">
        <button
          type="button"
          class="btn btn-outline-secondary"
          (click)="cancelled.emit()"
          [disabled]="isSubmitting()"
        >
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary" [disabled]="isSubmitting()">
          {{ submitLabel() }}
        </button>
      </div>
    </form>
  `,
})
export class ProductFormComponent {
  private readonly fb = new FormBuilder();

  readonly product = input<Product | null>(null);
  readonly isSubmitting = input(false);
  readonly apiErrorMessage = input<string | null>(null);
  readonly apiFieldErrors = input<Partial<Record<keyof CreateProductRequest, string>>>({});

  readonly submitted = output<CreateProductRequest | UpdateProductRequest>();
  readonly cancelled = output<void>();

  readonly submitLabel = computed(() => (this.product() ? 'Salvar alterações' : 'Criar produto'));

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    effect(() => {
      const product = this.product();

      this.form.reset({
        code: product?.code ?? '',
        name: product?.name ?? '',
        stock: product?.stock ?? 0,
        price: product?.price ?? 0,
      });
    });
  }

  hasControlError(controlName: keyof CreateProductRequest): boolean {
    const control = this.form.controls[controlName];

    return !!((control.touched || control.dirty) && control.invalid) || !!this.apiFieldErrors()[controlName];
  }

  getControlErrorMessage(controlName: keyof CreateProductRequest): string {
    const control = this.form.controls[controlName];
    const apiError = this.apiFieldErrors()[controlName];

    if (apiError) {
      return apiError;
    }

    if (control.hasError('required')) {
      return 'Este campo é obrigatório.';
    }

    if (controlName === 'code' && control.hasError('maxlength')) {
      return 'Código deve ter no máximo 50 caracteres.';
    }

    if (controlName === 'name' && control.hasError('maxlength')) {
      return 'Nome deve ter no máximo 255 caracteres.';
    }

    if (controlName === 'stock' && control.hasError('pattern')) {
      return 'Estoque deve ser um número inteiro.';
    }

    if (control.hasError('min')) {
      return 'Valor não pode ser negativo.';
    }

    return 'Valor inválido.';
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const payload: CreateProductRequest = {
      code: this.form.controls.code.value.trim(),
      name: this.form.controls.name.value.trim(),
      stock: Number(this.form.controls.stock.value),
      price: Number(this.form.controls.price.value),
    };

    this.submitted.emit(payload);
  }
}