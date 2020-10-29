import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, OnInit } from '@angular/core';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.html',
  styleUrls: ['./loading.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent implements OnInit {
  @HostBinding('class.animate')
  _animate = false;


  ngOnInit() {
    let timeout = Math.floor(Math.random() * 1000);
    console.log(`timeout: `, timeout)
    setTimeout(() => {
      this._animate = true;
      this.changeDetectorRef.detectChanges();
    }, timeout);
  }

  constructor(private changeDetectorRef: ChangeDetectorRef) { }
}
