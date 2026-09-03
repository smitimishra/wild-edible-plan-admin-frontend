import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';


@Component({
  selector: 'app-session-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-popup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionPopupComponent implements OnInit, OnDestroy {

  visible = false;

  private sub!: Subscription;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sub = this.authService.sessionInvalid$.subscribe(invalid => {
      this.visible = invalid;
      this.cdr.markForCheck();
    });
  }

  // ── OK button — clear session and redirect to login portal ─
  ok(): void {
    this.authService.acknowledgeSessionInvalid();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
