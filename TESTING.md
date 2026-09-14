# Verification
Browser: headless Chromium with WebGL enabled using software rendering.

Passed:
- Real keyboard acceleration; vehicle moved and speed increased.
- Pause froze distance; resume continued the same run.
- Restart cleared crash state and returned to the start.
- Fixed-step Green Hills run reached ~602 m before a rollover.
- Run collected 149 coins, reached 3 checkpoints and unlocked Desert Canyon.
- Fuel pickup raised a 10-unit tank to approximately 48 units.
- Empty fuel tank led to OUT OF FUEL.
- All 6 garage vehicle cards rendered.
- Buying Pickup Truck and upgrading its engine deducted the correct coin amounts.
- Vehicle ownership, coins, upgrade level and map unlock survived reload.
- No uncaught browser errors during the core play test.
- Menu and driving screenshots inspected at desktop size; responsive screenshot captured at 768×680.
- Physics regression checks: stable idle, throttle, braking/reverse, handbrake, dry tank, rollover, safely landed backflip, finite simulation state and forward movement on all seven maps, real stat increases from upgrades.
- Production build and type checking passed.

The test account's fixture coins and unlocks are not shipped: a fresh browser begins with 0 coins, 1 vehicle and 1 map.

Performance observation: starter menu rendered about 131 draw calls and 140 geometries. This is a scene-cost observation, not a 60 FPS benchmark. Hardware GPU performance and human game feel still depend on the user's desktop.

