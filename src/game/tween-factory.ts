import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Gun } from "./gun";

export function tilAnimEnd(tween: TWEEN.Tween<any>): Promise<void> {
  return new Promise<void>((resolve) => {
    tween.onComplete(() => resolve()).start();
  });
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
    const targetRot = gun.lowerValues.x;
    const targetPos = gun.holdPosition.y + gun.lowerValues.y;

    return new TWEEN.Tween(gun.object).to(
      {
        position: { y: targetPos },
        rotation: { x: targetRot },
      },
      300
    );
  }

  static raiseGun(gun: Gun) {
    return new TWEEN.Tween(gun.object).to(
      {
        position: { y: gun.holdPosition.y },
        rotation: { x: 0 },
      },
      300
    );
  }
}
