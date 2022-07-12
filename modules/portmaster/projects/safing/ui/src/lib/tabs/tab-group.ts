import { ListKeyManager } from "@angular/cdk/a11y";
import { CdkPortalOutlet, ComponentPortal, TemplatePortal } from "@angular/cdk/portal";
import { AfterContentInit, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentRef, ContentChildren, ElementRef, Injector, Input, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable, Subject } from "rxjs";
import { distinctUntilChanged, map, takeUntil } from "rxjs/operators";
import { SfngTabComponent, TabOutletComponent, TAB_ANIMATION_DIRECTION, TAB_PORTAL } from "./tab";

/**
 * Tab group component for rendering a tab-style navigation with support for
 * keyboard navigation and type-ahead. Tab content are lazy loaded using a
 * structural directive.
 * The tab group component also supports adding the current active tab index
 * to the active route so it is possible to navigate through tabs using back/forward
 * keys (browser history) as well.
 *
 * Example:
 *  <sfng-tab-group>
 *
 *    <sfng-tab id="tab1" title="Overview">
 *      <div *sfngTabContent>
 *        Some content
 *      </div>
 *    </sfng-tab>
 *
 *    <sfng-tab id="tab2" title="Settings">
 *      <div *sfngTabContent>
 *        Some different content
 *      </div>
 *    </sfng-tab>
 *
 *  </sfng-tab-group>
 */
@Component({
  selector: 'sfng-tab-group',
  templateUrl: './tab-group.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SfngTabGroupComponent implements AfterContentInit, AfterViewInit, OnInit, OnDestroy {
  @ContentChildren(SfngTabComponent)
  tabs: QueryList<SfngTabComponent> | null = null;

  /** References to all tab header elements */
  @ViewChildren('tabHeader', { read: ElementRef })
  tabHeaders: QueryList<ElementRef<HTMLDivElement>> | null = null;

  /** Reference to the active tab bar element */
  @ViewChild('activeTabBar', { read: ElementRef, static: true })
  activeTabBar: ElementRef<HTMLDivElement> | null = null;

  /** Reference to the portal outlet that we will use to render a TabOutletComponent. */
  @ViewChild(CdkPortalOutlet, { static: true })
  portalOutlet: CdkPortalOutlet | null = null;

  /** The name of the tab group. Used to update the currently active tab in the route */
  @Input()
  name = 'tab'

  private tabActivate$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  /** onActivate fires when a tab has been activated. */
  get onActivate(): Observable<string> { return this.tabActivate$.asObservable() }

  /** the index of the currently active tab. */
  activeTabIndex = -1;

  /** The key manager used to support keyboard navigation and type-ahead in the tab group */
  private keymanager: ListKeyManager<SfngTabComponent> | null = null;

  /**
   * pendingTabIdx holds the id or the index of a tab that should be activated after the component
   * has been bootstrapped. We need to cache this value here because the ActivatedRoute might emit
   * before we ar AfterViewInit.
   */
  private pendingTabIdx: string | null = null;

  constructor(
    private injector: Injector,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * @private
   * Used to forward keyboard events to the keymanager.
   */
  onKeydown(v: KeyboardEvent) {
    this.keymanager?.onKeydown(v);
  }

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        takeUntil(this.destroy$),
        map(params => params.get(this.name)),
        distinctUntilChanged(),
      )
      .subscribe(newIdx => {
        if (!!this.keymanager && !!this.tabs) {
          const actualIndex = this.getIndex(newIdx);
          if (actualIndex !== null) {
            this.keymanager.setActiveItem(actualIndex);
            this.cdr.markForCheck();
          }
        } else {
          this.pendingTabIdx = newIdx;
        }
      })
  }

  ngAfterContentInit(): void {
    this.keymanager = new ListKeyManager(this.tabs!)
      .withHomeAndEnd()
      .withHorizontalOrientation("ltr")
      .withTypeAhead()
      .withWrap()

    this.keymanager.change
      .pipe(takeUntil(this.destroy$))
      .subscribe(change => {
        const activeTab = this.tabs!.get(change);
        if (!!activeTab && !!activeTab.tabContent) {
          const prevIdx = this.activeTabIndex;
          const animationDirection = prevIdx < change ? 'left' : 'right';

          if (this.portalOutlet?.attachedRef) {
            // we know for sure that attachedRef is a ComponentRef of TabOutletComponent
            const ref = (this.portalOutlet.attachedRef as ComponentRef<TabOutletComponent>)
            ref.instance._animateDirection = animationDirection;
            ref.changeDetectorRef.detectChanges();
          }

          this.portalOutlet?.detach();

          const newOutletPortal = this.createTabOutlet(activeTab.tabContent.portal, animationDirection);
          this.activeTabIndex = change;


          this.tabActivate$.next(activeTab.id);
          this.portalOutlet?.attach(newOutletPortal);
          this.repositionTabBar();

          this.router.navigate([], {
            queryParams: {
              ...this.route.snapshot.queryParams,
              [this.name]: this.activeTabIndex,
            }
          })
          this.cdr.markForCheck();
        }
      });

    if (this.pendingTabIdx === null) {
      // active the first tab that is NOT disabled
      const firstActivatable = this.tabs?.toArray().findIndex(tap => !tap.disabled);
      if (firstActivatable !== undefined) {
        this.keymanager.setActiveItem(firstActivatable);
      }
    } else {
      const idx = this.getIndex(this.pendingTabIdx);
      if (idx !== null) {
        this.keymanager.setActiveItem(idx);
        this.pendingTabIdx = null;
      }
    }
  }

  ngAfterViewInit(): void {
    this.repositionTabBar();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * @private
   * Activates a new tab
   *
   * @param idx The index of the new tab.
   */
  activateTab(idx: number) {
    this.keymanager?.setActiveItem(idx);
  }

  private getIndex(newIdx: string | null): number | null {
    let actualIndex: number = -1;
    if (!this.tabs) {
      return null;
    }

    if (newIdx === undefined || newIdx === null) { // not present in the URL
      return null;
    }
    if (isNaN(+newIdx)) { // likley the ID of a tab
      actualIndex = this.tabs?.toArray().findIndex(tab => tab.id === newIdx) || -1;
    } else { // it's a number as a string
      actualIndex = +newIdx;
    }

    if (actualIndex < 0) {
      return null;
    }
    return actualIndex;
  }

  private repositionTabBar() {
    if (!this.tabHeaders) {
      return;
    }

    requestAnimationFrame(() => {
      const tabHeader = this.tabHeaders!.get(this.activeTabIndex);
      if (!tabHeader || !this.activeTabBar) {
        return;
      }
      const rect = tabHeader.nativeElement.getBoundingClientRect();
      const transform = `translate(${tabHeader.nativeElement.offsetLeft}px, ${tabHeader.nativeElement.offsetTop + rect.height}px)`
      this.activeTabBar.nativeElement.style.width = `${rect.width}px`
      this.activeTabBar.nativeElement.style.transform = transform;
      this.activeTabBar.nativeElement.style.opacity = '1';

      // initialize animations on the active-tab-bar required
      if (!this.activeTabBar.nativeElement.classList.contains("transition-all")) {
        // only initialize the transitions if this is the very first "reposition"
        // this is to prevent the bar from animating to the "bottom" line of the tab
        // header the first time.
        requestAnimationFrame(() => {
          this.activeTabBar?.nativeElement.classList.add("transition-all", "duration-200");
        })
      }
    })
  }

  private createTabOutlet(contentPortal: TemplatePortal<any>, animationDir: 'left' | 'right'): ComponentPortal<TabOutletComponent> {
    const injector = Injector.create({
      providers: [
        {
          provide: TAB_PORTAL,
          useValue: contentPortal,
        },
        {
          provide: TAB_ANIMATION_DIRECTION,
          useValue: animationDir,
        },
      ],
      parent: this.injector,
      name: 'TabOutletInjectot',
    })

    return new ComponentPortal(
      TabOutletComponent,
      undefined,
      injector
    )
  }
}
