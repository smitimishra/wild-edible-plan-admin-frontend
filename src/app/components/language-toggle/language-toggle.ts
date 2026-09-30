import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppLanguage, AppLanguageService } from '../../services/app-language';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [NgClass],
  template: `
    <div
      class="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      role="group"
      aria-label="Select language"
    >
      <button
        type="button"
        (click)="setLanguage('en')"
        [attr.aria-pressed]="language.language === 'en'"
        class="rounded-full px-3 py-2 text-sm font-semibold transition"
        [ngClass]="language.language === 'en' ? 'bg-green-500 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'"
      >
        EN
      </button>
      <button
        type="button"
        (click)="setLanguage('hi')"
        [attr.aria-pressed]="language.language === 'hi'"
        class="rounded-full px-3 py-2 text-sm font-semibold transition"
        [ngClass]="language.language === 'hi' ? 'bg-green-500 text-white' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'"
      >
        हिंदी
      </button>
    </div>
  `,
})
export class LanguageToggleComponent {
  constructor(readonly language: AppLanguageService) {}

  setLanguage(language: AppLanguage): void {
    this.language.setLanguage(language);
  }
}
