export type MobilePlatform = 'ios' | 'android' | 'huawei' | 'desktop';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

const DEFAULT_APK_URL = '/api/download-apk';
const DEFAULT_IOS_URL = '/api/download-ios';

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

const ANDROID_BROWSER_TOKENS =
  /SamsungBrowser|HuaweiBrowser|MiuiBrowser|HeyTapBrowser|OppoBrowser|VivoBrowser|UCBrowser|Firefox|FxiOS|OPR\/|Opera|EdgA\/|YaBrowser|Brave|Vivaldi|DuckDuckGo|Quark|MQQBrowser|QQBrowser|SogouMobileBrowser|PetalSearch/i;

const EXTERNAL_REFERRER_HOSTS = new Set([
  'l.facebook.com',
  'lm.facebook.com',
  'm.facebook.com',
  'l.instagram.com',
  't.co',
  'lnkd.in',
]);

function isRoamAndroidReferrer(referrer: string): boolean {
  return /^android-app:\/\/com\.roam\.itinerary(?:\/|$)/i.test(referrer.trim());
}

function isExternalThirdPartyReferrer(referrer: string): boolean {
  const trimmed = referrer.trim();
  if (!trimmed) return false;
  if (/^android-app:\/\//i.test(trimmed)) {
    return !isRoamAndroidReferrer(trimmed);
  }
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    return EXTERNAL_REFERRER_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function isInAppBrowser(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): boolean {
  return /FBAN|FBAV|FB_IAB|FBIOS|Orca-Android|\bMessenger\b|Instagram|Barcelona|Line\/|MicroMessenger|TikTok|BytedanceWebview|musical_ly|Snapchat|WhatsApp|\bTwitter|LinkedInApp|Pinterest|KAKAOTALK|\bViber\b|\bZalo\b|\bWeibo\b|baiduboxapp|\bQQ\/|\bGSA\//i.test(
    ua
  );
}

/**
 * Detects whether Roam is running inside the installed Android/Huawei APK
 * WebView (or a launched Android shortcut/PWA) rather than a mobile browser.
 */
export function isAndroidInstalledApp(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  referrer: string = typeof document !== 'undefined' ? document.referrer : ''
): boolean {
  if (/\bRoamAndroidApp\//i.test(ua)) return true;

  const platform = detectPlatform(ua);
  if (platform !== 'android' && platform !== 'huawei') return false;

  if (isRoamAndroidReferrer(referrer)) return true;

  const params = new URLSearchParams(search);
  const source = params.get('source');
  if (source === 'apk' || source === 'pwa') return true;

  if (isExternalThirdPartyReferrer(referrer)) return false;

  return /;\s*wv\)|;\s*wv\b/i.test(ua) && !isInAppBrowser(ua) && !ANDROID_BROWSER_TOKENS.test(ua);
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
    androidApp?: boolean;
    referrer?: string;
    maxTouchPoints?: number;
  }
): boolean {
  const normalizedPath = locationLike.pathname.replace(/\/+$/, '') || '/';
  if (isLandingPath(normalizedPath)) return true;
  if (normalizedPath === '/account') return false;
  if (locationLike.search.includes('share=') || locationLike.hash.startsWith('#share=')) return false;

  const standalone = options?.standalone ?? isStandalonePwa();
  if (standalone) return false;

  const androidApp =
    options?.androidApp ?? isAndroidInstalledApp(ua, locationLike.search, options?.referrer);
  if (androidApp) return false;

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

export function getIosDownloadUrl(): string {
  const configured =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_IOS_DOWNLOAD_URL as string | undefined)
      : undefined;
  return configured?.trim() || DEFAULT_IOS_URL;
}

export function getDirectDownloadForPlatform(platform: MobilePlatform): {
  url: string;
  filename: string;
  label: string;
} {
  if (platform === 'ios') {
    return {
      url: getIosDownloadUrl(),
      filename: 'Roam.mobileconfig',
      label: 'Download ROAM for iOS',
    };
  }
  if (platform === 'huawei') {
    return {
      url: getApkDownloadUrl(),
      filename: 'roam-android.apk',
      label: 'Download ROAM for Huawei',
    };
  }
  if (platform === 'android') {
    return {
      url: getApkDownloadUrl(),
      filename: 'roam-android.apk',
      label: 'Download ROAM APK',
    };
  }
  return {
    url: getApkDownloadUrl(),
    filename: 'roam-android.apk',
    label: 'Download ROAM App',
  };
}
