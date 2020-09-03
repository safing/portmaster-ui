import { getEnumKey } from './core.types';

/**
 * Action defines a user selectable action and can
 * be attached to a notification. Once selected,
 * the action's ID is set as the SelectedActionID
 * of the notification.
 */
export interface Action {
  // ID uniquely identifies the action. It's safe to
  // use ID to select a localizable template to use
  // instead of the Text property.
  ID: string;
  // Text is the (default) text for the action label.
  Text: string;
}

/**
 * Available types of notifications. Notification
 * types are mainly for filtering and style related
 * decisions.
 */
export enum NotificationType {
  // Info is an informational message only.
  Info = 0,
  // Warning is a warning message.
  Warning = 1,
  // Prompt asks the user for a decision.
  Prompt = 2,
}

/**
 * Returns a string representation of the notifcation type.
 *
 * @param val The notifcation type
 */
export function getNotificationTypeString(val: NotificationType): string {
  return getEnumKey(NotificationType, val)
}

/**
 * Each notification can be in one of six different states
 * that inform the client on how to handle the notification.
 */
export enum NotificationState {
  /**
   * state: ActionPending
   *
   * A notification is in ActionPending if the user has selected
   * which action to perform but that action has not yet been
   * executed (because a different application or implementation
   * is expected to care about that execution).
   */
  ActionPending = 'action-pending',
  /**
   * state: Expired
   *
   * A notification is expired if the it has an expiration time
   * set and that time has passed. Expired notifications do not
   * expect the user to choose an action anymore. However, if
   * the use chose an action and that action is to be executed
   * externally that the responsible implementation still needs
   * to execute that action. Note that this state is expressed
   * as ActionPending.
   */
  Expired = 'expired',
  /**
   * state: Done
   *
   * A notification is in Done state if it has been dismissed any
   * it's selected action has been executed.
   */
  Done = 'done',
  /**
   * state: New
   *
   * A notification is new if it has not yet been dismissed
   * and needs to be showen to the user. A New notification does
   * not have any actions associated (otherwise it would be in
   * ActionRequired state)
   */
  New = 'new',
  /**
   * state: ActionRequired
   *
   * A notification is in ActionRequired if it is new but has
   * possible actions the user can choose from.
   */
  ActionRequired = 'action-required',
  /**
   * state: Invalid
   *
   * A notification is invalid if the state of an notification is
   * non-sense.
   */
  Invalid = 'invalid'
}

/**
 * Returns the state of a notification. See {@enum NotificationState}
 * for more information on available states.
 *
 * @param n The notification in question.
 */
export function notificationState(n: Notification<any>): NotificationState {
  if (!!n.SelectedActionID && !!n.Responded && !n.Executed) {
    return NotificationState.ActionPending;
  }

  // once executed a notifications Expires property is set to the
  // same value as Executed. Since we still want to differentiale those
  // two we need to handle that here.
  if (!!n.Expires && n.Expires <= Math.round(Date.now() / 1000) && n.Expires !== n.Executed) {
    return NotificationState.Expired;
  }

  if (!!n.Executed) {
    return NotificationState.Done;
  }

  if (!n.Responded && !n.SelectedActionID) {
    if (!!n.AvailableActions) {
      return NotificationState.ActionRequired;
    }
    return NotificationState.New;
  }

  return NotificationState.Invalid;
}

export interface Notification<T> {
  // ID uniquely identifies a notification. Notifications with the
  // same ID are expected to have a similar shape in their
  // DataSubject property (if any) and are expected to be semantically
  // identical. That is, it is safe to use a differented wording or
  // translation than the one specified in the Message property.
  ID: string;
  // Type is the type of notification.
  Type: NotificationType;
  // AvailableActions is an array of actions that are supported
  // by the notification. If selected, the actions ID is stored
  // in the SelectedActionID property.
  AvailableActions?: Action[];
  // Message holds the message that should be displayed to the user.
  // If a localized version of the message - identifiyable by the
  // notification ID - is available it is safe to display those
  // message/template instead.
  Message: string;
  // DataSubject may hold additional, notification specific data.
  // It's safe to assume a given notification ID will always have
  // the same DataSubject shape.
  DataSubject: T | null;
  // Created holds the timestamp the notification has been created.
  Created: number; // timestamp
  // Executed is set to the timestamp after which the notifications
  // action has been executed. Note that it is possible that a
  // notification has an action selected (SelectedActionID != "")
  // but still has an Executed property of 0. In that case, the
  // action has been selected by the user using a different way
  // and exeuction is still pending. Clients should check whether
  // the pending execution is in their scope and act accordingly.
  Executed: number;
  // Expires holds the timestamp the notification will expire on
  // it's own. If zero, 0, the notification does not have an
  // expiration timestamp set.
  Expires: number;
  // GUID is mainly for internal tracking and system integration
  // and can safely be ignored by clients.
  GUID: string;
  // Persistent can be set to true if the notification is persistent
  // and will survive a restart of the service. Notification persistence
  // is handled by the service and clients normally don't need to care
  // much about it.
  Persistent: boolean;
  // Responded is set to a timestamp at which the user selected
  // an action to invoke (if any).
  Responded: number;
  // SelectedActionID is the ID of the action that has been selected
  // by the user. Note that if Executed is still 0 the execution of
  // that action is still pending.
  SelectedActionID: string;
}
