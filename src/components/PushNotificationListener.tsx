'use client';

import { useEffect } from 'react';
import { sendLocalNotification } from '@/lib/pushNotifications';
import { PUSH_NOTIFICATION_EVENT } from '@/lib/notificationEvents';

/** Global listener for browser push events (works on all pages). */
export default function PushNotificationListener() {
  useEffect(() => {
    const handleNotification = (event: Event) => {
      const { title, body, data } = (event as CustomEvent).detail ?? {};
      if (title && body) {
        sendLocalNotification(title, body, data);
      }
    };

    window.addEventListener(PUSH_NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(PUSH_NOTIFICATION_EVENT, handleNotification);
  }, []);

  return null;
}
