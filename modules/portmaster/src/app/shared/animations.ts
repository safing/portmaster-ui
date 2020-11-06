import { trigger, transition, style, animate, query, stagger, animateChild } from '@angular/animations';

export const fadeInAnimation = trigger(
  'fadeIn',
  [
    transition(
      ':enter',
      [
        style({ opacity: 0 }),
        animate('.3s ease-in',
          style({ opacity: 1 }))
      ]
    ),
  ]
);

export const fadeOutAnimation = trigger(
  'fadeOut',
  [
    transition(
      ':leave',
      [
        style({ opacity: 1 }),
        animate('.1s ease-out',
          style({ opacity: 0 }))
      ]
    ),
  ]
);

export const fadeInListAnimation = trigger(
  'fadeInList',
  [
    transition(':enter, * => 0, * => -1', []),
    transition(':increment', [
      query(':enter', [
        style({ opacity: 0 }),
        stagger(5, [
          animate('300ms ease-out', style({ opacity: 1 })),
        ]),
      ], { optional: true })
    ]),
  ]
)

export const moveInOutAnimation = trigger(
  'moveInOut',
  [
    transition(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('.2s ease-in',
          style({ opacity: 1, transform: 'translateX(0%)' }))
      ]
    ),
    transition(
      ':leave',
      [
        style({ opacity: 1 }),
        animate('.2s ease-out',
          style({ opacity: 0, transform: 'translateX(100%)' }))
      ]
    )
  ]
)

export const moveInOutListAnimation = trigger(
  'moveInOutList',
  [
    transition(':enter, * => 0, * => -1', []),
    transition(':increment', [
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        stagger(50, [
          animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0%)' })),
        ]),
      ], { optional: true })
    ]),
    transition(':decrement', [
      query(':leave', [
        stagger(-50, [
          animate('200ms ease-out', style({ opacity: 0, transform: 'translateX(100%)' })),
        ]),
      ])
    ]),
  ]
)
