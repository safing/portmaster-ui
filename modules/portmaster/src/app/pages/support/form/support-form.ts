import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, DestroyRef, OnInit, TrackByFunction, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DebugAPI } from '@safing/portmaster-api';
import { ConfirmDialogConfig, SfngDialogService } from '@safing/ui';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { debounceTime, mergeMap } from 'rxjs/operators';
import { SessionDataService, StatusService } from 'src/app/services';
import { Issue, SupportHubService } from 'src/app/services/supporthub.service';
import { ActionIndicatorService } from 'src/app/shared/action-indicator';
import { fadeInAnimation, fadeInListAnimation, moveInOutAnimation } from 'src/app/shared/animations';
import { FuzzySearchService } from 'src/app/shared/fuzzySearch';
import { SupportPage, supportTypes } from '../pages';

@Component({
  templateUrl: './support-form.html',
  styleUrls: ['./support-form.scss'],
  animations: [fadeInAnimation, moveInOutAnimation, fadeInListAnimation]
})
export class SupportFormComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private search$ = new BehaviorSubject<string>('');
  page: SupportPage | null = null;

  debugData: string = '';
  title: string = '';
  form: { [key: string]: string } = {}
  selectedRepo: string = '';
  haveGhAccount = false;
  version: string = '';
  buildDate: string = '';
  titleMissing = false;

  relatedIssues: Issue[] = [];
  allIssues: Issue[] = [];
  repos: { [repo: string]: string } = {};

  @ViewChild(CdkScrollable)
  scrollContainer: CdkScrollable | null = null;

  trackIssue: TrackByFunction<Issue> = (_: number, issue: Issue) => issue.url;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private uai: ActionIndicatorService,
    private debugapi: DebugAPI,
    private statusService: StatusService,
    private dialog: SfngDialogService,
    private supporthub: SupportHubService,
    private searchService: FuzzySearchService,
    private sessionService: SessionDataService,
  ) { }

  ngOnInit() {
    this.supporthub.loadIssues().subscribe(issues => {
      issues = issues.reverse();
      this.allIssues = issues;
      this.relatedIssues = issues;
    })

    this.search$.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(200),
    )
      .subscribe((text) => {
        this.relatedIssues = this.searchService.searchList(this.allIssues, text, {
          disableHighlight: true,
          shouldSort: true,
          isCaseSensitive: false,
          minMatchCharLength: 4,
          keys: [
            'title',
            'body',
          ],
        }).map(res => res.item)
      })

    this.statusService.getVersions()
      .subscribe(status => {
        this.version = status.Core.Version;
        this.buildDate = status.Core.BuildDate;
      })

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get("id")
        for (let pIdx = 0; pIdx < supportTypes.length; pIdx++) {
          const pageSection = supportTypes[pIdx];
          const page = pageSection.choices.find(choice => choice.type !== 'link' && choice.id === id);
          if (!!page) {
            this.page = page as SupportPage;
            break;
          }
        }

        if (!this.page) {
          this.router.navigate(['..']);
          return;
        }
        this.title = '';
        this.form = {};
        this.selectedRepo = 'portmaster';
        this.debugData = '';
        this.repos = {};
        this.page.sections.forEach(section => this.form[section.title] = '');
        this.page.repositories?.forEach(repo => this.repos[repo.repo] = repo.name)

        // try to restore from session service
        this.sessionService.restore(this.page.id, this);

        if (this.page.includeDebugData) {
          this.debugapi.getCoreDebugInfo('github')
            .subscribe({
              next: data => this.debugData = data,
              error: err => this.uai.error('Failed to get Debug Data', this.uai.getErrorMessgae(err))
            })
        }
      })
  }

  onModelChange() {
    if (!this.page) {
      return;
    }
    this.sessionService.save(this.page.id, this, ['title', 'form', 'selectedRepo', 'haveGhAccount']);
  }

  selectRepo(repo: string) {
    this.selectedRepo = repo;
    this.onModelChange();
  }

  searchIssues(text: string) {
    this.onModelChange();
    this.search$.next(text);
  }

  copyToClipboard(what: string) {
    if (!!navigator.clipboard) {
      navigator.clipboard.writeText(what)
        .then(() => this.uai.success("Copied to Clipboard"))
        .catch(() => this.uai.error('Failed to Copy to Clipboard'));
    } else {
      this.uai.info('Failed to Copy to Clipboard', 'Copy to clipboard is not supported by your browser')
    }
  }

  validate(): boolean {
    this.titleMissing = this.title === '';
    const valid = !this.titleMissing;
    if (!valid) {
      this.scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' })
    }
    return valid;
  }

  createOnGithub(genUrl?: boolean) {
    if (!this.validate()) {
      return;
    }

    if (genUrl === undefined && this.haveGhAccount) {
      genUrl = true;
    }

    if (genUrl === undefined) {
      this.dialog.confirm({
        canCancel: true,
        caption: 'Caution',
        header: 'Create Issue on GitHub',
        message: 'You can easily create the issue with your own GitHub account. Or create the GitHub issue privately, but then we will have no way to communicate with you for further information.',
        buttons: [
          { id: 'createWithout', text: 'Create Without Account', class: 'outline' },
          { id: 'openGithub', text: 'Use My Account' },
        ]
      })
        .onAction('openGithub', () => {
          this.createOnGithub(true);
        })
        .onAction('createWithout', () => {
          this.createOnGithub(false);
        })
      return;
    }

    let debugInfo: Observable<string> = this.supporthub.uploadText('debug-info', this.debugData);
    if (!this.page?.includeDebugData) {
      debugInfo = of('');
    }

    debugInfo
      .pipe(
        mergeMap(url => this.supporthub.createIssue(
          this.selectedRepo,
          this.page?.ghIssuePreset || '',
          this.title,
          this.page!.sections.map(section => ({
            title: section.title,
            body: this.form[section.title],
          })),
          url,
          { generateUrl: genUrl || false }
        ))
      )
      .subscribe({
        next: url => {
          this.sessionService.delete(this.page?.id || '');
          const openUrl = () => {
            if (!!window.app) {
              window.app.openExternal(url);
            } else {
              window.open(url, '__blank');
            }
          }

          if (genUrl === true) {
            openUrl();
            return;
          }

          const opts: ConfirmDialogConfig = {
            canCancel: false,
            buttons: [{ id: '', text: 'Close', class: 'outline' }, { id: 'open', text: 'Open Issue' }],
            caption: 'Info',
            header: 'Issue Created!',
            message: 'We successfully created the issue on Github for you. Use the following link to check for updates: ' + url,
          }
          this.dialog.confirm(opts)
            .onAction('open', () => {
              openUrl();
            })
        },
        error: err => {
          this.uai.error('Failed to create issue', this.uai.getErrorMessgae(err))
        }
      })
  }

  openIssue(issue: Issue) {
    if (!!window.app) {
      window.app.openExternal(issue.url);
      return;
    }
    window.open(issue.url, '__blank')
  }

  createPrivateTicket() {
    if (!this.validate()) {
      return;
    }

    const opts: ConfirmDialogConfig = {
      caption: 'Info',
      canCancel: true,
      header: 'How should we stay in touch?',
      message: 'Please enter your email address so we can write back and forth until the issue is concluded.',
      inputModel: '',
      inputPlaceholder: 'Optional Email',
      inputType: 'text',
      buttons: [
        { id: '', class: 'outline', text: 'Cancel' },
        { id: 'create', text: 'Create Ticket' },
      ],
    }
    this.dialog.confirm(opts)
      .onAction('create', () => {
        let debugInfo: Observable<string> = this.supporthub.uploadText('debug-info', this.debugData);
        if (!this.page?.includeDebugData) {
          debugInfo = of('');
        }

        debugInfo
          .pipe(
            mergeMap(url => this.supporthub.createTicket(
              this.selectedRepo,
              this.title,
              opts.inputModel || '',
              this.page!.sections.map(section => ({
                title: section.title,
                body: this.form[section.title],
              })),
              url,
            ))
          )
          .subscribe({
            next: () => {
              let msg = '';
              if (!!opts.inputModel) {
                msg = 'You will be contacted as soon as possible';
              }
              this.uai.success('Ticket created successfully', msg)
              this.sessionService.delete(this.page?.id || '');
            },
            error: err => {
              this.uai.error('Failed to create ticket', this.uai.getErrorMessgae(err))
            }
          })
      });
  }

}
