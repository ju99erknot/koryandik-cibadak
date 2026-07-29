/**
 * Typed contract for the custom `window` events used across the portal.
 *
 * Declaring the payloads here means both the dispatcher and the listener are
 * checked against the same shape, so a renamed or missing `detail` field is a
 * compile error instead of a runtime `undefined`.
 */

export interface NotifyEventDetail {
  message: string;
  icon?: string;
}

export interface CountdownEventDetail {
  message: string;
  targetDateStr: string;
}

export interface UploadStartEventDetail {
  fileName: string;
}

export interface UploadProgressEventDetail {
  progress: number;
}

export interface UploadCompleteEventDetail {
  success: boolean;
  message: string;
}

export interface WaSimulatedEventDetail {
  schoolName: string;
  phone: string;
  message: string;
  timestamp: string;
}

export interface AppEventMap {
  koryandik_wa_simulated: CustomEvent<WaSimulatedEventDetail>;
  'koryandik-notify': CustomEvent<NotifyEventDetail>;
  'koryandik-countdown': CustomEvent<CountdownEventDetail>;
  'koryandik-countdown-hide': CustomEvent<undefined>;
  'koryandik-upload-start': CustomEvent<UploadStartEventDetail>;
  'koryandik-upload-progress': CustomEvent<UploadProgressEventDetail>;
  'koryandik-upload-complete': CustomEvent<UploadCompleteEventDetail>;
  'koryandik-theme-change': CustomEvent<string>;
}

declare global {
  // Interface merging into the DOM's WindowEventMap requires an extends-only
  // declaration, which is exactly what no-empty-object-type flags.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface WindowEventMap extends AppEventMap {}
}

export {};
