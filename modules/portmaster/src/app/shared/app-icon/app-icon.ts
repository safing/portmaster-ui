import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { AppProfile } from '../../services';

export interface IDandName {
  ID: string;
  Name: string;
}

@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.html',
  styleUrls: ['./app-icon.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  @Input()
  set profile(p: IDandName | null) {
    this._profile = p || null;

    if (!!p) {
      let idx = 0;
      for (let i = 0; i < p.ID.length; i++) {
        idx += p.ID.charCodeAt(i);
      }

      this.letter = p.Name[0].toLocaleUpperCase();
      this.color = AppColors[idx % AppColors.length];
    } else {
      this.letter = '';
      this.color = 'var(--text-tertiary)';
    }
  }
  get profile() { return this._profile; }
  _profile: IDandName | null = null;

  letter: string = '';

  @HostBinding('style.background-color')
  color: string = 'var(--text-tertiary)';
}

export const AppColors: string[] = [
  "rgba(244, 67, 54, .7)",
  "rgba(233, 30, 99, .7)",
  "rgba(156, 39, 176, .7)",
  "rgba(103, 58, 183, .7)",
  "rgba(63, 81, 181, .7)",
  "rgba(33, 150, 243, .7)",
  "rgba(3, 169, 244, .7)",
  "rgba(0, 188, 212, .7)",
  "rgba(0, 150, 136, .7)",
  "rgba(76, 175, 80, .7)",
  "rgba(139, 195, 74, .7)",
  "rgba(205, 220, 57, .7)",
  "rgba(255, 235, 59, .7)",
  "rgba(255, 193, 7, .7)",
  "rgba(255, 152, 0, .7)",
  "rgba(255, 87, 34, .7)",
  "rgba(121, 85, 72, .7)",
  "rgba(158, 158, 158, .7)",
  "rgba(96, 125, 139, .7)",
];
