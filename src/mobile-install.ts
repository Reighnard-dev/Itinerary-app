export type MobilePlatform = 'ios' | 'android' | 'huawei' | 'desktop';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

const DEFAULT_APK_URL =
  'https://github.com/Reighnard-dev/Itinerary-app/releases/latest/download/roam-android.apk';

export const LANDING_PATHS = ['/welcome', '/download'] as const;

export function isLandingPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (LANDING_PATHS as readonly string[]).includes(normalized);
}

export function detectPlatform(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0
): MobilePlatform {
  if (/huawei|harmonyos|openharmony|ohos|hmscore|emui|petal/i.test(ua)) return 'huawei';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayStandalone || iosStandalone;
}

export function isInAppBrowser(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): boolean {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Snapchat|WhatsApp/i.test(ua);
}

export function isLandingDismissed(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('roam.landing.dismissed') === '1';
  } catch {
    return false;
  }
}

export function dismissLandingForSession(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('roam.landing.dismissed', '1');
    }
  } catch {
    // Session storage may be restricted in private browsing.
  }
}

export function shouldShowMobileLanding(
  locationLike: { pathname: string; search: string; hash: string },
  _innerWidth: number,
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  options?: {
    dismissed?: boolean;
    standalone?: boolean;
    maxTouchPoints?: number;
  }
): boolean {
  const normalizedPath = locationLike.pathname.replace(/\/+$/, '') || '/';
  if (isLandingPath(normalizedPath)) return true;
  if (normalizedPath === '/account') return false;
  if (locationLike.search.includes('share=') || locationLike.hash.startsWith('#share=')) return false;

  const standalone = options?.standalone ?? isStandalonePwa();
  if (standalone) return false;

  const dismissed = options?.dismissed ?? isLandingDismissed();
  if (dismissed) return false;

  const platform = detectPlatform(ua, options?.maxTouchPoints);
  return platform !== 'desktop' || /\bmobi\b/i.test(ua);
}

export function getApkDownloadUrl(): string {
  const configured =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined)
      : undefined;
  return configured?.trim() || DEFAULT_APK_URL;
}
