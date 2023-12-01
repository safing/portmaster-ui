import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  inject,
} from '@angular/core';
import { SFNG_DIALOG_REF, SfngDialogRef } from '@safing/ui';
import { ActionIndicatorService } from '../../action-indicator';

export interface ExportConfig {
  content: string;
  type: 'setting' | 'profile';
}

@Component({
  templateUrl: './export-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        @apply flex flex-col gap-2 overflow-hidden;
        min-height: 24rem;
        min-width: 24rem;
        max-height: 40rem;
        max-width: 40rem;
      }
    `,
  ],
})
export class ExportDialogComponent implements OnInit {
  readonly dialogRef: SfngDialogRef<
    ExportDialogComponent,
    unknown,
    ExportConfig
  > = inject(SFNG_DIALOG_REF);

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly uai = inject(ActionIndicatorService);

  content = '';

  ngOnInit(): void {
    this.content = '```yaml\n' + this.dialogRef.data.content + '\n```';
  }

  download() {
    const blob = new Blob([this.dialogRef.data.content], { type: 'text/yaml' });

    const elem = this.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = 'export.yaml';
    this.elementRef.nativeElement.appendChild(elem);
    elem.click();
    this.elementRef.nativeElement.removeChild(elem);
  }

  copyToClipboard() {
    if (!!navigator.clipboard) {
      navigator.clipboard
        .writeText(this.dialogRef.data.content)
        .then(() => this.uai.success('Copied to Clipboard'))
        .catch(() => this.uai.error('Failed to Copy to Clipboard'));
    } else {
      this.uai.info(
        'Failed to Copy to Clipboard',
        'Copy to clipboard is not supported by your browser'
      );
    }
  }
}
