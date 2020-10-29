import { Component, ChangeDetectionStrategy, Input, isDevMode, OnInit, HostBinding, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
    selector: 'app-switch-item',
    template: '<ng-content></ng-content>',
    styleUrls: ['./switch-item.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchItemComponent implements OnInit {
    @Input()
    id: string = '';

    @Output()
    clicked = new EventEmitter<MouseEvent>();

    @HostListener('click', ['$event'])
    onClick(e: MouseEvent) {
        this.clicked.next(e);
    }

    @Input()
    @HostBinding('class.selected')
    set selected(v: any) {
        const selected = coerceBooleanProperty(v);
        if (selected !== this._selected) {
            this._selected = selected;
            this.selectedChange.next(selected);
        }
    }
    get selected() {
        return this._selected;
    }
    private _selected = false;

    @Output()
    selectedChange = new EventEmitter<boolean>();

    ngOnInit() {
        if (this.id === '' && isDevMode()) {
            throw new Error(`SwitchItemComponent must have an ID`);
        }
    }

    constructor(public readonly elementRef: ElementRef) { }
}
