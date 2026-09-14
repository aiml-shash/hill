# HILL CLIMB 3D
A complete single-player, desktop hill-climbing game built with HTML, CSS, JavaScript, Three.js r170 and WebGL 2.

## Run in VS Code — no build or npm install required
1. Extract this ZIP.
2. Open the Hill-Climb-3D folder in VS Code.
3. Install the Live Server extension if you do not already have it.
4. Right-click index.html and choose "Open with Live Server".
5. Click LET’S DRIVE, then hold W or the Up Arrow.

Three.js is bundled in assets/vendor, so gameplay works offline once your local server is running. Do not open index.html by double-clicking: browsers restrict ES modules under file://.

Alternative: from this folder run `python -m http.server 8080`, then open http://localhost:8080.

## Controls
| Key | Action |
| --- | --- |
| W / Up Arrow | Accelerate |
| S / Down Arrow | Brake, then reverse |
| A / Left Arrow | Raise the nose / tilt backward |
| D / Right Arrow | Lower the nose / tilt forward |
| Space | Handbrake |
| R | Restart |
| P / Escape | Pause / resume |

This is true 3D rendering with arcade rigid-body physics in the vertical plane of a fixed route. A/D balance the vehicle, rather than steering freely across the landscape. Four rendered wheels rotate, with front/rear spring-damper suspension.

## Gameplay and progression
- Seven landscapes: Green Hills, Desert Canyon, Snow Mountains, Forest Trail, Rocky Mountain, Night Hills, Volcano Valley.
- Only the Jeep and Green Hills start unlocked.
- Map unlock goals: 500 m, 650 m, 800 m, 950 m, 1100 m and 1250 m in the preceding landscape.
- Six vehicles with distinct speed, power, traction, suspension, tank capacity, weight and appearance.
- Five upgrade categories with levels 1–5; upgrades are saved per vehicle.
- Coins every 8 m; fuel cans every 96 m after the first at 72 m.
- A fuel can restores 38% of capacity; checkpoints every 200 m award 25 coins, 12% fuel and 5 health.
- Checkpoints record progress; new runs always start at the trailhead.
- Coins save as they are earned, including on an interrupted run.
- Score = greatest forward distance in metres + 10 × run coins + successfully landed stunt points.
- Stunts: airtime, big air, frontflip/backflip, long jump and perfect landing.
- Spring forces, traction, slopes, air pitch, impacts, roof collisions, rollover recovery timer and falling rocks affect driving.
- Bridges, broken bridges, moving bridge decks, mud, water, logs, rocks and jump ramps repeat in a deterministic sequence with progressively steeper terrain.
- Each map shifts the feature sequence and changes traction, palette, scenery and atmosphere.
- Sunny maps cycle through cloud and rain; specialized maps use snow, rain, fog, night or ash.
- Synthesized engine, music and sound effects use Web Audio and begin after interaction.
- Settings: master/music volume, high/low graphics, chase/side camera and camera shake.
- Losing browser focus automatically pauses the run.

## Files
- index.html — menu, HUD and dialog shell
- style.css — responsive interface
- game.js — game loop, input, camera, pickups, progression and weather
- vehicle.js — six procedural vehicles, lamps and wheel animation
- terrain.js — streamed 3D landscape, bridges, decorations and pickups
- physics.js — fixed 120 Hz suspension and collision simulation
- ui.js — menus, garage, upgrades, help, settings and HUD
- track.js — deterministic terrain heights, slopes and collision surfaces
- config.js — all map, vehicle, cost and upgrade balance data
- save.js — versioned and validated LocalStorage progress
- audio.js — synthesized audio
- effects.js — pooled dust and weather particles
- assets/vendor — bundled Three.js and its MIT license
- assets/models, textures, sounds — extension points; current assets and sounds are procedural
- tests/physics.mjs — meaningful physics regression checks
- TESTING.md — completed checks and performance limits

## Saving
Progress is stored under `hill-climb-3d-v1` in LocalStorage for the browser and address you use. The online game and localhost each have separate saves. Changing the local server port, clearing browser data or switching browser profiles gives a different save. If storage is disabled, the game continues with session-only progress and shows a notice.

## Performance and scope
The game streams 64 m terrain chunks, instances repeated scenery, pools effects and removes distant geometry. High quality uses shadows and a capped pixel ratio; Low disables shadows. Target performance is around 60 FPS on a hardware-accelerated desktop, but it depends on your GPU and browser. The test environment used software rendering, so 60 FPS has not been certified on a physical desktop GPU.

Visuals are stylized procedural models, not photorealistic assets. Audio is original synthesis, not recorded engine samples. Moving platforms are oscillating bridge sections. The world follows one fixed lane; this is not an open-world driving simulator.

## Optional developer tests
With Node installed, run `node tests/physics.mjs`. No npm installation is required.
Open the game with `?debug` added to its address to show FPS, draw calls, geometry count and state.

