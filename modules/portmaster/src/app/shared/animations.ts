import { trigger, transition, style, animate } from '@angular/animations';

export const fadeInAnimation = trigger(
  'fadeIn',
  [
    transition(
      ':enter',
      [
        style({ opacity: 0 }),
        animate('.3s ease-out',
          style({ opacity: 1 }))
      ]
    ),
  ]
);
