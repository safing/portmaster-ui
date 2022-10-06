import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, TrackByFunction } from "@angular/core";
import { AppProfile, AppProfileService, Fingerprint, PortapiService, Record } from '@safing/portmaster-api';
import { SfngDialogRef, SfngDialogService, SFNG_DIALOG_REF } from '@safing/ui';
import { mergeDeep } from "projects/safing/portmaster-api/src/public-api";
import { Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { FingerpringOperation, FingerprintType } from './../../../../projects/safing/portmaster-api/src/lib/app-profile.types';

@Component({
  templateUrl: './edit-profile-dialog.html',
  //changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./edit-profile-dialog.scss']
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class EditProfileDialog implements OnInit, OnDestroy {
  private destory$ = new Subject<void>();

  profile: Partial<AppProfile> = {
    ID: '',
    Source: 'local',
    Name: '',
    Description: '',
    Icon: '',
    Fingerprints: [],
  };

  isEditMode = false;
  iconBase64: string = '';
  iconChanged = false;
  imageError: string | null = null;

  allProfiles: AppProfile[] = [];

  copySettingsFrom: AppProfile[] = [];

  selectedCopyFrom: AppProfile | null = null;

  fingerPrintTypes = FingerprintType;
  fingerPrintOperations = FingerpringOperation;

  trackFingerPrint: TrackByFunction<Fingerprint> = (_: number, fp: Fingerprint) => `${fp.Type}-${fp.Key}-${fp.Operation}-${fp.Value}`;

  constructor(
    @Inject(SFNG_DIALOG_REF) private dialgoRef: SfngDialogRef<EditProfileDialog, any, string | null>,
    private profileService: AppProfileService,
    private portapi: PortapiService,
    private actionIndicator: ActionIndicatorService,
    private dialog: SfngDialogService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.profileService.watchProfiles()
      .pipe(takeUntil(this.destory$))
      .subscribe(profiles => {
        this.allProfiles = profiles;
        this.cdr.markForCheck();
      });

    if (!!this.dialgoRef.data) {
      this.isEditMode = true;
      this.profileService.getAppProfile(this.dialgoRef.data)
        .subscribe(profile => {
          this.profile = profile;

          // get the current icon of the profile
          switch (profile.IconType) {
            case 'blob':
              this.iconBase64 = profile.Icon;
              break;

            case 'database':
              this.portapi.get<Record & { iconData: string }>(profile.Icon)
                .subscribe(data => {
                  this.iconBase64 = data.iconData;
                  this.cdr.markForCheck();
                })
              break;

            default:
              console.error(`Unsupported icon type ${profile.IconType}`)
          }

          this.cdr.markForCheck();
        });
    }
  }

  ngOnDestroy() {
    this.destory$.next();
    this.destory$.complete();
  }

  addFingerprint() {
    this.profile.Fingerprints?.push({
      Key: '',
      Operation: FingerpringOperation.Equal,
      Value: '',
      Type: FingerprintType.Path
    })
  }

  removeFingerprint(idx: number) {
    this.profile.Fingerprints?.splice(idx, 1)
    this.profile.Fingerprints = [
      ...this.profile.Fingerprints!,
    ]
  }

  removeCopyFrom(idx: number) {
    this.copySettingsFrom.splice(idx, 1)
    this.copySettingsFrom = [
      ...this.copySettingsFrom
    ]
  }

  addCopyFrom() {
    this.copySettingsFrom = [
      ...this.copySettingsFrom,
      this.selectedCopyFrom!,
    ]
    this.selectedCopyFrom = null;
  }

  drop(event: CdkDragDrop<string[]>) {
    // create a copy of the array
    this.copySettingsFrom = [...this.copySettingsFrom];
    moveItemInArray(this.copySettingsFrom, event.previousIndex, event.currentIndex);

    this.cdr.markForCheck();
  }

  deleteProfile() {
    this.dialog.confirm({
      caption: 'Caution',
      header: 'Confirm Profile Deletion',
      message: 'Do you want to delete this profile?',
      buttons: [
        {
          id: 'delete',
          class: 'danger',
          text: 'Delete'
        },
        {
          id: 'abort',
          class: 'outline',
          text: 'Abort'
        }
      ]
    }).onAction('delete', () => {
      this.profileService.deleteProfile(this.profile as AppProfile)
        .subscribe({
          next: () => this.dialgoRef.close('deleted'),
          error: err => {
            this.actionIndicator.error('Failed to delete profile', err)
          }
        })
    })
  }

  resetIcon() {
    this.iconChanged = true;
    this.iconBase64 = '';
  }

  save() {
    if (this.profile.ID === '') {
      this.profile.ID = this.uuidv4()
    }

    let updateIcon: Observable<any> = of(undefined);

    if (this.iconChanged) {
      // delete any previously set icon
      if (!!this.profile.Icon && this.profile.IconType === 'database') {
        this.portapi.delete(this.profile.Icon!).subscribe()
      }

      if (this.iconBase64 !== '') {
        // save the new icon in the cache database
        this.profile.Icon = `cache:icons/${this.uuidv4()}`;
        this.profile.IconType = 'database';
        updateIcon = this.portapi.update(this.profile.Icon, { iconData: this.iconBase64 });

        // FIXME(ppacher): reset presentationpath
      } else {
        // just clear out that there was an icon
        this.profile.Icon = '';
        this.profile.IconType = '';
      }
    }

    if (this.profile.Fingerprints!.length > 1) {
      this.profile.PresentationPath = '';
    }
    const oldConfig = this.profile.Config || {}
    this.profile.Config = {}

    mergeDeep(this.profile.Config, ...[...this.copySettingsFrom.map(p => (p.Config || {})), oldConfig])

    updateIcon
      .pipe(
        switchMap(() => {
          return this.profileService.saveProfile(this.profile as AppProfile)
        })
      )
      .subscribe({
        next: () => {
          this.actionIndicator.success(this.profile.Name!, 'Profile saved successfully')
          this.dialgoRef.close('saved');
        },
        error: err => {
          this.actionIndicator.error('Failed to save profile', err)
        }
      })
  }

  abort() {
    this.dialgoRef.close('abort')
  }

  fileChangeEvent(fileInput: any) {
    this.imageError = null;
    this.iconBase64 = '';
    this.iconChanged = true;

    if (fileInput.target.files && fileInput.target.files[0]) {
      const max_size = 10 * 1024;
      const allowed_types = ['image/png', 'image/jpeg', 'image/svg'];
      const max_height = 512;
      const max_width = 512;

      if (fileInput.target.files[0].size > max_size) {
        this.imageError =
          'Maximum size allowed is ' + max_size / 1000 + 'KB';
      }

      if (!allowed_types.includes(fileInput.target.files[0].type)) {
        this.imageError = 'Only JPG and PNG is allowed';
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const image = new Image();
        image.src = e.target.result;
        image.onload = (rs: any) => {
          const img_height = rs.currentTarget['height']!;
          const img_width = rs.currentTarget['width'];

          console.log(img_height, img_width);


          if (img_height > max_height && img_width > max_width) {
            this.imageError =
              'Maximum dimentions allowed ' +
              max_height +
              '*' +
              max_width +
              'px';

          } else {
            const imgBase64Path = e.target.result;
            this.iconBase64 = imgBase64Path;
          }

          this.cdr.markForCheck();
        };

        this.cdr.markForCheck();
      };

      reader.readAsDataURL(fileInput.target.files[0]);
    }
  }

  private uuidv4(): string {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    // This one is not really random and not RFC compliant but serves enough for fallback
    // purposes if the UI is opened in a browser that does not yet support randomUUID
    console.warn("Using browser with lacking support for crypto.randomUUID()")

    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
