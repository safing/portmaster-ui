import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrls: ['./loading.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent { }
