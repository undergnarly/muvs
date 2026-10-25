# Menu audio draft: source and processing record

The site uses five small, self-hosted MP3 files. They are loaded only after
the visitor enables interface sound; no third-party audio service runs in
the browser. Existing uploaded tracks and masters are not modified.

## Source permissions (checked 2026-10-25)

| Material | Author | Original source and licence evidence | Used for |
| --- | --- | --- | --- |
| Heavenly Loop, FLAC | isaiah658 | [Author's OpenGameArt page](https://opengameart.org/content/heavenly-loop): CC0; made only with ZynAddSubFX in LMMS; attribution optional | Low, quiet ambient pad |
| 100 CC0 SFX #2 | rubberduck | [Author's OpenGameArt page](https://opengameart.org/content/100-cc0-sfx-2): CC0 | Short air/softened metal transitions |
| Interface Sounds 1.0 | Kenney | [Publisher's asset page](https://kenney.nl/assets/interface-sounds): CC0; the downloaded `License.txt` also explicitly allows commercial projects without mandatory credit | Glass-like digital transition |

The source downloads, SHA-256 checks and exact used filenames are embedded
in `scripts/prepare-menu-audio.cjs`. The larger unmodified downloads are
kept under ignored `output/menu-audio-sources/`, not shipped to visitors.
No account, paid library, SoundCloud track or attribution-restricted asset
is used. Voluntary credit is included in `public/audio/menu/LICENSE.txt`.
[CC0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode)
applies to the source audio; authors do not endorse this site.

## Sound direction

- A 24-second pad, gently lowered in pitch and low-passed, without adding a
  lead melody or beat. Two seconds of circular overlap join the original
  tail to its beginning without a hard cut. Original seeded, band-limited
  hiss adds a very faint vinyl-like texture, without loud crackle spikes.
- Music: short, warm airy movement for the soundsystem.
- Mixes: low-passed metal movement, referencing the bronze sculpture without
  a loud impact.
- Code: a very short damped glass-like digital cue.
- About: a diffuse quiet air movement.

These are a first sound-design sketch, not a substitute for the owner's
music. The engine must keep the pad and all cues off during actual track
playback, on non-menu pages, when muted, and while the tab is hidden.

## Rebuild and verification

Run `node scripts/prepare-menu-audio.cjs` from the repository. The existing
server dependency `ffmpeg-static` is used, or set `FFMPEG_PATH` explicitly.
Source downloads are checksum-verified before processing. No new npm
dependency is required. Processing is offline and deterministic for a
given FFmpeg build; the checked-in MP3s are the release artefacts.
Run `node scripts/prepare-menu-audio.cjs --verify` for an offline integrity
and decode check, or `node --test scripts/prepare-menu-audio.test.cjs` for
the asset and DSP regression tests.

`public/audio/menu/manifest.json` records each output's exact byte size,
SHA-256, duration, peak, RMS, clipping count and loop-boundary difference.
The 24-second MP3 is decoded again to prove encoder delay/padding is
trimmed and the loop duration remains exactly 24 seconds at 44.1 kHz.
All outputs must remain under -5 dBFS peak with zero clipped samples, and
the total opt-in payload is guarded at 300,000 bytes. A separate public
manifest is provenance/QA metadata, not a required runtime request.

No audio-capable analysis input is available in this agent environment:
the attempted audition returned “audio content omitted because you do not
support audio input.” Therefore the objective checks verify decoding,
levels, seam and payload, **not a claimed human listening review**. The
owner should audition the live sketch on headphones and phone speakers
before choosing the final aesthetic and gain.
