import { Pipe, PipeTransform } from '@angular/core';
import { AppLanguageService } from '../services/app-language';

@Pipe({
  name: 'languageText',
  standalone: true,
  pure: false,
})
export class LanguageTextPipe implements PipeTransform {
  constructor(private readonly language: AppLanguageService) {}

  transform(text: string): string {
    return this.language.translate(text);
  }
}
