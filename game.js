import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";

import { MAPS, stats } from "./config.js";
import { Save } from "./save.js";
import { Track } from "./track.js";
import { Physics } from "./physics.js";
import { Terrain } from "./terrain.js";
import { Vehicle } from "./vehicle.js";
import { Effects } from "./effects.js";
import { AudioSystem } from "./audio.js";
import { UI } from "./ui.js";

class Game {
  constructor() {
    this.save = new Save();
    this.audio = new AudioSystem(this.save.data.settings);

    this.mode = "menu";
    this.keys = new Set();

    this.input = {
      throttle: 0,
      brake: 0,
      tilt: 0,
      handbrake: false
    };

    // Mobile touch controls
    this.touchInput = {
      throttle: false,
      brake: false,
      left: false,
      right: false
    };

    this.accumulator = 0;
    this.clock = 0;
    this.shake = 0;
    this.crashTime = 0;
    this.hudTime = 0;
    this.saveTime = 0;
    this.runCoins = 0;
    this.bonus = 0;
    this.checkpoint = 0;

    this.taken = new Set();
    this.hit = new Set();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.1,
      800
    );

    const mobile = matchMedia("(pointer: coarse)").matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("world"),
      antialias: !mobile,
      alpha: false,
      powerPreference: mobile ? "default" : "high-performance",
      failIfMajorPerformanceCaveat: false
    });

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.ambient = new THREE.HemisphereLight(
      0xf0f6e8,
      0x526443,
      2.3
    );

    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffedc5, 3);
    this.sun.castShadow = !mobile;

    this.sun.shadow.mapSize.set(
      mobile ? 512 : 1024,
      mobile ? 512 : 1024
    );

    Object.assign(this.sun.shadow.camera, {
      left: -35,
      right: 35,
      top: 35,
      bottom: -35,
      near: 1,
      far: 130
    });

    this.sun.shadow.bias = -0.0007;

    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xffe7aa
      })
    );

    this.scene.add(this.sunOrb);

    this.effects = new Effects(this.scene);

    this.look = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this.aim = new THREE.Vector3();
    this.targetColor = new THREE.Color();

    this.ui = new UI(this);

    this.preview();
    this.applySettings();
    this.bind();

    document.getElementById("loading").hidden = true;

    this.last = performance.now();
    this.frame = this.frame.bind(this);

    requestAnimationFrame(this.frame);
  }

  bind() {
    const controls = new Set([
      "KeyW",
      "ArrowUp",
      "KeyS",
      "ArrowDown",
      "KeyA",
      "ArrowLeft",
      "KeyD",
      "ArrowRight",
      "Space",
      "KeyR",
      "KeyP",
      "Escape"
    ]);

    addEventListener("keydown", event => {
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName) &&
        event.code !== "Escape"
      ) {
        return;
      }

      if (!controls.has(event.code)) {
        return;
      }

      event.preventDefault();

      if (event.code === "KeyP" || event.code === "Escape") {
        if (event.repeat) return;

        const modal = document.getElementById("modal");

        if (
          !modal.hidden &&
          this.ui.page !== "pause" &&
          this.ui.page !== "over"
        ) {
          this.ui.close();

          if (this.mode === "paused") {
            this.resume();
          }
        } else if (this.mode === "playing") {
          this.pause();
        } else if (this.mode === "paused") {
          this.resume();
        }

        return;
      }

      if (
        event.code === "KeyR" &&
        !event.repeat &&
        ["playing", "paused", "over", "crashing"].includes(this.mode)
      ) {
        this.start();
        return;
      }

      if (this.mode === "playing") {
        this.keys.add(event.code);
      }
    });

    addEventListener("keyup", event => {
      this.keys.delete(event.code);
    });

    addEventListener("blur", () => {
      this.keys.clear();
      this.resetTouchInput();

      if (this.mode === "playing") {
        this.pause();
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.mode === "playing") {
        this.pause();
      }
    });

    addEventListener("resize", () => {
      this.resize();
    });

    addEventListener("pagehide", () => {
      this.record();
    });

    const canvas = document.getElementById("world");

    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();

      if (this.mode === "playing") {
        this.pause();
      }

      document.getElementById("fatal").hidden = false;

      document.getElementById("fatalText").textContent =
        "The graphics connection was lost. Reload the page to continue.";
    });

    // Connect the mobile buttons
    document.querySelectorAll("[data-touch]").forEach(button => {
      const control = button.dataset.touch;

      const press = event => {
        event.preventDefault();

        if (button.setPointerCapture) {
          button.setPointerCapture(event.pointerId);
        }

        this.touchInput[control] = true;
        button.classList.add("pressed");
      };

      const release = event => {
        event.preventDefault();

        this.touchInput[control] = false;
        button.classList.remove("pressed");
      };

      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });
  }

  resetTouchInput() {
    for (const key of Object.keys(this.touchInput)) {
      this.touchInput[key] = false;
    }

    document.querySelectorAll("[data-touch]").forEach(button => {
      button.classList.remove("pressed");
    });
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      innerWidth,
      innerHeight,
      false
    );
  }

  applySettings() {
    const settings = this.save.data.settings;
    const mobile = matchMedia("(pointer: coarse)").matches;

    const pixelRatio = mobile
      ? 1
      : settings.quality === "high"
        ? 1.6
        : 1;

    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, pixelRatio)
    );

    this.renderer.shadowMap.enabled =
      !mobile && settings.quality === "high";

    this.sun.castShadow =
      !mobile && settings.quality === "high";

    this.resize();

    this.audio.settings = settings;
  }

  applyLighting() {
    const night = this.weather === "Night";

    const cloudyWeather = [
      "Cloudy",
      "Rain",
      "Fog",
      "Snow",
      "Ash"
    ].includes(this.weather);

    this.ambient.intensity = night
      ? 0.38
      : cloudyWeather
        ? 1.7
        : 2.3;

    this.sun.intensity = night
      ? 0.45
      : cloudyWeather
        ? 1.6
        : 3;

    this.sun.color.setHex(
      night ? 0x8fb3ee : 0xffedc5
    );

    this.renderer.toneMappingExposure =
      night ? 1.1 : 1.2;

    this.scene.fog.near =
      this.weather === "Fog"
        ? 25
        : this.weather === "Rain"
          ? 55
          : 90;

    this.scene.fog.far =
      this.weather === "Fog"
        ? 180
        : this.weather === "Rain"
          ? 270
          : 380;

    this.terrain.mats.road.roughness =
      this.weather === "Rain" ? 0.3 : 1;

    for (const chunk of this.terrain.chunks.values()) {
      if (chunk.meshes?.[1]?.material) {
        chunk.meshes[1].material.roughness =
          this.weather === "Rain" ? 0.3 : 1;
      }
    }
  }

  buildWorld() {
    this.terrain?.dispose();
    this.vehicle?.dispose();

    const data = this.save.data;

    this.track = new Track(data.selectedMap);

    this.vehicleStats = stats(
      data.selectedVehicle,
      data.upgrades[data.selectedVehicle]
    );

    this.physics = new Physics(
      this.track,
      this.vehicleStats
    );

    this.terrain = new Terrain(
      this.scene,
      this.track
    );

    this.vehicle = new Vehicle(
      this.scene,
      data.selectedVehicle,
      this.vehicleStats
    );

    this.weather = MAPS[data.selectedMap].weather;

    this.scene.background = new THREE.Color(
      this.track.theme.sky
    );

    this.scene.fog = new THREE.Fog(
      this.track.theme.fog,
      90,
      380
    );

    this.terrain.update(0, 0);

    this.look.set(
      0,
      this.physics.s.y,
      0
    );

    this.camera.position.set(
      -8,
      this.physics.s.y + 5,
      13
    );

    this.applyLighting();
  }

  preview() {
    this.mode = "menu";
    this.keys.clear();
    this.resetTouchInput();

    this.buildWorld();
    this.ui.screen(false);
  }

  start() {
    if (
      ["playing", "paused", "crashing"].includes(this.mode)
    ) {
      this.record();
    }

    this.ui.close();
    this.audio.start();
    this.buildWorld();

    this.mode = "playing";

    this.keys.clear();
    this.resetTouchInput();

    this.accumulator = 0;
    this.runCoins = 0;
    this.bonus = 0;
    this.checkpoint = 0;
    this.taken.clear();
    this.hit.clear();
    this.shake = 0;
    this.crashTime = 0;

    this.ui.screen(true);
    this.ui.update();

    const mobile = matchMedia("(pointer: coarse)").matches;

    this.ui.toast(
      mobile
        ? "USE THE TOUCH BUTTONS TO DRIVE"
        : "W / ↑ TO DRIVE · A / D TO BALANCE"
    );
  }

  menu() {
    this.record();
    this.ui.close();
    this.preview();
  }

  pause(show = true) {
    if (this.mode !== "playing") {
      return;
    }

    this.mode = "paused";

    this.keys.clear();
    this.resetTouchInput();

    this.accumulator = 0;
    this.record();

    if (show) {
      this.ui.open("pause");
    }
  }

  resume() {
    if (this.mode !== "paused") {
      return;
    }

    this.ui.close();
    this.keys.clear();
    this.resetTouchInput();

    this.mode = "playing";
    this.accumulator = 0;
  }

  score() {
    return (
      Math.floor(this.physics.s.distance) +
      this.runCoins * 10 +
      this.bonus
    );
  }

  record() {
    if (!this.physics || this.mode === "menu") {
      return;
    }

    const data = this.save.data;
    const state = this.physics.s;

    data.best = Math.max(
      data.best,
      Math.floor(state.distance)
    );

    data.bestScore = Math.max(
      data.bestScore,
      this.score()
    );

    data.records[data.selectedMap] = Math.max(
      data.records[data.selectedMap] || 0,
      Math.floor(state.distance)
    );

    this.save.write();
  }

  reward(coins) {
    this.runCoins += coins;
    this.save.data.bank += coins;
    this.save.write();
  }

  event(eventData) {
    const state = this.physics.s;

    if (
      eventData.type === "coin" ||
      eventData.type === "fuel"
    ) {
      if (this.taken.has(eventData.id)) {
        return;
      }

      this.taken.add(eventData.id);
      this.audio.event(eventData.type);

      if (eventData.type === "coin") {
        this.reward(1);
      } else {
        state.fuel = Math.min(
          this.vehicleStats.tank,
          state.fuel + this.vehicleStats.tank * 0.38
        );

        this.ui.toast("FUEL +38%");
      }

      return;
    }

    if (eventData.type === "stunt") {
      this.bonus += eventData.points;

      this.reward(
        Math.max(
          1,
          Math.floor(eventData.points / 100)
        )
      );

      this.ui.toast(
        `${eventData.name} +${eventData.points}`
      );

      this.audio.event("coin");
      return;
    }

    this.audio.event(eventData.type);

    if (eventData.type === "landing") {
      this.shake = Math.min(
        1,
        eventData.impact * 0.055
      );

      this.effects.burst(
        state.x,
        state.y - 0.7,
        25
      );
    }
  }

  tick(dt) {
    const throttle =
      this.keys.has("KeyW") ||
      this.keys.has("ArrowUp") ||
      this.touchInput.throttle;

    const brake =
      this.keys.has("KeyS") ||
      this.keys.has("ArrowDown") ||
      this.touchInput.brake;

    const left =
      this.keys.has("KeyA") ||
      this.keys.has("ArrowLeft") ||
      this.touchInput.left;

    const right =
      this.keys.has("KeyD") ||
      this.keys.has("ArrowRight") ||
      this.touchInput.right;

    this.input.throttle = throttle ? 1 : 0;
    this.input.brake = brake ? 1 : 0;

    this.input.tilt =
      (left ? 1 : 0) -
      (right ? 1 : 0);

    this.input.handbrake =
      this.keys.has("Space");

    if (this.input.brake) {
      this.input.throttle = 0;
    }

    const state = this.physics.s;

    const events = this.physics.step(
      dt,
      this.input,
      this.weather
    );

    this.terrain.collect(state, events);

    for (const gameEvent of events) {
      this.event(gameEvent);
    }

    const checkpoint =
      Math.floor(state.distance / 200);

    if (checkpoint > this.checkpoint) {
      const count = checkpoint - this.checkpoint;

      this.checkpoint = checkpoint;
      this.reward(25 * count);

      state.fuel = Math.min(
        this.vehicleStats.tank,
        state.fuel + this.vehicleStats.tank * 0.12
      );

      state.health = Math.min(
        100,
        state.health + 5
      );

      this.save.data.checkpoints[
        this.save.data.selectedMap
      ] = checkpoint * 200;

      this.save.write();
      this.ui.toast("CHECKPOINT! +25 COINS");
      this.audio.event("upgrade");
    }

    const data = this.save.data;
    const goal = MAPS[data.selectedMap].goal;

    if (
      state.distance >= goal &&
      data.unlocked === data.selectedMap + 1 &&
      data.unlocked < 7
    ) {
      data.unlocked++;

      this.save.write();

      this.ui.toast(
        `${MAPS[data.unlocked - 1].name.toUpperCase()} UNLOCKED!`
      );
    }

    const rock = this.track.obstacle(
      state.x,
      state.time
    );

    if (
      rock &&
      Math.abs(rock.x - state.x) < 1.8 &&
      Math.abs(rock.y - state.y) < 1.5 &&
      !this.hit.has(rock.id)
    ) {
      this.hit.add(rock.id);

      state.health -=
        40 / this.vehicleStats.protection;

      state.vx *= 0.4;
      state.av += 2;

      this.shake = 0.8;

      this.audio.event("crash");
      this.ui.toast("ROCK IMPACT!");
    }

    if (state.dead) {
      this.record();

      this.mode = "crashing";
      this.crashTime = 0;

      this.keys.clear();
      this.resetTouchInput();

      this.audio.event(
        state.dead === "OUT OF FUEL"
          ? "landing"
          : "crash"
      );

      this.shake =
        state.dead === "OUT OF FUEL" ? 0 : 1;

      this.effects.burst(
        state.x,
        state.y,
        70
      );

      if (
        state.dead !== "OUT OF FUEL" &&
        this.save.data.settings.shake
      ) {
        const crashFlash =
          document.getElementById("crashFlash");

        crashFlash.classList.add("flash");

        setTimeout(() => {
          crashFlash.classList.remove("flash");
        }, 160);
      }
    }
  }

  frame(now) {
    const dt = Math.min(
      (now - this.last) / 1000,
      0.1
    );

    this.last = now;
    this.clock += dt;

    if (this.mode === "playing") {
      this.accumulator += dt;

      let steps = 0;

      while (
        this.accumulator >= 1 / 120 &&
        steps < 12 &&
        this.mode === "playing"
      ) {
        this.tick(1 / 120);

        this.accumulator -= 1 / 120;
        steps++;
      }

      this.saveTime += dt;

      if (this.saveTime > 1) {
        this.record();
        this.saveTime = 0;
      }
    } else {
      this.accumulator = 0;
    }

    const state = this.physics.s;

    const active = this.mode === "playing";
    const menu = this.mode === "menu";

    if (this.mode === "crashing") {
      this.crashTime += dt;

      if (state.dead !== "OUT OF FUEL") {
        state.a += dt * Math.min(1, state.av);
        state.y -= dt * 0.15;
      }

      if (this.crashTime > 1.1) {
        this.mode = "over";
        this.ui.open("over");
      }
    }

    if (menu) {
      this.terrain.update(
        0,
        this.clock * 0.25
      );
    } else if (active) {
      this.terrain.update(
        state.x,
        state.time
      );
    }

    const baseWeather =
      MAPS[this.save.data.selectedMap].weather;

    const weather =
      baseWeather === "Sunny"
        ? ["Sunny", "Cloudy", "Rain", "Sunny"][
            Math.floor(state.time / 55) % 4
          ]
        : baseWeather;

    if (this.weather !== weather) {
      this.weather = weather;
      this.applyLighting();

      if (active) {
        this.ui.toast(
          weather.toUpperCase() + " WEATHER"
        );
      }
    }

    this.vehicle.update(
      state,
      active ? dt : menu ? dt * 0.05 : 0,
      this.input.brake || this.input.handbrake,
      this.weather === "Night"
    );

    if (menu) {
      this.vehicle.group.rotation.y =
        Math.sin(this.clock * 0.2) * 0.09;
    }

    this.effects.update(
      active ? dt : 0,
      state,
      this.weather,
      active
    );

    this.audio.update(
      state,
      active,
      this.input
    );

    const speed = Math.abs(state.vx);

    const sideCamera =
      this.save.data.settings.camera === "side";

    if (menu) {
      this.desired.set(
        state.x - 6 + Math.sin(this.clock * 0.15) * 1.2,
        state.y + 4.1,
        11.7
      );

      this.aim.set(
        state.x - 3.6,
        state.y + 0.15,
        0
      );
    } else if (sideCamera) {
      this.desired.set(
        state.x - 4,
        state.y + 6,
        22 + speed * 0.1
      );

      this.aim.set(
        state.x + 6,
        state.y + 1.5,
        0
      );
    } else {
      this.desired.set(
        state.x - 12 - speed * 0.1,
        state.y + 6.5 + speed * 0.045,
        11 + speed * 0.05
      );

      this.aim.set(
        state.x + 7,
        state.y + 1.3,
        0
      );
    }

    const interpolation =
      1 - Math.exp(-dt * (menu ? 2 : 6));

    this.camera.position.lerp(
      this.desired,
      interpolation
    );

    this.look.lerp(
      this.aim,
      interpolation
    );

    this.camera.lookAt(this.look);

    this.shake *= Math.exp(-dt * 6);

    if (
      this.save.data.settings.shake &&
      this.shake > 0.01
    ) {
      this.camera.position.y +=
        (Math.random() - 0.5) *
        this.shake *
        0.65;

      this.camera.position.x +=
        (Math.random() - 0.5) *
        this.shake *
        0.3;
    }

    const targetFov =
      menu
        ? 46
        : 52 + Math.min(speed / 3, 11);

    this.camera.fov +=
      (targetFov - this.camera.fov) *
      interpolation;

    this.camera.updateProjectionMatrix();

    this.sun.position.set(
      state.x - 20,
      state.y + 55,
      30
    );

    this.sun.target.position.set(
      state.x + 8,
      state.y,
      0
    );

    this.sunOrb.position.set(
      state.x + 150,
      95,
      -230
    );

    this.sunOrb.material.color.setHex(
      this.weather === "Night"
        ? 0xe3edff
        : 0xffe7aa
    );

    this.renderer.render(
      this.scene,
      this.camera
    );

    this.hudTime += dt;

    if (this.hudTime > 0.1) {
      if (!menu) {
        this.ui.update();
      }

      this.hudTime = 0;
    }

    if (location.search.includes("debug")) {
      const debug =
        document.getElementById("debug");

      debug.hidden = false;

      debug.textContent =
        `${Math.round(1 / Math.max(dt, 0.001))} FPS\n` +
        `${this.renderer.info.render.calls} draw calls\n` +
        `${this.renderer.info.memory.geometries} geometries\n` +
        `${this.mode} · ${this.weather}\n` +
        `${state.x.toFixed(1)} m · ${state.a.toFixed(2)} rad`;
    }

    requestAnimationFrame(this.frame);
  }
}

try {
  window.game = new Game();
} catch (error) {
  console.error(error);

  document.getElementById("loading").hidden = true;
  document.getElementById("fatal").hidden = false;

  document.getElementById("fatalText").textContent =
    "The game could not start. " + error.message;
}