import type { Notification, NotificationTargetRole, UserRole } from './types';

export const NOTIFICATIONS_UPDATED_EVENT = 'koryandik-notifications-updated';
export const PUSH_NOTIFICATION_EVENT = 'push-notification';

export function emitNotificationsUpdated(notification?: Notification): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, { detail: notification })
  );
}

export function triggerBrowserNotification(title: string, body: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(PUSH_NOTIFICATION_EVENT, { detail: { title, body, data } })
  );
}

interface SessionLike {
  role?: UserRole;
  npsn?: string;
  id?: string;
}

/** Show browser notification if it applies to the currently logged-in user. */
export async function maybeNotifyCurrentUser(notification: Notification): Promise<void> {
  if (typeof window === 'undefined') return;

  let session: SessionLike | null = null;
  try {
    const raw = localStorage.getItem('koryandik_current_user');
    if (raw) session = JSON.parse(raw) as SessionLike;
  } catch {
    return;
  }

  if (!session?.role) return;

  if (session.role === 'gugus' && notification.schoolNpsn && session.id) {
    const { getSchools } = await import('./db');
    const schools = await getSchools();
    const school = schools.find((s) => s.npsn === notification.schoolNpsn);
    if (school && school.gugus !== session.id) return;
  }

  if (!notificationAppliesToSession(notification, session)) return;

  triggerBrowserNotification(notification.title, notification.message);
}

export function notificationAppliesToSession(
  notification: Notification,
  session: SessionLike,
  schoolNpsnsInGugus?: Set<string>
): boolean {
  const role = session.role;
  if (!role) return false;

  if (notification.targetRole && notification.targetRole !== role) {
    return false;
  }

  if (role === 'school') {
    if (notification.schoolNpsn && session.npsn && notification.schoolNpsn !== session.npsn) {
      return false;
    }
    return true;
  }

  if (role === 'gugus') {
    if (notification.schoolNpsn && schoolNpsnsInGugus) {
      return schoolNpsnsInGugus.has(notification.schoolNpsn);
    }
    return true;
  }

  return true;
}

export function roleFromTarget(target?: NotificationTargetRole): UserRole | undefined {
  return target;
}
