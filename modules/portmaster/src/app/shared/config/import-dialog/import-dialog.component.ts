import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SFNG_DIALOG_REF, SfngDialogRef } from "@safing/ui";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { Cursor } from "./cursor";
import { getSelectionOffset, setSelectionOffset } from "./selection";
import { ImportResult, PortapiService } from "@safing/portmaster-api";
import { HttpErrorResponse } from "@angular/common/http";
import { ActionIndicatorService } from "../../action-indicator";

@Component({
  templateUrl: './import-dialog.component.html',
  styles: [
    `
    :host {
      @apply flex flex-col gap-2;
      min-height: 24rem;
      min-width: 24rem;
      max-height: 40rem;
      max-width: 40rem;
    }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsImportDialogComponent {
  readonly dialogRef: SfngDialogRef<SettingsImportDialogComponent, unknown, string> = inject(SFNG_DIALOG_REF);
  private readonly portapi = inject(PortapiService)
  private readonly uai = inject(ActionIndicatorService)
  private readonly cdr = inject(ChangeDetectorRef)

  @ViewChild('codeBlock', { static: true, read: ElementRef })
  codeBlockElement!: ElementRef<HTMLElement>;

  result: ImportResult | null = null;
  reset = false;
  allowUnknown = false;
  triggerRestart = false;

  errorMessage: string = '';

  get scope() { return this.dialogRef.data }

  onBlur() {
    const text = this.codeBlockElement.nativeElement.innerText;
    this.updateAndValidate(text)
  }

  onPaste(event: ClipboardEvent) {
    event.stopPropagation();
    event.preventDefault();

    // Get pasted data via clipboard API
    const clipboardData = event.clipboardData || (window as any).clipboardData;
    const text = clipboardData.getData('Text');

    this.updateAndValidate(text)
  }

  importSetting() {
    const text = this.codeBlockElement.nativeElement.innerText;

    this.portapi.importSettings(text, this.dialogRef.data, 'text/yaml', this.reset, this.allowUnknown)
      .subscribe({
        next: result => {
          let msg = '';
          if (result.restartRequired) {
            if (this.triggerRestart) {
              this.portapi.restartPortmaster().subscribe()
              msg = "Portmaster will be restarted now."
            } else {
              msg = 'Please restart Portmaster to apply the new settings.'
            }
          }

          this.uai.success('Settings Imported Successfully', msg)
          this.dialogRef.close();
        },
        error: err => {
          this.uai.error('Failed To Import Settings', this.uai.getErrorMessgae(err))
        }
      })
  }

  updateAndValidate(content: string) {
    const [start, end] = getSelectionOffset(this.codeBlockElement.nativeElement)

    const p = (window as any).Prism;
    const blob = p.highlight(content, p.languages.yaml, 'yaml');
    this.codeBlockElement.nativeElement.innerHTML = blob;

    setSelectionOffset(this.codeBlockElement.nativeElement, start, end)

    if (content === '') {
      return
    }

    window.getSelection()?.removeAllRanges();

    this.portapi.validateSettingsImport(content, this.dialogRef.data, 'text/yaml')
      .subscribe({
        next: result => {
          this.result = result;
          this.errorMessage = '';

          this.cdr.markForCheck();
        },
        error: err => {
          const msg = this.uai.getErrorMessgae(err)
          this.errorMessage = msg;
          this.result = null;

          this.cdr.markForCheck();
        }
      })
  }

  loadFile(event: Event) {
    const file: File = (event.target as any).files[0];
    if (!file) {
      this.updateAndValidate("");

      return;
    }

    const reader = new FileReader()

    reader.onload = (data) => {
      (event.target as any).value = '';

      let content = (data.target as any).result
      this.updateAndValidate(content)
    }

    reader.readAsText(file)
  }
}
