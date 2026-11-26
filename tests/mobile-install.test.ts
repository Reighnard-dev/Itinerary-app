import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPlatform,
  getDirectDownloadForPlatform,
  isAndroidInstalledApp,
  isInAppBrowser,
  isLandingPath,
  shouldShowMobileLanding,
} from '../src/mobile-install';

test('detectPlatform identifies Huawei before generic Android', () => {
  assert.equal(
    detectPlatform('Mozilla/5.0 (Linux; Android 12; HUAWEI NOH-NX9) AppleWebKit/537.36 HuaweiBrowser/14.0'),
    'huawei'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (Linux; HarmonyOS 4.0; ALN-AL00) AppleWebKit/537.36'),
    'huawei'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (Linux; Android 10; EMUI 10; ELS-NX9) PetalSearch'),
    'huawei'
  );
});

test('detectPlatform identifies iOS including iPadOS desktop UA with touch points', () => {
  assert.equal(
    detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1'),
    'ios'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15'),
    'ios'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5),
    'ios'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0),
    'desktop'
  );
});

test('detectPlatform identifies Android and Desktop', () => {
  assert.equal(
    detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36'),
    'android'
  );
  assert.equal(
    detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'),
    'desktop'
  );
});

test('isInAppBrowser detects embedded social browsers vs Safari/Chrome', () => {
  assert.equal(
    isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Mobile/15E148 Instagram 330.0'),
    true
  );
  assert.equal(
    isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) [FBAN/MessengerForiOS;FBAV/450.0]'),
    true
  );
  assert.equal(
    isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Version/17.4 Mobile/15E148 Safari/604.1'),
    false
  );
});

test('isLandingPath recognizes /welcome and /download', () => {
  assert.equal(isLandingPath('/welcome'), true);
  assert.equal(isLandingPath('/download/'), true);
  assert.equal(isLandingPath('/account'), false);
  assert.equal(isLandingPath('/'), false);
});

test('shouldShowMobileLanding handles mobile, desktop, dismissed, standalone, share, and explicit paths', () => {
  const desktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0';
  const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Mobile/15E148 Safari/604.1';

  // Mobile first visit shows landing
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, mobileUa, {
      dismissed: false,
      standalone: false,
    }),
    true
  );

  // Desktop wide viewport skips landing
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 1280, desktopUa, {
      dismissed: false,
      standalone: false,
    }),
    false
  );

  // Explicit /welcome or /download always shows landing even on desktop or after dismissal
  assert.equal(
    shouldShowMobileLanding({ pathname: '/download', search: '', hash: '' }, 1280, desktopUa, {
      dismissed: true,
      standalone: true,
    }),
    true
  );

  // Dismissed mobile session skips landing on /
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, mobileUa, {
      dismissed: true,
      standalone: false,
    }),
    false
  );

  // Standalone installed PWA skips landing on /
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, mobileUa, {
      dismissed: false,
      standalone: true,
    }),
    false
  );

  // Shared trip URLs and /account bypass landing
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '?share=abc', hash: '' }, 390, mobileUa, {
      dismissed: false,
      standalone: false,
    }),
    false
  );
  assert.equal(
    shouldShowMobileLanding({ pathname: '/account', search: '', hash: '' }, 390, mobileUa, {
      dismissed: false,
      standalone: false,
    }),
    false
  );
});

test('getDirectDownloadForPlatform returns direct APK for Android/Huawei and mobileconfig for iOS', () => {
  assert.deepEqual(getDirectDownloadForPlatform('android'), {
    url: '/api/download-apk',
    filename: 'roam-android.apk',
    label: 'Download ROAM APK',
  });
  assert.deepEqual(getDirectDownloadForPlatform('huawei'), {
    url: '/api/download-apk',
    filename: 'roam-android.apk',
    label: 'Download ROAM for Huawei',
  });
  assert.deepEqual(getDirectDownloadForPlatform('ios'), {
    url: '/api/download-ios',
    filename: 'Roam.mobileconfig',
    label: 'Download ROAM for iOS',
  });
});

test('isAndroidInstalledApp detects Roam Android APK WebViews and app launch markers', () => {
  const pixelWvUa =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36';
  const oppoWvUa =
    'Mozilla/5.0 (Linux; Android 13; CPH2451 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.188 Mobile Safari/537.36';
  const samsungWvUa =
    'Mozilla/5.0 (Linux; Android 14; SM-S928B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36';
  const huaweiWvUa =
    'Mozilla/5.0 (Linux; Android 12; HarmonyOS; HUAWEI NOH-NX9; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Mobile Safari/537.36';
  const brandedApkUa = `${pixelWvUa} RoamAndroidApp/1.0.0`;
  const androidChromeUa =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

  assert.equal(isAndroidInstalledApp(pixelWvUa, '', ''), true);
  assert.equal(isAndroidInstalledApp(oppoWvUa, '', ''), true);
  assert.equal(isAndroidInstalledApp(samsungWvUa, '', ''), true);
  assert.equal(isAndroidInstalledApp(huaweiWvUa, '', ''), true);
  assert.equal(isAndroidInstalledApp(brandedApkUa, '', ''), true);
  assert.equal(isAndroidInstalledApp(androidChromeUa, '?source=pwa', ''), true);
  assert.equal(isAndroidInstalledApp(androidChromeUa, '?source=apk', ''), true);
  assert.equal(
    isAndroidInstalledApp(androidChromeUa, '', 'android-app://com.roam.itinerary/'),
    true
  );

  for (const appUa of [pixelWvUa, oppoWvUa, samsungWvUa, huaweiWvUa, brandedApkUa]) {
    assert.equal(
      shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, appUa, {
        dismissed: false,
        standalone: false,
        referrer: '',
      }),
      false
    );
    assert.equal(
      shouldShowMobileLanding({ pathname: '/download', search: '', hash: '' }, 390, appUa, {
        dismissed: false,
        standalone: false,
        referrer: '',
      }),
      true
    );
  }

  assert.equal(
    shouldShowMobileLanding(
      { pathname: '/', search: '?source=pwa', hash: '' },
      390,
      androidChromeUa,
      { dismissed: false, standalone: false, referrer: '' }
    ),
    false
  );
  assert.equal(
    shouldShowMobileLanding(
      { pathname: '/', search: '?source=apk', hash: '' },
      390,
      androidChromeUa,
      { dismissed: false, standalone: false, referrer: '' }
    ),
    false
  );
});

test('isAndroidInstalledApp returns false for Android browsers, social in-app WebViews, and external referrers', () => {
  const androidBrowsers = [
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; CPH2451) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.0.0 Mobile Safari/537.36 HeyTapBrowser/45.10.2.1',
    'Mozilla/5.0 (Linux; Android 13; 2210132G) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/112.0.0.0 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.2.0',
    'Mozilla/5.0 (Linux; Android 12; HUAWEI NOH-NX9) AppleWebKit/537.36 HuaweiBrowser/14.0.5.301 Mobile Safari/537.36',
    'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 EdgA/128.0.2739.63',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile DuckDuckGo/5 Safari/537.36',
  ];

  for (const ua of androidBrowsers) {
    assert.equal(isAndroidInstalledApp(ua, '', ''), false, `Expected browser UA not to match: ${ua}`);
    assert.equal(
      shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, ua, {
        dismissed: false,
        standalone: false,
        referrer: '',
      }),
      true,
      `Expected landing page for browser UA: ${ua}`
    );
  }

  const socialInAppUas = [
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/470.0.0.24.109;]',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/478.0.0.41.106;]',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 Instagram 345.0.0.34.96',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 Line/14.12.0/IAB',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.50',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36 GSA/15.32.37.28.arm64',
  ];

  for (const ua of socialInAppUas) {
    assert.equal(isInAppBrowser(ua), true, `Expected in-app browser match: ${ua}`);
    assert.equal(isAndroidInstalledApp(ua, '', ''), false, `Expected social UA not to match: ${ua}`);
    assert.equal(
      shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, ua, {
        dismissed: false,
        standalone: false,
        referrer: '',
      }),
      true,
      `Expected landing page for social UA: ${ua}`
    );
  }

  const genericWvUa =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36';
  assert.equal(isAndroidInstalledApp(genericWvUa, '', 'https://l.facebook.com/'), false);
  assert.equal(
    isAndroidInstalledApp(genericWvUa, '', 'android-app://com.facebook.katana/'),
    false
  );
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, genericWvUa, {
      dismissed: false,
      standalone: false,
      referrer: 'https://l.facebook.com/',
    }),
    true
  );
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, genericWvUa, {
      dismissed: false,
      standalone: false,
      referrer: 'android-app://com.facebook.orca/',
    }),
    true
  );
});

test('iOS Safari and iOS standalone WebClip behavior remain unchanged', () => {
  const iosSafariUa =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

  assert.equal(isAndroidInstalledApp(iosSafariUa, '', ''), false);
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, iosSafariUa, {
      dismissed: false,
      standalone: false,
      referrer: '',
    }),
    true
  );
  assert.equal(
    shouldShowMobileLanding({ pathname: '/', search: '', hash: '' }, 390, iosSafariUa, {
      dismissed: false,
      standalone: true,
      referrer: '',
    }),
    false
  );
});
