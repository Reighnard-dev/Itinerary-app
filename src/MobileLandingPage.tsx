import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  Copy,
  Download,
  Globe2,
  MapPin,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
} from 'lucide-react';
import { places as handpicked } from '../shared/catalog';
import type { Place } from '../shared/types';
import PlacePhoto, { PhotoCredit } from './PlacePhoto';
import {
  detectPlatform,
  getApkDownloadUrl,
  isInAppBrowser,
  type BeforeInstallPromptEvent,
  type MobilePlatform,
} from './mobile-install';

interface MobileLandingPageProps {
  installPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  placeCount: number;
  countryCount: number;
  cityCount: number;
  onLaunchApp: (selected?: { country: string; city: string }) => void;
  onClearInstallPrompt: () => void;
}

interface FeaturedCitySpec {
  country: string;
  city: string;
  flag: string;
  tagline: string;
  highlightIds: string[];
}

const FEATURED_CITIES: FeaturedCitySpec[] = [
  {
    country: 'Japan',
    city: 'Kyoto',
    flag: '🇯🇵',
    tagline: 'Vermilion gates, moss temples, and lantern-lit alleys',
    highlightIds: ['kyoto-1', 'kyoto-3', 'kyoto-6'],
  },
  {
    country: 'France',
    city: 'Paris',
    flag: '🇫🇷',
    tagline: 'Iconic boulevards, hidden arcades, and riverside picnics',
    highlightIds: ['paris-1', 'paris-3', 'paris-4'],
  },
  {
    country: 'Japan',
    city: 'Tokyo',
    flag: '🇯🇵',
    tagline: 'Neon crossings, old-town craft streets, and leafy ravines',
    highlightIds: ['tokyo-1', 'tokyo-3', 'tokyo-4'],
  },
  {
    country: 'Thailand',
    city: 'Bangkok',
    flag: '🇹🇭',
    tagline: 'Riverside temples, shophouse cafés, and green island bends',
    highlightIds: ['bangkok-1', 'bangkok-3', 'bangkok-4'],
  },
];

interface DemoStop {
  id: string;
  time: string;
  vibe: string;
  title: string;
  duration: string;
  minutes: number;
  kind: 'iconic' | 'hidden';
}

const DEMO_STOPS: DemoStop[] = [
  {
    id: 'morning-iconic',
    time: '08:30',
    vibe: 'Early Iconic Landmark',
    title: 'Fushimi Inari upper ridge trail',
    duration: '2 hrs',
    minutes: 120,
    kind: 'iconic',
  },
  {
    id: 'midday-food',
    time: '12:00',
    vibe: 'Local Market Bites',
    title: 'Nishiki Market tea & sweets stroll',
    duration: '1.5 hrs',
    minutes: 90,
    kind: 'iconic',
  },
  {
    id: 'afternoon-hidden',
    time: '15:00',
    vibe: 'Quiet Hidden Gem',
    title: 'Otagi Nenbutsu-ji moss statues',
    duration: '1.5 hrs',
    minutes: 90,
    kind: 'hidden',
  },
  {
    id: 'evening-walk',
    time: '18:30',
    vibe: 'Golden Hour Detour',
    title: 'Philosopher’s Path canal cafés',
    duration: '1 hr',
    minutes: 60,
    kind: 'hidden',
  },
];

type InstallTab = 'android' | 'huawei' | 'ios';

function initialTabFor(platform: MobilePlatform): InstallTab {
  if (platform === 'ios') return 'ios';
  if (platform === 'huawei') return 'huawei';
  return 'android';
}

export default function MobileLandingPage({
  installPrompt,
  isInstalled,
  placeCount,
  countryCount,
  cityCount,
  onLaunchApp,
  onClearInstallPrompt,
}: MobileLandingPageProps) {
  const detectedPlatform = useMemo(() => detectPlatform(), []);
  const inAppBrowser = useMemo(() => isInAppBrowser(), []);
  const apkUrl = useMemo(() => getApkDownloadUrl(), []);

  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [selectedDemoIds, setSelectedDemoIds] = useState<string[]>([
    'morning-iconic',
    'afternoon-hidden',
  ]);
  const [activeTab, setActiveTab] = useState<InstallTab>(() => initialTabFor(detectedPlatform));
  const [installFeedback, setInstallFeedback] = useState('');
  const [showApkGuide, setShowApkGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const installHubRef = useRef<HTMLElement>(null);

  const activeCity = FEATURED_CITIES[selectedCityIndex] || FEATURED_CITIES[0];
  const cityPlaces = useMemo(() => {
    const matching = handpicked.filter(
      (p) => p.country === activeCity.country && p.city === activeCity.city
    );
    return matching;
  }, [activeCity]);

  const previewPlace: Place = useMemo(() => {
    const firstHighlighted = activeCity.highlightIds
      .map((id) => cityPlaces.find((p) => p.id === id))
      .find((p): p is Place => Boolean(p));
    return firstHighlighted || cityPlaces[0] || handpicked[0];
  }, [activeCity, cityPlaces]);

  const iconicCount = cityPlaces.filter((p) => p.kind === 'iconic').length;
  const hiddenCount = cityPlaces.filter((p) => p.kind === 'hidden').length;

  const activeDemoStops = DEMO_STOPS.filter((s) => selectedDemoIds.includes(s.id));
  const totalDemoHours = (
    activeDemoStops.reduce((sum, s) => sum + s.minutes, 0) / 60
  ).toFixed(1).replace(/\.0$/, '');

  const toggleDemoStop = (id: string) => {
    setSelectedDemoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const scrollToInstallHub = () => {
    installHubRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleNativePwaInstall = async () => {
    if (isInstalled) {
      setInstallFeedback('Roam is already installed on your device!');
      return;
    }
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallFeedback('Installing Roam onto your home screen…');
        } else {
          setInstallFeedback('Install dismissed — you can tap Install anytime or grab the APK below.');
        }
        onClearInstallPrompt();
      } catch {
        setInstallFeedback('Open your browser menu (⋮) and tap “Install app” or “Add to Home screen”.');
      }
      return;
    }
    setInstallFeedback(
      activeTab === 'huawei'
        ? 'In Huawei Browser, tap the menu icon (⋮ or ☰) and choose “Add to Home screen”, or download the GMS-free APK below.'
        : 'In Chrome or Edge, tap the ⋮ menu at the top right and select “Install app” or “Add to Home screen”.'
    );
  };

  const handleCopyUrl = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      setInstallFeedback(`Copy this link into Safari: ${shareUrl}`);
    }
  };

  return (
    <div className="ml-shell" data-testid="roam-mobile-landing">
      <section className="ml-hero" aria-label="Welcome to Roam">
        <div className="ml-hero-top">
          <span className="ml-pill">
            <Smartphone size={13} aria-hidden="true" />
            iOS · Android · Huawei Ready
          </span>
          <button
            type="button"
            className="ml-skip-btn"
            onClick={() => onLaunchApp()}
          >
            Open Web App <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="ml-hero-copy">
          <div className="ml-eyebrow">
            <span className="ml-line" aria-hidden="true" />
            FOR THE WANDERERS. AND THE WONDERERS.
          </div>
          <h1>
            Meet <span>roam.</span>
            <br />
            Your next somewhere, in your pocket.
          </h1>
          <p>
            Discover {placeCount.toLocaleString()}+ curated landmarks and hidden gems across{' '}
            {countryCount} countries and {cityCount.toLocaleString()} cities. Build day-by-day
            itineraries in seconds—right on your phone.
          </p>

          <div className="ml-hero-ctas">
            <button
              type="button"
              className="btn btn-yellow ml-cta-primary"
              onClick={scrollToInstallHub}
            >
              <Download size={17} aria-hidden="true" />
              Get the App (iOS · Android · Huawei)
            </button>
            <button
              type="button"
              className="btn btn-dark ml-cta-secondary"
              onClick={() => onLaunchApp({ country: activeCity.country, city: activeCity.city })}
            >
              <Compass size={17} aria-hidden="true" />
              Try Web App Now
            </button>
          </div>
        </div>
      </section>

      <section className="ml-section ml-preview-section" aria-label="Interactive destination preview">
        <div className="ml-section-head">
          <span className="ml-step-tag">01 · EXPLORE LIVE</span>
          <h2>Tap a city to preview what’s inside</h2>
          <p>Real places, honest durations, and verified photography ready before you pack.</p>
        </div>

        <div className="ml-city-pills" role="tablist" aria-label="Featured destinations">
          {FEATURED_CITIES.map((item, idx) => (
            <button
              key={item.city}
              type="button"
              role="tab"
              aria-selected={selectedCityIndex === idx}
              className={`ml-city-pill ${selectedCityIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedCityIndex(idx)}
            >
              <span>{item.flag}</span>
              {item.city}
            </button>
          ))}
        </div>

        <article className="ml-city-card">
          <div className="ml-city-media">
            <PlacePhoto place={previewPlace} />
            <span className="ml-media-badge">
              <Star size={12} fill="currentColor" aria-hidden="true" />
              {previewPlace.kind === 'hidden' ? 'Hidden gem' : 'Iconic spotlight'}
            </span>
            <PhotoCredit place={previewPlace} />
          </div>
          <div className="ml-city-body">
            <div className="ml-city-meta">
              <span>
                <MapPin size={13} aria-hidden="true" /> {activeCity.city}, {activeCity.country}
              </span>
              <span className="ml-counts">
                {iconicCount} iconic · {hiddenCount} hidden gems
              </span>
            </div>
            <h3>{previewPlace.name}</h3>
            <p>{previewPlace.description}</p>
            <div className="ml-city-highlights">
              {cityPlaces.slice(0, 3).map((p) => (
                <span key={p.id} className="ml-mini-chip">
                  {p.kind === 'hidden' ? <Sparkles size={11} /> : <Star size={11} />}
                  {p.name}
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-yellow full"
              onClick={() => onLaunchApp({ country: activeCity.country, city: activeCity.city })}
            >
              Start planning {activeCity.city} <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>

      <section className="ml-section ml-playground-section" aria-label="Interactive day builder demo">
        <div className="ml-section-head">
          <span className="ml-step-tag">02 · INTERACTIVE DEMO</span>
          <h2>Tap to craft a sample Kyoto day</h2>
          <p>Toggle stops below to see how Roam turns scattered ideas into an effortless timeline.</p>
        </div>

        <div className="ml-demo-chips" role="group" aria-label="Sample itinerary stops">
          {DEMO_STOPS.map((stop) => {
            const active = selectedDemoIds.includes(stop.id);
            return (
              <button
                key={stop.id}
                type="button"
                aria-pressed={active}
                className={`ml-demo-chip ${active ? 'active' : ''}`}
                onClick={() => toggleDemoStop(stop.id)}
              >
                <span className="ml-demo-chip-icon">
                  {active ? <Check size={14} /> : <Plus size={14} />}
                </span>
                <span>
                  <strong>{stop.vibe}</strong>
                  <small>
                    {stop.time} · {stop.duration}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-timeline-card">
          <div className="ml-timeline-head">
            <div>
              <span className="eyebrow">DAY 01 PREVIEW · KYOTO</span>
              <strong>
                {activeDemoStops.length} {activeDemoStops.length === 1 ? 'stop' : 'stops'} scheduled
              </strong>
            </div>
            <span className="ml-duration-pill">
              <Clock3 size={13} aria-hidden="true" /> ~{totalDemoHours} hrs
            </span>
          </div>

          {activeDemoStops.length > 0 ? (
            <ol className="ml-timeline-list">
              {activeDemoStops.map((stop) => (
                <li key={stop.id} className="ml-timeline-item">
                  <span className="ml-time-col">{stop.time}</span>
                  <div className="ml-stop-col">
                    <strong>{stop.title}</strong>
                    <span>
                      {stop.kind === 'hidden' ? 'Hidden gem' : 'Iconic spot'} · {stop.duration}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ml-timeline-empty">
              Tap one or more vibes above to watch your day come together.
            </p>
          )}
        </div>
      </section>

      <section
        id="download-roam"
        ref={installHubRef}
        className="ml-section ml-install-section"
        aria-label="Download and install Roam"
      >
        <div className="ml-section-head">
          <span className="ml-step-tag">03 · GET ROAM ON YOUR DEVICE</span>
          <h2>Install on Android, Huawei, or iOS</h2>
          <p>
            No account required to browse. Install directly on any phone—including Huawei devices
            without Google Play Services.
          </p>
        </div>

        <div className="ml-platform-tabs" role="tablist" aria-label="Choose your device platform">
          {([
            ['android', 'Android'],
            ['huawei', 'Huawei'],
            ['ios', 'iPhone / iPad'],
          ] as const).map(([key, label]) => {
            const isDetected =
              (key === 'android' && detectedPlatform === 'android') ||
              (key === 'huawei' && detectedPlatform === 'huawei') ||
              (key === 'ios' && detectedPlatform === 'ios');
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                className={`ml-platform-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(key);
                  setInstallFeedback('');
                }}
              >
                {label}
                {isDetected && <span className="ml-detected-dot" title="Detected device">You</span>}
              </button>
            );
          })}
        </div>

        <div className="ml-install-panel" role="tabpanel">
          {activeTab === 'android' && (
            <div className="ml-platform-body">
              <div className="ml-compat-badge">
                <ShieldCheck size={15} aria-hidden="true" />
                Android 8.0+ · 1-Tap App Install or Direct APK
              </div>
              <h3>Install Roam on Android</h3>
              <p>
                Install instantly via your browser for automatic updates, or download the standalone{' '}
                <code>roam-android.apk</code> package directly.
              </p>

              <div className="ml-install-actions">
                <button
                  type="button"
                  className="btn btn-yellow full"
                  onClick={handleNativePwaInstall}
                >
                  <Smartphone size={17} aria-hidden="true" />
                  {isInstalled
                    ? 'Roam Installed on Home Screen'
                    : installPrompt
                      ? '1-Tap Install Roam App'
                      : 'Install via Browser (PWA)'}
                </button>
                <a
                  href={apkUrl}
                  download="roam-android.apk"
                  className="btn btn-dark full"
                  rel="noreferrer"
                >
                  <Download size={17} aria-hidden="true" />
                  Download Android APK (roam-android.apk)
                </a>
              </div>

              <button
                type="button"
                className="ml-guide-toggle"
                onClick={() => setShowApkGuide((v) => !v)}
              >
                {showApkGuide ? 'Hide APK install steps ▲' : 'How to install the APK file ▼'}
              </button>

              {showApkGuide && (
                <ol className="ml-steps-list">
                  <li>Tap <strong>Download Android APK</strong> above to save <code>roam-android.apk</code>.</li>
                  <li>Open the downloaded file from your notification shade or Files app.</li>
                  <li>If prompted, allow <strong>Install unknown apps</strong> for your browser, then tap <strong>Install</strong>.</li>
                </ol>
              )}
            </div>
          )}

          {activeTab === 'huawei' && (
            <div className="ml-platform-body">
              <div className="ml-compat-badge huawei">
                <ShieldCheck size={15} aria-hidden="true" />
                HarmonyOS &amp; EMUI Compatible · Zero Google Play Services
              </div>
              <h3>Get Roam on Huawei Devices</h3>
              <p>
                Roam is built completely free of Google Mobile Services (GMS), so it runs smoothly on
                Huawei Mate, Pura, Nova, and Honor devices via direct APK or Huawei Browser.
              </p>

              <div className="ml-install-actions">
                <a
                  href={apkUrl}
                  download="roam-android.apk"
                  className="btn btn-yellow full"
                  rel="noreferrer"
                >
                  <Download size={17} aria-hidden="true" />
                  Download Huawei APK (GMS-Free)
                </a>
                <button
                  type="button"
                  className="btn btn-outline full"
                  onClick={handleNativePwaInstall}
                >
                  <Globe2 size={17} aria-hidden="true" />
                  Install via Huawei Browser (Add to Home Screen)
                </button>
              </div>

              <ol className="ml-steps-list">
                <li>Tap <strong>Download Huawei APK</strong> and open <code>roam-android.apk</code> when finished.</li>
                <li>When HarmonyOS / EMUI prompts, tap <strong>Allow</strong> and complete the security check.</li>
                <li>Prefer zero downloads? Tap <strong>⋮ → Add to Home screen</strong> inside Huawei Browser.</li>
              </ol>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="ml-platform-body">
              <div className="ml-compat-badge ios">
                <Sparkles size={15} aria-hidden="true" />
                iPhone &amp; iPad · Full-Screen Standalone App via Safari
              </div>
              <h3>Add Roam to Your iPhone or iPad</h3>
              <p>
                Apple installs web apps directly from Safari—no App Store download or computer
                needed. Roam launches full-screen with your saved trips right on your Home Screen.
              </p>

              {inAppBrowser && (
                <div className="ml-inapp-warning" role="note">
                  <strong>Opened inside an in-app browser</strong>
                  <p>
                    Tap the <strong>⋯</strong> or <strong>Safari</strong> icon to open in Safari, or
                    copy the link below first.
                  </p>
                  <button type="button" className="btn btn-dark" onClick={handleCopyUrl}>
                    <Copy size={15} aria-hidden="true" />
                    {copiedLink ? 'Link Copied!' : 'Copy Roam Link for Safari'}
                  </button>
                </div>
              )}

              <ol className="ml-steps-list">
                <li>
                  Open this page in <strong>Safari</strong> and tap the{' '}
                  <Share2 size={14} className="ml-inline-icon" aria-hidden="true" />{' '}
                  <strong>Share</strong> button at the bottom bar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong>—Roam appears as an app icon on your Home Screen.
                </li>
              </ol>

              <div className="ml-install-actions">
                <button
                  type="button"
                  className="btn btn-yellow full"
                  onClick={() => onLaunchApp({ country: activeCity.country, city: activeCity.city })}
                >
                  <Compass size={17} aria-hidden="true" />
                  Launch Roam in Safari Now
                </button>
                {!inAppBrowser && (
                  <button type="button" className="btn btn-outline full" onClick={handleCopyUrl}>
                    <Copy size={15} aria-hidden="true" />
                    {copiedLink ? 'Link Copied!' : 'Copy Link to Share'}
                  </button>
                )}
              </div>
            </div>
          )}

          {installFeedback && (
            <p className="ml-install-feedback" role="status">
              {installFeedback}
            </p>
          )}
        </div>
      </section>

      <section className="ml-section ml-features-strip" aria-label="Why travelers use Roam">
        <div className="ml-feature-card">
          <Compass size={20} aria-hidden="true" />
          <h3>Curated &amp; local spots</h3>
          <p>Iconic landmarks paired with quieter corners across {countryCount} countries.</p>
        </div>
        <div className="ml-feature-card">
          <Sparkles size={20} aria-hidden="true" />
          <h3>One-tap day builder</h3>
          <p>Auto-suggest stops, set visit times, and reorder your day effortlessly.</p>
        </div>
        <div className="ml-feature-card">
          <Share2 size={20} aria-hidden="true" />
          <h3>Instant trip sharing</h3>
          <p>Send any itinerary link to friends so they can view or clone it in one tap.</p>
        </div>
      </section>

      <div className="ml-sticky-bar">
        <button type="button" className="btn btn-outline" onClick={scrollToInstallHub}>
          <Download size={15} aria-hidden="true" /> Get App
        </button>
        <button
          type="button"
          className="btn btn-yellow"
          onClick={() => onLaunchApp({ country: activeCity.country, city: activeCity.city })}
        >
          Open Web App <ArrowRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
