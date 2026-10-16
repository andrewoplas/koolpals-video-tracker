# Privacy Policy for Koolpals Episode Tracker

**Last Updated:** October 16, 2026

## Data stored
The extension stores YouTube video IDs for watched videos, legacy favorites, and personal 1–5 star ratings with update timestamps. Cleared ratings retain a zero-score marker to prevent older local scores from returning when sync is enabled. It caches video titles, uploader URLs, verification results, verification timestamps, and a shared episode-description catalog locally. It does not operate an analytics service or send data to the developer.

## Browser sync
When Browser Sync is enabled, watched and legacy favorite IDs, ratings, and rating update timestamps are stored using your browser's sync service and may be transferred to other devices signed into that browser account. Titles and uploader metadata remain local. With sync disabled, new changes are stored locally; disabling sync does not delete the existing remote copy.

## YouTube lookups
To verify that a video belongs to `@TheKoolPals` and retrieve its title, the extension requests YouTube's oEmbed endpoint with that video's ID. This discloses the requested ID and ordinary network information, including your IP address, to YouTube. Requests omit account cookies. Results are cached to reduce repeated requests. Cleanup checks previously saved IDs only when you request a preview.

The extension inspects visible history rows when you request history import. It saves only videos verified as Koolpals uploads. It also checks the current video and videos embedded on the Koolpals site to display controls and track playback.

## Thumbnails and shared descriptions
Cards load thumbnails from YouTube's image host (`i.ytimg.com`) as they become visible. Image requests disclose the video image requested and ordinary network information, including your IP address, to that host; the extension sets no-referrer on these images.

The extension includes a bundled episode catalog. Builds configured with a shared HTTPS catalog URL also check that host for updates, with caching to avoid repeated downloads. Catalog requests omit account cookies and contain no watched IDs, ratings, or list of saved videos. The host still receives ordinary network information. Descriptions and catalog data are cached in local extension storage, never browser sync.

Transcript processing runs separately from the extension. An operator can provide transcript files and explicitly run AI summarization; that sends the selected transcript text to the configured AI provider. Generated descriptions are reviewed before inclusion in the shared catalog. Public catalog files contain episode metadata and descriptions, not transcripts, processing credentials, or personal library data. The extension itself never sends transcripts or personal ratings to an AI service.

## Backups and cleanup
Migration retains the original watched list and local recovery copies. Cleanup removes only videos confirmed to belong to another channel, after you select the removal action. Unresolved videos are retained. A JSON export and a local recovery copy preserve the pre-cleanup watched IDs, legacy favorite IDs, and ratings. Legacy favorites are preserved; converting them to five-star ratings requires an explicit action and never overwrites an existing rating.

## Third-party services
On compatible HTTPS sites you explicitly enable, the extension reads episode card video IDs and adds watched and favorite controls using your existing library. The popup uses active-tab access to identify the current host and requests optional access only to that host. The browser retains the grant and dynamic content-script registration locally across sessions; site addresses are not bundled with the extension or added to its browser-sync data. Enable separately on each device. You can disable the tracker for the current site from the popup, then refresh to remove existing badges.

Adding an episode uses the same YouTube ownership verification described above. The extension does not send your watched or favorite collection to the site's server or store it in the site's local storage. Badge states are visible in the page DOM.

The extension interacts with YouTube and `patreonsaints.thekoolpals.com`. Browser sync is governed by your browser provider's policies. No separate developer server receives your library.

## Changes and contact
This policy will be updated when data handling changes. Contact the extension developer with questions.
