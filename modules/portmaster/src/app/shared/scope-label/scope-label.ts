import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { parseDomain } from '../utils';
import { ScopeTranslation } from 'src/app/services';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
  selector: 'app-scope-label',
  templateUrl: 'scope-label.html',
  styleUrls: [
    './scope-label.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
})
export class ScopeLabelComponent implements OnChanges {
  readonly scopeTranslation = ScopeTranslation;

  @Input()
  scope = '';

  @Input()
  set leftRightFix(v: any) {
    this._leftRightFix = coerceBooleanProperty(v);
  }
  get leftRightFix() { return this._leftRightFix; }
  private _leftRightFix = false;

  domain = '';
  subdomain = '';

  ngOnChanges(change: SimpleChanges) {
    if (!!change.scope) {
      // this.label = change.label.currentValue;
      const result = parseDomain(change.scope.currentValue || '');

      this.domain = result?.domain || '';
      this.subdomain = result?.subdomain || '';
    }
  }
}
