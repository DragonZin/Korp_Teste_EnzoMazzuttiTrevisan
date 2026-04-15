import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { HealthIndicatorComponent } from './core/components/health-indicator/health-indicator.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, HealthIndicatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}