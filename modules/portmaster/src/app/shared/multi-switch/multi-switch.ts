import { AfterViewInit, ChangeDetectionStrategy, Component, ContentChildren, QueryList, Output, EventEmitter, ChangeDetectorRef, ElementRef, ViewChild, Inject, Renderer2, NgZone } from '@angular/core';
import { Subscription, fromEvent, interval, animationFrameScheduler } from 'rxjs';
import { SwitchItemComponent } from './switch-item';
import { startWith, throttle, map, subscribeOn, takeUntil } from 'rxjs/operators';
import { CdkDragDrop, CdkDragEnd } from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';

@Component({
    selector: 'app-multi-switch',
    templateUrl: './multi-switch.html',
    styleUrls: ['./multi-switch.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultiSwitchComponent implements AfterViewInit {
    private sub = Subscription.EMPTY;

    markerOffset: number = 0;

    @ContentChildren(SwitchItemComponent)
    buttons: QueryList<SwitchItemComponent> | null = null;

    @Output()
    changed = new EventEmitter<string>();

    @ViewChild('marker', { read: ElementRef, static: true })
    marker: ElementRef | null = null;

    selectedButton: string = '';
    selecting = false;

    getMarkerOffsetLeft() {
        const markerRect = this.marker!.nativeElement.getBoundingClientRect();
        return markerRect.x;
    }

    constructor(
        public host: ElementRef,
        private changeDetectorRef: ChangeDetectorRef,
        @Inject(DOCUMENT) private document: Document,
        private renderer: Renderer2,
        private ngZone: NgZone
    ) { }

    ngAfterViewInit() {
        if (!this.buttons) {
            return;
        }
        this.buttons.changes
            .pipe(startWith(null))
            .subscribe(() => {
                this.sub.unsubscribe();
                this.sub = new Subscription();

                this.buttons!.forEach(btn => {
                    this.sub.add(
                        btn.clicked.subscribe((e: MouseEvent) => this.selectButton(btn, e))
                    );

                    this.sub.add(
                        btn.selectedChange.subscribe(() => this.repositionMarker())
                    );
                })
            });
    }

    selectButton(btn: SwitchItemComponent, event?: MouseEvent) {
        this.selectedButton = btn.id;
        this.changed.next(btn.id);
        this.buttons?.forEach(b => {
            b.selected = b.id === btn.id;
        });
    }

    dragStarted(event: MouseEvent) {
        const mousemove$ = fromEvent<MouseEvent>(document, 'mousemove');
        const hostRect = this.host.nativeElement.getBoundingClientRect();
        const start = this.markerOffset;
        const markerWidth = this.marker!.nativeElement.getBoundingClientRect().width;

        this.changeDetectorRef.detach();
        mousemove$
            .pipe(
                map(move => {
                    move.preventDefault();
                    return move.clientX - event.clientX;
                }),
                takeUntil(fromEvent(document, 'mouseup')),
                subscribeOn(animationFrameScheduler)
            )
            .subscribe({
                next: diff => {
                    let offset = start + diff;
                    if (offset < 0) {
                        offset = 0;
                    } else if (offset > hostRect.width) {
                        offset = hostRect.width;
                    }

                    offset -= Math.round(markerWidth / 2);

                    this.markerOffset = offset;
                    this.updatePosition(offset);
                },
                complete: () => {
                    this.changeDetectorRef.reattach();
                    this.markerDropped();
                }
            });
    }

    private updatePosition(x: number) {
        this.marker!.nativeElement.style.transform = `translate3d(${x}px, 0px, 0px)`;
    }

    markerDropped() {
        const offset = this.markerOffset;
        const host = this.host.nativeElement.getBoundingClientRect();
        let newButton: SwitchItemComponent | null = null;

        this.buttons?.forEach(btn => {
            const btnRect = btn.elementRef.nativeElement.getBoundingClientRect();
            const min = btnRect.x - host.x;
            const max = min + btnRect.width;

            if (offset >= min && offset <= max) {
                newButton = btn;
            }
        });

        if (!newButton) {
            newButton = Array.from(this.buttons!)[0];
        }

        if (!!newButton) {
            this.selecting = true;
            this.selectButton(newButton);
            this.selecting = false;

            this.repositionMarker(newButton);
        }
    }

    private repositionMarker(selected: SwitchItemComponent | null = null) {
        if (this.selecting) {
            return;
        }

        if (selected === null) {
            this.buttons?.forEach(btn => {
                if (btn.selected) {
                    selected = btn;
                }
            });
        }

        if (selected === null) {
            this.markerOffset = 0;
            this.updatePosition(0);
            return;
        }

        const offsetLeft = selected!.elementRef.nativeElement.offsetLeft;
        const clientWidth = selected!.elementRef.nativeElement.clientWidth;

        this.markerOffset = Math.round(offsetLeft - 8 + clientWidth / 2);
        this.updatePosition(this.markerOffset);
        this.changeDetectorRef.markForCheck();
    }
}