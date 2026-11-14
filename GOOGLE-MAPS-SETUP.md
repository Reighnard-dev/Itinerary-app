# Google Maps Platform Setup & Hybrid Routing Guide

This document explains how Roam's hybrid in-app directions feature connects to Google Maps Platform, the required environment variables, security and restriction practices, and how graceful degradation operates when no API keys are provided.

---

## 1. Overview & Architecture

Roam implements a **hybrid in-app routing preview** designed to keep travelers within the Roam experience for route calculation and map previews, while seamlessly providing Google Maps as a direct fallback for real-time transit departures, disruptions, and live navigation.

```
+-------------------------------------------------------------------------+
|                               Client (Browser)                          |
|  - In-app Directions Panel                                             |
|  - Travel mode tabs: Walking, Driving, Public transit                   |
|  - Origin: GPS geolocation (on demand), saved hotel, or custom address   |
|  - Interactive Map: Google Maps JS API (or interactive OSM fallback)    |
|  - Step-by-step turn guidance & transit breakdown                       |
|  - Prominent "Open in Google Maps" secondary fallback button            |
+------------------------------------+------------------------------------+
                                     |
                          POST /api/routes
                                     |
+------------------------------------v------------------------------------+
|                           Express Backend Server                        |
|  - Reads GOOGLE_ROUTES_API_KEY from secure server environment           |
|  - Validates and sanitizes origin/destination coordinates               |
|  - Calls Google Routes API v2 (directions/v2:computeRoutes)             |
|  - Extracts transit lines, departure/arrival stops, times, and fares    |
|  - Falls back to safe preview routes when no API key is configured      |
|  - Never fabricates public transit schedules, lines, or fares           |
+-------------------------------------------------------------------------+
```

---

## 2. Google Cloud APIs Required

To enable full live routing with Google Maps Platform, enable the following APIs in your [Google Cloud Console](https://console.cloud.google.com/):

1. **Routes API** (`routes.googleapis.com`):
   - Current, modern replacement for legacy Directions API.
   - Used server-side via `POST https://routes.googleapis.com/directions/v2:computeRoutes`.
   - Supports walking, driving, and public transit routing with detailed transit line information, vehicle types, departure/arrival stops, and estimated transit fares.
2. **Maps JavaScript API** (`maps.googleapis.com`):
   - Used client-side to render interactive vector/raster maps, plot polylines, and render custom Roam markers.
   - Loaded dynamically in the browser only when `VITE_GOOGLE_MAPS_API_KEY` is provided.

*(Optional)* **Places API (New)** (`places.googleapis.com`):
   - Useful if you wish to add autocomplete for custom address inputs in the future.

---

## 3. Environment Variables

Configure these variables in your `.env` or `.env.local` file:

```env
# Server-side key for Google Routes API (REST API)
# Kept private on the server; never exposed to browser bundles.
GOOGLE_ROUTES_API_KEY=your_server_routes_api_key_here

# Client-side key for Google Maps JavaScript API
# Exposed to the browser via Vite; MUST be restricted by HTTP referrer domain.
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_api_key_here
```

> **Note:** If `GOOGLE_ROUTES_API_KEY` is not set, the server will also check `GOOGLE_MAPS_API_KEY` if you use a single API key.

---

## 4. API Key Security & Restrictions

Following Google Maps Platform security best practices:

### A. Client-Side Key (`VITE_GOOGLE_MAPS_API_KEY`)
- **Application Restriction:** Set to **Websites (HTTP referrers)**.
- **Allowed Referrers:**
  - `http://localhost:5173/*` (local development)
  - `http://localhost:3001/*`
  - `https://your-production-domain.com/*`
- **API Restriction:** Restrict this key strictly to **Maps JavaScript API**.

### B. Server-Side Key (`GOOGLE_ROUTES_API_KEY`)
- **Application Restriction:** Set to **IP addresses** (your production server IPs) or leave unrestricted by domain if using container/serverless environments.
- **API Restriction:** Restrict this key strictly to **Routes API**.
- **Never prefix with `VITE_`:** Keeping the prefix omitted ensures Vite does not bundle the server key into client-side JavaScript.

---

## 5. Public-Transit Policies & Limitations

Roam adheres strictly to honest, non-fabricated transit guidance:

1. **Never Invent Schedules:** When public transit is selected, Roam **never** invents bus route numbers, train timetables, arrival times, or fares.
2. **Clear Unsupported Notice:** If live transit data is unavailable for a city, or if no API key is configured, Roam displays:
   > *“Live transit details are unavailable for this location.”*
3. **Editorial Guidance Display:** Roam displays the editorial transit advice curated for the landmark (e.g., nearest subway station or bus stop from the travel guide).
4. **Estimated vs. Live Data:** Scheduled departures are explicitly labeled as *"Timetable schedule"* to distinguish published schedules from real-time GPS tracking.
5. **Always-Available Google Maps Fallback:** The **"Open in Google Maps"** fallback button is always present, taking the user directly to the Google Maps route with origin, destination, and travel mode prefilled.

---

## 6. Development & Zero-Configuration Graceful Degradation

If no Google Maps API keys are provided in development:
- **No Crashes:** The app will never throw runtime errors or crash.
- **Interactive Map Preview:** Roam renders an interactive OpenStreetMap map view centered on the route bounding box with zoom (+/-) and reset controls.
- **Walking & Driving Estimation:** Walking and driving estimates (distance, duration, step-by-step turn previews) are calculated using great-circle Haversine formulas and city grid factors.
- **Public Transit:** Public transit shows the clear unsupported transit notification and landmark advice, with direct one-click link to Google Maps.
