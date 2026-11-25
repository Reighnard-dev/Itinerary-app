import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectPlatform,
  getDirectDownloadForPlatform,
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
