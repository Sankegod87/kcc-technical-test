# KCC booth bridge

Small program for the booth PC. It lets the KCC Technical app see the X32 and fire MyDMX 3.0 scenes.

## Setup
1. Install Node.js (LTS). In this folder run `npm install easymidi` (only needed for MyDMX scenes).
2. Copy `bridge.config.example.json` to `bridge.config.json` and set `x32ip` (X32: Setup → Network) and your scenes.
3. Run `node bridge.js`. In the app: Settings → Connections → Booth bridge, enter `<this PC's IP>:8099`.

## MyDMX scenes (MIDI)
MyDMX 3.0 has no network control, so the bridge sends MIDI notes and MyDMX listens for them (MIDI is a paid MyDMX upgrade).
- Windows: install loopMIDI, create a port, put its name in `midiOut`.
- Mac: set `midiOut` to any name; the bridge creates a virtual port with that name.
- In MyDMX: MIDI settings → assign each scene button to the note in your config (note 36 → scene 1, etc.).

## Notes
- Read-only for the X32: the bridge only asks for status; it never changes the mixer.
- `token`: if set, the app must send the same value (Settings → Connections). It stops casual use from other devices on the network.
- Test without hardware: `node fake-x32.js` in one window, set `"x32ip":"127.0.0.1"`; run the bridge with `BRIDGE_TEST_MIDI=1` to log scene notes.
