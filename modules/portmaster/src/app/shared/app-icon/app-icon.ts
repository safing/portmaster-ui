import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, Input } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { AppProfileService } from '../../services';

export interface IDandName {
  ID: string;
  Name: string;
}

const iconsToIngore = [
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABU0lEQVRYhe2WTUrEQBCF36i4ctm4FsdTKF5AEFxL0knuILgQXAy4ELxDfgTXguAFRG/hDXKCAbtcOB3aSVenMjPRTb5NvdCE97oq3QQYGflnJlbc3T/QXxrfXF9NAGBraKPTk2Nvtey4D1l8OUiIo8ODX/Xt/cMfQCk1SAAi8upWgLquWy8rpbB7+yk2m8+mYvNWAAB4fnlt9MX5WaP397ZhCPgygCFa1IUmwJifCgB5nrMBtdbhAK6pi9QcALIs8+5c1AEOqTmwZge4EUjNiQhpmjbarcvaG4AbgcTcUhSFfwFAHMfhABxScwBIkgRA9wnwBgiOQGBORCjLkl2PoigcgB2BwNzifmi97wEOqTkRoaoqdr2zA9wIJOYWrTW785VPQR+WO2B3vdYIpBBRc9Qkp2Cw/4GVR+BjPpt23u19tUXUgU2aBzuQPz5J8oyMjGyUb9+FOUOmulVPAAAAAElFTkSuQmCC",
]

@Component({
  selector: 'app-icon',
  templateUrl: './app-icon.html',
  styleUrls: ['./app-icon.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppIconComponent {
  src: string = '';

  @Input()
  set profile(p: IDandName | null | undefined) {
    this._profile = p || null;
    this.updateView();
  }

  get profile() { return this._profile; }
  _profile: IDandName | null = null;

  letter: string = '';

  @HostBinding('style.background-color')
  get color() {
    if (!!this.src) {
      return 'unset';
    }
    return this._color;
  }
  private _color: string = 'var(--text-tertiary)';

  constructor(
    private profileService: AppProfileService,
    private changeDetectorRef: ChangeDetectorRef,
  ) { }

  private updateView() {
    const p = this.profile;
    if (!!p) {
      this.tryGetSystemIcon(p);

      let idx = 0;
      for (let i = 0; i < p.ID.length; i++) {
        idx += p.ID.charCodeAt(i);
      }

      if (p.Name !== "") {
        if (p.Name[0] === '<') {
          // we might get the name with search-highlighting which
          // will then include <em> tags. If the first character is a <
          // make sure to strip all HTML tags before getting [0].
          this.letter = p.Name.replace(/(&nbsp;|<([^>]+)>)/ig, "")[0].toLocaleUpperCase();
        } else {
          this.letter = p.Name[0];
        }

        this.letter = this.letter.toLocaleUpperCase();
      } else {
        this.letter = '?';
      }

      this._color = AppColors[idx % AppColors.length];
    } else {
      this.letter = '';
      this._color = 'var(--text-tertiary)';
    }
  }

  private tryGetSystemIcon(p: IDandName) {
    if (!!window.app) {
      this.profileService.getAppProfile('local', p.ID)
        .pipe(
          switchMap(profile => window.app.getFileIcon(profile.LinkedPath))
        )
        .subscribe(
          icon => {
            this.src = icon;
            this.changeDetectorRef.detectChanges();
          },
          console.error
        );
    }
  }
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
