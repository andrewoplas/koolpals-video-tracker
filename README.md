# Koolpals Episode Tracker

WXT + React browser extension for watched status and favorites on verified `@TheKoolPals` videos.

## Development

```sh
npm ci
npm run dev              # Chrome
npm run dev:firefox      # Firefox
npm run compile
npm run build
npm run build:firefox
```

Use Node 22.17+ for the dependency-free tests:

```sh
node --experimental-strip-types --test tests/library.test.ts
npm run build
node --test tests/background.test.mjs
```

`npm run zip` packages the Chrome build; `npm run zip:firefox` packages Firefox. Chrome's unpacked build is `.output/chrome-mv3`. A Web Store installation is not updated by a local build. Reload an unpacked extension and refresh open YouTube/Koolpals tabs after updating it.

## Library and cleanup

Use **Mark watched** or **Favorite** on verified Koolpals videos. Playback beyond 75% marks a verified video watched. Favorites remain independent of watched status; the popup links directly to each saved video.

Open **Manage library → Preview cleanup** to check previously saved uploaders. Leave that tab open during the scan. **Back up & remove** exports the current library and saves a local recovery copy before removing only confirmed non-Koolpals IDs. Private, deleted, and unresolved videos are kept. **Restore last cleanup** merges the recovery copy back into the active library. Closing a scan tab cancels its UI workflow; completed lookups remain cached for the next scan.

## Storage and channel checks

Watched and favorite IDs use separate sets of 32 deterministic sync buckets. A change reads/writes only affected buckets; existing IDs do not shift between buckets when another is removed. Both per-item (8 KB) and total (100 KB) sync limits are checked before writes. Browser write-rate errors are surfaced and can be retried. The original `watched_videos` key is retained as a recovery copy and migrated once per storage area.

Background writes are serialized across tabs on this browser. Browser Sync still uses its native conflict behavior: simultaneous offline edits on different devices to the same bucket can conflict. Update the extension on all devices before relying on the new schema; older versions only understand the legacy key. Enabling sync merges local and remote libraries; disabling it copies the active remote library locally without deleting the remote copy.

YouTube oEmbed lookups verify the exact uploader handle and cache titles locally. Lookups omit account cookies. Missing metadata fails closed for new saves and remains unresolved during cleanup. Confirmed results are cached for seven days; unresolved results for five minutes. A handle change or a legacy channel-ID URL may require updating the verifier.

## Manual checks

Verify watched/favorite toggles and reload persistence; a non-Koolpals video must show no controls or auto-save. Test navigation between channels without refreshing, embedded Koolpals videos, visible-history import, migration, cleanup preview/restore, and sync on a second signed-in device. Unit tests and builds do not prove cross-device delivery or compatibility with future YouTube DOM changes.

## UI design system

Follow [the design-system guide](docs/DESIGN_SYSTEM.md) and reuse `styles/tokens.css`. It records the supplied visual reference, Koolpals color provenance, component patterns, accessibility requirements, and host-page styling boundaries.
