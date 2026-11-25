import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Clock3,
  Compass,
  Copy,
  Download,
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
  getDirectDownloadForPlatform,
  getIosDownloadUrl,
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
  const iosUrl = useMemo(() => getIosDownloadUrl(), []);
  const primaryDownload = useMemo(
    () => getDirectDownloadForPlatform(detectedPlatform),
    [detectedPlatform]
  );

  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [selectedDemoIds, setSelectedDemoIds] = useState<string[]>([
    'morning-iconic',
    'afternoon-hidden',
  ]);
  const [activeTab, setActiveTab] = useState<InstallTab>(() => initialTabFor(detectedPlatform));
  const [installFeedback, setInstallFeedback] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

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

  const notifyDownload = (filename: string) => {
    setInstallFeedback(`Downloading ${filename}…`);
  };

  const handleNativePwaInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallFeedback('Installing Roam onto your home screen…');
      }
      onClearInstallPrompt();
    } catch {
      // Fall back silently; direct APK download remains primary.
    }
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
            <a
              href={primaryDownload.url}
              download={primaryDownload.filename}
              className="btn btn-yellow ml-cta-primary"
              onClick={() => notifyDownload(primaryDownload.filename)}
            >
              <Download size={17} aria-hidden="true" />
              {primaryDownload.label}
            </a>
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
        className="ml-section ml-install-section"
        aria-label="Download and install Roam"
      >
        <div className="ml-section-head">
          <span className="ml-step-tag">03 · DIRECT DOWNLOAD</span>
          <h2>Download Roam for Android, Huawei, or iOS</h2>
          <p>
            One tap starts your download immediately—including GMS-free APK for Huawei devices and
            direct profile install for iPhone &amp; iPad.
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
                Android 8.0+ · Direct APK Download
              </div>
              <h3>Download Roam for Android</h3>
              <p>
                Tap below to automatically download <code>roam-android.apk</code> right onto your
                device.
              </p>

              <div className="ml-install-actions">
                <a
                  href={apkUrl}
                  download="roam-android.apk"
                  className="btn btn-yellow full"
                  onClick={() => notifyDownload('roam-android.apk')}
                >
                  <Download size={17} aria-hidden="true" />
                  Download ROAM APK (roam-android.apk)
                </a>
                {installPrompt && !isInstalled && (
                  <button
                    type="button"
                    className="btn btn-outline full"
                    onClick={handleNativePwaInstall}
                  >
                    <Smartphone size={17} aria-hidden="true" />
                    1-Tap Install Instant App
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'huawei' && (
            <div className="ml-platform-body">
              <div className="ml-compat-badge huawei">
                <ShieldCheck size={15} aria-hidden="true" />
                HarmonyOS &amp; EMUI Compatible · Zero Google Play Services
              </div>
              <h3>Download Roam for Huawei</h3>
              <p>
                GMS-free APK built for Huawei Mate, Pura, Nova, and Honor devices—tap below to
                download immediately.
              </p>

              <div className="ml-install-actions">
                <a
                  href={apkUrl}
                  download="roam-android.apk"
                  className="btn btn-yellow full"
                  onClick={() => notifyDownload('roam-android.apk')}
                >
                  <Download size={17} aria-hidden="true" />
                  Download ROAM for Huawei (GMS-Free APK)
                </a>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="ml-platform-body">
              <div className="ml-compat-badge ios">
                <Sparkles size={15} aria-hidden="true" />
                iPhone &amp; iPad · Direct Home Screen App Profile
              </div>
              <h3>Download Roam for iPhone &amp; iPad</h3>
              <p>
                Tap below to download <code>Roam.mobileconfig</code> directly, then approve the
                profile prompt in iOS Settings to add the full-screen Roam app icon.
              </p>

              {inAppBrowser && (
                <div className="ml-inapp-warning" role="note">
                  <strong>Opened inside an in-app browser</strong>
                  <p>
                    Tap the <strong>⋯</strong> or <strong>Safari</strong> icon to download in
                    Safari, or copy the link below.
                  </p>
                  <button type="button" className="btn btn-dark" onClick={handleCopyUrl}>
                    <Copy size={15} aria-hidden="true" />
                    {copiedLink ? 'Link Copied!' : 'Copy Roam Link for Safari'}
                  </button>
                </div>
              )}

              <div className="ml-install-actions">
                <a
                  href={iosUrl}
                  download="Roam.mobileconfig"
                  className="btn btn-yellow full"
                  onClick={() => notifyDownload('Roam.mobileconfig')}
                >
                  <Download size={17} aria-hidden="true" />
                  Download ROAM for iPhone / iPad
                </a>
                {!inAppBrowser && (
                  <button
                    type="button"
                    className="btn btn-outline full"
                    onClick={() => onLaunchApp({ country: activeCity.country, city: activeCity.city })}
                  >
                    <Compass size={17} aria-hidden="true" />
                    Launch Web App Now
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
        <a
          href={primaryDownload.url}
          download={primaryDownload.filename}
          className="btn btn-outline"
          onClick={() => notifyDownload(primaryDownload.filename)}
        >
          <Download size={15} aria-hidden="true" /> Download App
        </a>
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
