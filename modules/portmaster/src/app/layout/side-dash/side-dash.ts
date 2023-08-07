import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SfngDialogService } from '@safing/ui';
import { SPNAccountDetailsComponent } from 'src/app/shared/spn-account-details';

@Component({
  selector: 'app-side-dash',
  templateUrl: './side-dash.html',
  styleUrls: ['./side-dash.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideDashComponent {
  /** Whether or not a SPN account login is required */
  spnLoginRequired = false;

  constructor(
    private dialog: SfngDialogService,
  ) { }

  openAccountDetails() {
    this.dialog.create(SPNAccountDetailsComponent, {
      autoclose: true,
      backdrop: 'light'
    })
  }
}
