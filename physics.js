import { clamp, wrap } from './config.js';

// 120 Hz rigid body in the route's X/Y plane.
// Four visual wheels share two axles.
// Spring forces act along surface normals; torque uses each contact's lever arm.

export class Physics {

  constructor(track, v) {
    this.track = track;
    this.v = v;
    this.reset();
  }

  reset() {

    const h = this.track.height(0);

    this.s = {
      x: 0,
      y: h + this.v.radius + .76,

      vx: 0,
      vy: 0,

      a: 0,
      av: 0,

      fuel: this.v.tank,
      health: 100,

      time: 0,

      grounded: true,
      contacts: [0, 0],

      air: 0,
      airStart: 0,
      airAngle: 0,
      airFlips: 0,

      upside: 0,
      empty: 0,

      dead: null,

      distance: 0,

      // ============================================================
      // CHECKPOINT STATE
      // ============================================================

      // First checkpoint = 1000m
      checkpoint: 1000,

      // Starting gap = 1000m
      // After every checkpoint, the gap increases by 100m
      checkpointGap: 1000,

      // Number of checkpoints passed
      checkpointPassed: 0
    };
  }


  step(dt, input, weather = 'Sunny') {

    const s = this.s;
    const v = this.v;

    const events = [];

    if (s.dead) {
      return events;
    }

    s.time += dt;

    const was = s.grounded;

    const oldVy = s.vy;
    const oldA = s.a;


    // ============================================================
    // FORCES
    // ============================================================

    let fx = 0;

    let fy = -22 * v.mass;

    let torque = 0;

    let contacts = 0;


    const cs = Math.cos(s.a);
    const sn = Math.sin(s.a);


    // ============================================================
    // WHEEL / SUSPENSION PHYSICS
    // ============================================================

    for (let i = 0; i < 2; i++) {

      const lx = i === 0 ? -1.22 : 1.22;
      const ly = -0.27;


      const rx =
        lx * cs -
        ly * sn;


      const ry =
        lx * sn +
        ly * cs;


      const wx =
        s.x +
        rx +
        sn * .62;


      const wy =
        s.y +
        ry -
        cs * .62;


      const h =
        this.track.surface(
          wx,
          s.time
        );


      const m =
        this.track.slope(
          wx,
          s.time
        );


      const inv =
        1 / Math.hypot(1, m);


      const nx =
        -m * inv;

      const ny =
        inv;


      const compression =
        clamp(
          h +
          v.radius -
          wy,

          0,
          .7
        );


      s.contacts[i] =
        compression;


      if (
        compression > 0 &&
        cs > -.2
      ) {

        contacts++;


        const cvx =
          s.vx -
          s.av * ry;


        const cvy =
          s.vy +
          s.av * rx;


        const force =
          clamp(
            compression * v.spring -
            (cvx * nx + cvy * ny) * 8.5,

            0,
            150
          );


        fx +=
          force * nx;

        fy +=
          force * ny;


        torque +=
          rx * force * ny -
          ry * force * nx;


        const grip =
          clamp(
            v.grip *
            this.track.grip(
              wx,
              weather
            ),

            .15,
            1.6
          );


        let drive = 0;


        // ==========================================================
        // THROTTLE
        // ==========================================================

        if (
          input.throttle > 0 &&
          s.fuel > 0
        ) {

          drive =
            v.power *
            v.mass *
            8 *
            input.throttle;
        }


        // ==========================================================
        // BRAKE
        // ==========================================================

        if (input.brake > 0) {

          drive =
            s.vx > 1

              ? -30 *
                v.mass *
                .5

              : s.fuel > 0

                ? -v.power *
                  .3 *
                  v.mass

                : 0;
        }


        // ==========================================================
        // HANDBRAKE
        // ==========================================================

        if (input.handbrake) {

          drive =
            -s.vx *
            8 *
            v.mass;
        }


        // ==========================================================
        // ROLLING RESISTANCE
        // ==========================================================

        drive -=
          s.vx *
          .09 *
          v.mass;


        // ==========================================================
        // TRACTION LIMIT
        // ==========================================================

        drive =
          clamp(
            drive,

            -force *
            grip *
            1.8,

            force *
            grip *
            1.8
          );


        fx +=
          drive *
          inv;


        fy +=
          drive *
          m *
          inv;


        torque -=
          drive *
          .1;
      }
    }


    // ============================================================
    // GROUND STATE
    // ============================================================

    s.grounded =
      contacts > 0;


    // ============================================================
    // AIR CONTROL / TILT
    // ============================================================

    torque +=
      input.tilt *
      (
        s.grounded
          ? 2.7
          : 8
      ) *
      v.mass;


    torque -=
      s.av *
      (
        s.grounded
          ? 3
          : .65
      ) *
      v.mass;


    // ============================================================
    // SPEED
    // ============================================================

    const maxSpeedKmh =
      v.maxSpeedKmh ?? 200;


    // ============================================================
    // AIR RESISTANCE
    // ============================================================

    fx -=
      .008 *
      s.vx *
      Math.abs(s.vx);


    // ============================================================
    // HORIZONTAL VELOCITY
    // ============================================================

    s.vx =
      clamp(
        s.vx +
        (fx / v.mass) * dt,

        -9,
        maxSpeedKmh / 3.6
      );


    // ============================================================
    // VERTICAL VELOCITY
    // ============================================================

    s.vy +=
      (fy / v.mass) *
      dt;


    // ============================================================
    // ANGULAR VELOCITY
    // ============================================================

    s.av =
      clamp(
        s.av +
        torque /
        (v.mass * 2.4) *
        dt,

        -5.8,
        5.8
      );


    // ============================================================
    // POSITION
    // ============================================================

    s.x +=
      s.vx *
      dt;


    s.y +=
      s.vy *
      dt;


    s.a +=
      s.av *
      dt;


    // ============================================================
    // PREVENT GOING TOO FAR BACKWARDS
    // ============================================================

    if (s.x < -12) {

      s.x = -12;

      s.vx =
        Math.max(
          0,
          s.vx
        );
    }


    // ============================================================
    // DISTANCE
    // ============================================================

    s.distance =
      Math.max(
        s.distance,
        s.x
      );


    // ============================================================
    // CHECKPOINT SYSTEM
    //
    // Checkpoints:
    //
    // 1000m
    // 2100m  (+1100)
    // 3300m  (+1200)
    // 4600m  (+1300)
    // 6000m  (+1400)
    // 7500m  (+1500)
    // 9100m  (+1600)
    //
    // The gap increases by 100m after every checkpoint.
    // ============================================================

    while (s.x >= s.checkpoint) {

      // ----------------------------------------------------------
      // FULL HEALTH RESTORE
      // ----------------------------------------------------------

      s.health = 100;


      // ----------------------------------------------------------
      // COUNT CHECKPOINT
      // ----------------------------------------------------------

      s.checkpointPassed++;


      // ----------------------------------------------------------
      // DISTANCE OF CHECKPOINT JUST PASSED
      // ----------------------------------------------------------

      const passedDistance =
        s.checkpoint;


      // ----------------------------------------------------------
      // INCREASE NEXT CHECKPOINT GAP BY 100m
      //
      // 1000 → 1100 → 1200 → 1300 → 1400...
      // ----------------------------------------------------------

      s.checkpointGap += 100;


      // ----------------------------------------------------------
      // MOVE TO NEXT CHECKPOINT
      // ----------------------------------------------------------

      s.checkpoint +=
        s.checkpointGap;


      // ----------------------------------------------------------
      // SEND CHECKPOINT EVENT
      // ----------------------------------------------------------

      events.push({
        type: 'checkpoint',

        distance:
          passedDistance,

        next:
          s.checkpoint,

        passed:
          s.checkpointPassed
      });
    }


    // ============================================================
    // FUEL
    // ============================================================

    s.fuel =
      Math.max(
        0,

        s.fuel -
        dt *
        (
          .25 +
          .75 *
          input.throttle +
          .012 *
          Math.abs(s.vx)
        )
      );


    // ============================================================
    // CHASSIS / ROOF COLLISION
    // ============================================================

    let impact = 0;


    for (const lx of [-1.15, 1.15]) {

      const ly = .66;


      const rx =
        lx * Math.cos(s.a) -
        ly * Math.sin(s.a);


      const ry =
        lx * Math.sin(s.a) +
        ly * Math.cos(s.a);


      const h =
        this.track.surface(
          s.x + rx,
          s.time
        );


      if (
        s.y + ry <
        h + .12
      ) {

        const penetration =
          h +
          .12 -
          s.y -
          ry;


        s.y +=
          Math.min(
            penetration,
            .3
          );


        impact =
          Math.max(
            impact,

            Math.abs(oldVy) +
            Math.abs(s.av) * 2
          );


        // ========================================================
        // SMALL BOUNCE
        // ========================================================

        s.vy =
          Math.max(
            s.vy,
            1.5
          );


        // ========================================================
        // SMALL HORIZONTAL ENERGY LOSS
        // ========================================================

        s.vx *= .992;


        // ========================================================
        // REDUCE ANGULAR VELOCITY
        // ========================================================

        s.av *= .99;


        // ========================================================
        // CHASSIS DAMAGE
        //
        // This is separate from suspension landing damage.
        // The .05 means only 5% of this calculated chassis
        // damage is applied.
        // ========================================================

        const chassisDamage =
          dt *
          (
            4 +
            impact * 1.5
          ) *
          .05;


        s.health -=
          chassisDamage;
      }
    }


    // ============================================================
    // UPSIDE DOWN
    // ============================================================

    if (
      Math.cos(s.a) < .05 &&
      s.y <
        this.track.height(
          s.x,
          s.time
        ) + 2.2
    ) {

      s.upside +=
        dt;

    } else {

      s.upside =
        Math.max(
          0,
          s.upside -
          dt * 2
        );
    }


    // ============================================================
    // START OF AIRBORNE PERIOD
    // ============================================================

    if (
      was &&
      !s.grounded
    ) {

      s.air = 0;

      s.airStart =
        s.x;

      s.airAngle =
        oldA;

      s.airFlips = 0;
    }


    // ============================================================
    // AIRBORNE / FLIPS
    // ============================================================

    if (!s.grounded) {

      s.air +=
        dt;


      if (was) {

        events.push({
          type: 'jump'
        });
      }


      const totalFlips =
        Math.floor(
          Math.abs(
            s.a -
            s.airAngle
          ) /
          (Math.PI * 2)
        );


      if (
        totalFlips >
        s.airFlips
      ) {

        const newFlips =
          totalFlips -
          s.airFlips;


        events.push({
          type: 'stunt',

          name:
            s.a -
            s.airAngle > 0

              ? 'BACKFLIP'

              : 'FRONT FLIP',

          points:
            500 *
            newFlips
        });


        s.airFlips =
          totalFlips;
      }
    }


    // ============================================================
    // LANDING
    // ============================================================

    if (
      !was &&
      s.grounded
    ) {

      const slope =
        Math.atan(
          this.track.slope(
            s.x,
            s.time
          )
        );


      const error =
        Math.abs(
          wrap(
            s.a -
            slope
          )
        );


      const normalSpeed =
        Math.abs(
          oldVy -
          s.vx *
          Math.sin(slope)
        );


      // ========================================================
      // LANDING STUNT REWARDS
      // ========================================================

      if (s.air > .28) {

        events.push({
          type: 'landing',

          impact:
            normalSpeed
        });


        if (s.air > 1.1) {

          events.push({
            type: 'stunt',

            name:
              'BIG AIR',

            points:
              300
          });

        } else {

          events.push({
            type: 'stunt',

            name:
              'AIRTIME',

            points:
              Math.round(
                s.air * 60
              )
          });
        }


        // ======================================================
        // LONG JUMP
        // ======================================================

        if (
          s.x -
          s.airStart >
          16
        ) {

          events.push({
            type: 'stunt',

            name:
              'LONG JUMP',

            points:
              250
          });
        }


        // ======================================================
        // PERFECT LANDING
        // ======================================================

        if (
          error < .22 &&
          normalSpeed < 13
        ) {

          events.push({
            type: 'stunt',

            name:
              'PERFECT LANDING',

            points:
              200
          });
        }
      }


      // ==========================================================
      // SUSPENSION LANDING DAMAGE
      //
      // Level 0 = 8.5 HP
      // Level 1 = 7.4 HP
      // Level 2 = 5.5 HP
      // Level 3 = 4.9 HP
      // Level 4 = 3.0 HP
      // Level 5+ = 1.2 HP
      // ==========================================================

      const suspensionLevel =
        v.suspensionLevel ?? 0;


      let baseDamage;


      if (suspensionLevel <= 0) {

        baseDamage =
          8.5;

      } else if (suspensionLevel === 1) {

        baseDamage =
          7.4;

      } else if (suspensionLevel === 2) {

        baseDamage =
          5.5;

      } else if (suspensionLevel === 3) {

        baseDamage =
          4.9;

      } else if (suspensionLevel === 4) {

        baseDamage =
          3.0;

      } else {

        baseDamage =
          1.2;
      }


      // ==========================================================
      // HARD FALL DAMAGE
      //
      // No extra damage below 10 normal-speed.
      // Above 10, damage increases with impact speed.
      // ==========================================================

      const fallDamage =
        Math.max(
          0,
          normalSpeed - 10
        ) * .25;


      // ==========================================================
      // BAD LANDING ANGLE DAMAGE
      // ==========================================================

      const angleDamage =
        error > 1.3
          ? 1
          : 0;


      // ==========================================================
      // FINAL LANDING DAMAGE
      //
      // IMPORTANT:
      // There is NO 5 HP cap here.
      // Your suspension values are therefore actually used.
      // ==========================================================

      const landingDamage =
        baseDamage +
        fallDamage +
        angleDamage;


      // ==========================================================
      // REMOVE HEALTH
      // ==========================================================

      s.health -=
        landingDamage;


      // Reset airborne timer
      s.air = 0;
    }


    // ============================================================
    // OUT OF FUEL
    // ============================================================

    if (
      s.fuel <= 0
    ) {

      s.empty +=
        dt;


      if (
        Math.abs(s.vx) < .5 &&
        s.empty > 2
      ) {

        s.dead =
          'OUT OF FUEL';
      }


      if (
        s.empty > 14
      ) {

        s.dead =
          'OUT OF FUEL';
      }
    }


    // ============================================================
    // VEHICLE WRECKED
    // ============================================================

    if (
      s.health <= 0 ||
      s.upside > 1.8
    ) {

      s.dead =
        'VEHICLE WRECKED';
    }


    // ============================================================
    // LOST IN VALLEY
    // ============================================================

    if (
      s.y <
      this.track.base(
        s.x
      ) - 30
    ) {

      s.dead =
        'LOST IN THE VALLEY';
    }


    // ============================================================
    // HEALTH CLAMP
    // ============================================================

    s.health =
      clamp(
        s.health,
        0,
        100
      );


    return events;
  }
}