# Privacy Policy for Koolpals Episode Tracker

**Last Updated:** September 27, 2026

## Data stored
The extension stores YouTube video IDs for watched videos and favorites. It caches video titles, uploader URLs, verification results, and verification timestamps locally. It does not operate an analytics service or send data to the developer.

## Browser sync
When Browser Sync is enabled, watched and favorite IDs are stored using your browser's sync service and may be transferred to other devices signed into that browser account. Titles and uploader metadata remain local. With sync disabled, new changes are stored locally; disabling sync does not delete the existing remote copy.

## YouTube lookups
To verify that a video belongs to `@TheKoolPals` and retrieve its title, the extension requests YouTube's oEmbed endpoint with that video's ID. This discloses the requested ID and ordinary network information, including your IP address, to YouTube. Requests omit account cookies. Results are cached to reduce repeated requests. Cleanup checks previously saved IDs only when you request a preview.

The extension inspects visible history rows when you request history import. It saves only videos verified as Koolpals uploads. It also checks the current video and videos embedded on the Koolpals site to display controls and track playback.

## Backups and cleanup
Migration retains the original watched list and local recovery copies. Cleanup removes only videos confirmed to belong to another channel, after you select the removal action. Unresolved videos are retained. A JSON export and a local recovery copy preserve the pre-cleanup watched and favorite IDs.

## Third-party services
The extension interacts with YouTube and `patreonsaints.thekoolpals.com`. Browser sync is governed by your browser provider's policies. No separate developer server receives your library.

## Changes and contact
This policy will be updated when data handling changes. Contact the extension developer with questions.
