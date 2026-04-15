import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-inline-flex align-items-center gap-2 quantity-stepper">
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm qty-button"
        (click)="onDecrement()"
        [disabled]="disabled || numericValue <= min"
        [attr.aria-label]="decrementAriaLabel"
      >
        -
      </button>
      <input
        type="number"
        class="form-control form-control-sm quantity-input"
        [value]="displayValue"
        [attr.min]="min"
        [disabled]="disabled"
        [attr.aria-label]="inputAriaLabel"
        (input)="onInput(($any($event.target)).value)"
        (blur)="onCommit()"
        (keydown.enter)="onCommit()"
        (keydown.arrowup)="onIncrement()"
        (keydown.arrowdown)="onDecrement()"
      />
      <button
        type="button"
        class="btn btn-outline-secondary btn-sm qty-button"
        (click)="onIncrement()"
        [disabled]="disabled"
        [attr.aria-label]="incrementAriaLabel"
      >
        +
      </button>
    </div>
  `,
  styles: [
    `
      .qty-button {
        min-width: 2rem;
        padding: 0.2rem 0.5rem;
        line-height: 1;
      }

      .quantity-input {
        width: 4.5rem;
        text-align: center;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuantityStepperComponent implements OnChanges {
  @Input() value: number | string = 1;
  @Input() min = 1;
  @Input() disabled = false;
  @Input() inputAriaLabel = 'Quantidade';
  @Input() decrementAriaLabel = 'Diminuir quantidade';
  @Input() incrementAriaLabel = 'Aumentar quantidade';

  @Output() decrement = new EventEmitter<void>();
  @Output() increment = new EventEmitter<void>();
  @Output() commit = new EventEmitter<string | number>();

  protected displayValue = '1';

  protected get numericValue(): number {
    const parsed = Number(this.displayValue);
    return Number.isFinite(parsed) ? parsed : this.min;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.displayValue = `${this.value ?? ''}`;
    }
  }

  protected onInput(rawValue: string): void {
    this.displayValue = rawValue;
  }

  protected onDecrement(): void {
    this.decrement.emit();
  }

  protected onIncrement(): void {
    this.increment.emit();
  }

  protected onCommit(): void {
    this.commit.emit(this.displayValue);
  }
}