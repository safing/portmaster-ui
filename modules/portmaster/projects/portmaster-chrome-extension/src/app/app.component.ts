import { Component } from '@angular/core';
import { MetaAPI } from '@safing/portmaster-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(private meta: MetaAPI) {
    this.meta.myProfile().subscribe(res => {
      console.log(res);
      debugger;
    })
  }
}
