import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrls: ['./loading.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent implements OnInit {
  @HostBinding('class.animate')
  _animate = true;


  ngOnInit() {
  }

  constructor(private changeDetectorRef: ChangeDetectorRef) { }
}
