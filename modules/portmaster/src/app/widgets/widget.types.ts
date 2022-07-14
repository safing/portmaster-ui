import { EventEmitter, InjectionToken, Type } from '@angular/core';
import { Record } from '@safing/portmaster-api';

export interface WidgetConfig<T = any> extends Record {
  type: string;
  config: T;
  key?: string;
}

export interface WidgetFactory<T> {
  onConfigChange: EventEmitter<T>;
  config: T | null;
}

/**
 * An optional injection token provided when a widget settings component
 * is created to update an existing widget.
 */
export const WIDGET_CONFIG = new InjectionToken<WidgetConfig>('WIDGET_CONFIG');

/**
 * InjectionToken for providing widget defintions.
 */
export const WIDGET_DEFINTIONS = new InjectionToken<WidgetDefinition<any>>('WIDGET_DEFINITIONS');

/**
 * A single widget definitions.
 */
export interface WidgetDefinition<T> {
  /* The widget type */
  type: string;
  /* A name for the widget */
  name: string;
  /* The component to configure or create a new widget */
  settingsComponent: Type<WidgetFactory<T>>;
  /* The actual component to render for the widget */
  widgetComponent: Type<any>;
  /* Disable custom user widgets of this type */
  disableCustom?: boolean;
  /* Help Key defines the key for the widget-tip-up */
  tipUpKey?: string;
}
