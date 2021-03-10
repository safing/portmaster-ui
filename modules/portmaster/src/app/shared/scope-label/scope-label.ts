import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { parseDomain } from '../utils';
import { ScopeTranslation } from 'src/app/services';

@Component({
  selector: 'app-scope-label',
  templateUrl: 'scope-label.html',
  styleUrls: [
    './scope-label.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScopeLabelComponent implements OnChanges {
  readonly scopeTranslation = ScopeTranslation;

  @Input()
  scope?: string = ''

  domain: string = '';
  subdomain: string = '';

  ngOnChanges(change: SimpleChanges) {
    if (!!change['scope']) {
      //this.label = change.label.currentValue;
      const result = parseDomain(change.scope.currentValue || '')

      this.domain = result?.domain || '';
      this.subdomain = result?.subdomain || '';
    }
  }
}
