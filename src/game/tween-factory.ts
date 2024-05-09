import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Gun } from "./guns/gun";

export function tilAnimEnd(tween: TWEEN.Tween<any>): Promise<void> {
  return new Promise<void>((resolve) => {
    tween.onComplete(() => resolve()).start();
  });
}
type UnknownProps = Record<string, any>;
export class ChainedTween {
  // Assumes an ordered array of tweens to chain of length 2+
  constructor(private tweens: TWEEN.Tween<UnknownProps>[], loop = false) {
    // Chain each tween to the previous
    if (tweens.length <= 1) {
      return;
    }

    for (let i = 1; i < tweens.length; i++) {
      const previousTween = tweens[i - 1];
      const currentTween = tweens[i];

      previousTween.chain(currentTween);
    }

    if (loop) {
      const lastTween = tweens[tweens.length - 1];
      const firstTween = tweens[0];

      lastTween.chain(firstTween);
    }
  }

  start() {
    this.tweens[0].start();
  }

  stop() {
    // Ideally have some ref to the current tween
    this.tweens.forEach((tween) => tween.stop());
  }

  pause() {
    // Ideally have some ref to the current tween
    this.tweens.forEach((tween) => tween.pause());
  }

  resume() {
    // Ideally have some ref to the current tween
    this.tweens.forEach((tween) => tween.resume());
  }

  update() {
    this.tweens.forEach((tween) => tween.update());
  }
}

export class TweenFactory {
  static pickupGun(gun: Gun, targetPos: THREE.Vector3) {
    // Keep the object at its own height in the scene
    targetPos.y = gun.object.position.y;

    return new TWEEN.Tween(gun.object.position)
      .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 250)
      .easing(TWEEN.Easing.Quadratic.In);
  }

  static showGun(gun: Gun) {
    const target = gun.holdPosition.clone();

    // Animate from current off-screen pos into holding position
    return new TWEEN.Tween(gun.object)
      .to(
        {
          position: { x: target.x, y: target.y, z: target.z },
          rotation: { x: 0 },
        },
        250
      )
      .easing(TWEEN.Easing.Back.Out);
  }

  static hideGun(gun: Gun) {
    return new TWEEN.Tween(gun.object)
      .to(
        {
          position: { y: -1 },
          rotation: { x: -Math.PI },
        },
        250
      )
      .easing(TWEEN.Easing.Quadratic.In);
  }

  static lowerGun(gun: Gun) {
    const targetRot = gun.lowerRotationMod.x;
    const targetPos = gun.holdPosition.y + gun.lowerPositionMod.y;

    return new TWEEN.Tween(gun.object).to(
      {
        position: { y: targetPos },
        rotation: { x: targetRot },
      },
      250
    );
  }

  static raiseGun(gun: Gun) {
    return new TWEEN.Tween(gun.object).to(
      {
        position: { y: gun.holdPosition.y },
        rotation: { x: 0 },
      },
      250
    );
  }

  static idleGun(gun: Gun) {
    const startPos = gun.holdPosition.y;
    const targetPos = startPos + 0.01;

    const up = new TWEEN.Tween(gun.object.position).to({ y: targetPos }, 1500);
    const down = new TWEEN.Tween(gun.object.position).to({ y: startPos }, 1500);

    const chainedTween = new ChainedTween([up, down], true);

    return chainedTween;
  }

  static recoilGun(gun: Gun, onComplete: () => void) {
    const startPos = gun.object.position.clone();
    const startRot = gun.object.rotation.x;

    const targetPos = startPos.clone().add(gun.recoilOffset);
    const targetRot = startRot + 0.1;

    // Seconds between shots to milliseconds, halved because it needs to return to start pos
    const maxTime = gun.timeBetweenShots * 1000 * 0.5;
    const duration = maxTime * 0.5;

    const out = new TWEEN.Tween(gun.object).to(
      {
        position: { y: targetPos.y, z: targetPos.z },
        rotation: { x: targetRot },
      },
      duration
    );

    const back = new TWEEN.Tween(gun.object)
      .to(
        {
          position: { y: startPos.y, z: startPos.z },
          rotation: { x: startRot },
        },
        duration
      )
      .onComplete(onComplete);

    out.chain(back);

    return out;
  }
}
