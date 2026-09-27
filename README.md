<a name="top"></a>

<div align="center">
  <img src="assets/showcase/hero.en.webp" alt="ShiroAni: library, schedule and profile views" width="100%" />

  <img src="assets/icon.png" alt="ShiroAni" width="128" height="128" />

  <h1>白アニ &nbsp;·&nbsp; ShiroAni</h1>

  <p><strong>Your cozy little corner for all things anime.</strong></p>

  <p>
    <a href="https://github.com/Shironex/shiroani/releases/latest">
      <img src="https://img.shields.io/github/v/release/Shironex/shiroani?style=flat&color=blue" alt="GitHub Release" />
    </a>
    <a href="https://github.com/Shironex/shiroani/releases">
      <img src="https://img.shields.io/github/downloads/Shironex/shiroani/total?style=flat&color=green" alt="Downloads" />
    </a>
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS-lightgrey" alt="Platform" />
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Source%20Available-orange" alt="License" />
    </a>
    <a href="https://storybook.shiroani.app">
      <img src="https://img.shields.io/badge/Storybook-FF4785?style=flat&logo=storybook&logoColor=white" alt="Storybook" />
    </a>
  </p>

  <p>
    <a href="https://github.com/Shironex/shiroani/releases/latest"><strong>Download</strong></a>
    &nbsp;·&nbsp;
    <a href="https://shiroani.app/en"><strong>Website</strong></a>
    &nbsp;·&nbsp;
    <a href="https://shiroani.app/en/changelog"><strong>Changelog</strong></a>
    &nbsp;·&nbsp;
    <a href="README.pl.md">Polski</a>
  </p>

  <blockquote>
    <p>Shiro-chan is all grown up — ShiroAni 1.0 is stable, polished, and free. Welcome home.</p>
  </blockquote>
</div>

---

## What is ShiroAni?

ShiroAni is a desktop app that brings everything anime into one place — browse and watch with a built-in ad-free browser, track what you're watching, catch airing schedules, write in your diary, and hang out with a chibi companion on your desktop. All wrapped in a cozy, themeable UI that feels like home.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="assets/showcase/en/library.webp" alt="ShiroAni: Library" /></td>
    <td width="50%"><img src="assets/showcase/en/discover.webp" alt="ShiroAni: Discover" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Everything you&#39;re watching, tracked in one shelf.</sub></td>
    <td align="center"><sub>Trending, popular and seasonal anime, powered by AniList.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/showcase/en/diary.webp" alt="ShiroAni: Diary" /></td>
    <td width="50%"><img src="assets/showcase/en/schedule.webp" alt="ShiroAni: Schedule" /></td>
  </tr>
  <tr>
    <td align="center"><sub>A personal journal with a rich-text editor.</sub></td>
    <td align="center"><sub>The week&#39;s airing episodes, at a glance.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/showcase/en/feed.webp" alt="ShiroAni: News" /></td>
    <td width="50%"><img src="assets/showcase/en/profile.webp" alt="ShiroAni: Profile" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Anime news and episode drops, English and Polish.</sub></td>
    <td align="center"><sub>Your AniList stats and recent activity.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/showcase/en/changelog.webp" alt="ShiroAni: Changelog" /></td>
    <td width="50%"><img src="assets/showcase/en/browser.webp" alt="ShiroAni: Browser" /></td>
  </tr>
  <tr>
    <td align="center"><sub>What&#39;s new, straight from the release history.</sub></td>
    <td align="center"><sub>An ad-free new tab with your own shortcuts.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/showcase/en/settings.webp" alt="ShiroAni: Settings" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Seventeen themes, a visual editor, and more.</sub></td>
  </tr>
</table>

## What's inside

|                           |                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Built-in Browser**      | Watch anime without ads — powered by Ghostery's ad-blocker; auto-detects watched episodes and updates your library |
| **Your Anime Library**    | Track everything: watching, completed, plan to watch, on hold, dropped                                             |
| **Airing Schedule**       | Never miss an episode — weekly, daily, and timetable views from AniList                                            |
| **News Feed**             | Bookmarkable RSS feed of anime news and episode drops (EN + PL sources)                                            |
| **Discover**              | Random anime roulette and genre browser powered by AniList                                                         |
| **Diary**                 | A personal journal with a rich text editor, just for you                                                           |
| **Desktop Mascot**        | A chibi companion who lives on your desktop — swap in your own sprite if you like                                  |
| **17 Themes**             | 15 dark + 2 light, plus a visual editor for unlimited custom themes                                                |
| **AniList & MAL Sync**    | Two-way sync with AniList and MyAnimeList — push, pull, or both (experimental)                                     |
| **Discord Rich Presence** | Show your friends what you're watching with customizable templates                                                 |
| **Bilingual UI**          | English + Polish, auto-detected from your OS locale                                                                |

## Getting started

Grab the latest version for your system from [Releases](https://github.com/Shironex/shiroani/releases/latest).

### Windows

1. Download the `.exe` installer.
2. Run it — Windows might show a SmartScreen warning since the app isn't code-signed. Click **"More info"** then **"Run anyway"**.
3. That's it! Future updates install automatically.

### macOS

1. Download the `.dmg` file.
2. Open it and drag ShiroAni to your Applications folder.
3. macOS will block it because it's not code-signed. Open Terminal and run:
   ```bash
   xattr -rd com.apple.quarantine /Applications/ShiroAni.app
   ```
   This is a one-time step that only removes macOS's quarantine flag — the app isn't notarized yet, but nothing else is modified.
4. Auto-updates aren't available on macOS yet, so grab new versions manually from [Releases](https://github.com/Shironex/shiroani/releases).

## Building from source

Want to hack on ShiroAni or build it yourself? See [CONTRIBUTING.md](CONTRIBUTING.md).

## Showcase images

The screenshots above are captured with [`@noctcore/showcase-kit`](https://www.npmjs.com/package/@noctcore/showcase-kit). `pnpm showcase` rebuilds them: it builds the web renderer in a dedicated showcase mode with invented demo data (no real account, library or files), then captures every view in English and Polish. See [CONTRIBUTING.md](CONTRIBUTING.md#refreshing-readme-screenshots) for details.

## License

This project is source-available — see the [LICENSE](LICENSE) file for details. You're free to use the app and explore the code, but redistribution, reselling, and derivative works are not permitted.

---

<p align="center">
  Made with &#10084; by <a href="https://github.com/Shironex">Shironex</a>
</p>

[Back to top](#top)
