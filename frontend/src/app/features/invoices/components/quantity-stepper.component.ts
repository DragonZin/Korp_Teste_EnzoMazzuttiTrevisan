import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quantity-stepper.component.html',
  styles: [
    `
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

  @Output() commit = new EventEmitter<string | number>();

  protected displayValue = '1';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.displayValue = `${this.value ?? ''}`;
    }
  }

  protected onInput(rawValue: string): void {
    this.displayValue = rawValue;
  }

  protected onCommit(): void {
    this.commit.emit(this.displayValue);
  }
}