import { trigger, transition, style, animate } from '@angular/animations';

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
