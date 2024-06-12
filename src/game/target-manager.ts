import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { getChildIncludesName, randomRange } from "../utils/utils";
import { EventListener } from "../listeners/event-listener";
import { action, makeAutoObservable, observable } from "mobx";

interface Target {
  object: THREE.Object3D; // has a parent 'base' and child 'body'
  body: THREE.Object3D; // the 'body' child
  flipped: boolean; // whether it has been shot and is in the flipped state
  flipCooldown: number; // how long until this is flipped back upright

  // Might be a moving target if it has these props
  sliderProps?: SliderProps;
}

interface SliderProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  moveTo: THREE.Vector3;
  speed: number;
}

export class TargetManager {
  @observable targetsHit = 0;
  public targetsTotal = 0;
  private targets: Target[] = [];

  // Needs to be given the range scene object to extract targets from
  constructor(rangeObject: THREE.Object3D, private events: EventListener) {
    makeAutoObservable(this);

    // Targets should only be a top-level child
    rangeObject.children.forEach((child) => {
      if (child.name.includes("target")) {
        // Create a target object for this child
        const target = this.createTarget(child);
        if (target) {
          // Keep track of it for later
          this.targets.push(target);
        }
      }
    });

    this.targetsTotal = this.targets.length;

    // Listen for
    this.events.on("shot-intersect", this.onShotIntersect);
  }

  @action resetAllTargets() {
    this.targets.forEach((target) => {
      if (target.flipped) {
        this.flipTargetUpright(target);
      }
    });
    this.targetsHit = 0;
  }

  update(dt: number) {
    this.targets.forEach((target) => {
      // If flipped
      // if (target.flipped) {
      //   target.flipCooldown -= dt;

      //   if (target.flipCooldown < 0) {
      //     this.flipTargetUpright(target);
      //   }
      // }

      // Move it (no-op for non-sliders)
      this.moveSlider(target, dt);
    });
  }

  private createTarget(object: THREE.Object3D) {
    // Find the body child for this target first
    const body = getChildIncludesName(object, "body");
    if (!body) {
      return;
    }

    // Create the target object
    const target: Target = {
      object,
      body: body,
      flipped: false,
      flipCooldown: 0,
    };

    // If it's a slider, add slider props to the target
    if (object.name.includes("slider")) {
      // Get the start and end positions
      const start = getChildIncludesName(object, "start")?.getWorldPosition(
        new THREE.Vector3()
      );
      const end = getChildIncludesName(object, "end")?.getWorldPosition(
        new THREE.Vector3()
      );
      if (start && end) {
        // Create a slider props object
        const sliderProps: SliderProps = {
          start,
          end,
          moveTo: end,
          speed: randomRange(0.5, 2),
        };

        // Add it to the target
        target.sliderProps = sliderProps;
      }
    }

    return target;
  }

  private flipTargetUpright(target: Target) {
    // No longer flipped
    target.flipped = false;

    new TWEEN.Tween(target.body.rotation)
      .to({ x: 0 }, 250)
      .easing(TWEEN.Easing.Quadratic.In)
      .start();
  }

  private moveSlider(target: Target, dt: number) {
    // Cannot move without slider props
    if (!target.sliderProps) {
      return;
    }

    // Move towards target
    const direction = target.sliderProps.moveTo
      .clone()
      .sub(target.object.position)
      .normalize();
    target.object.position.add(
      direction.multiplyScalar(dt * target.sliderProps.speed)
    );

    // If at target, reverse
    const distance = target.object.position.distanceTo(
      target.sliderProps.moveTo
    );
    if (distance <= 0.05) {
      target.sliderProps.moveTo = target.sliderProps.moveTo.equals(
        target.sliderProps.start
      )
        ? target.sliderProps.end
        : target.sliderProps.start;
    }
  }

  @action onShotIntersect = (intersection: THREE.Intersection) => {
    // Was a target's body shot?
    const target = this.targets.find(
      (t) => t.body.name === intersection.object.name
    );
    if (!target) {
      return;
    }

    // Is this target already flipped?
    if (target.flipped) {
      return; // nothing happens then!
    }

    // Flip the target
    target.flipped = true;
    //target.flipCooldown = randomRange(1.5, 5); // flips back randomly

    this.targetsHit++;

    const wasLastTarget = this.allTargetsFlipped();

    // Animte the flip
    new TWEEN.Tween(target.body.rotation)
      .to({ x: -Math.PI / 2 }, 150)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onComplete(() => {
        if (wasLastTarget) {
          this.resetAllTargets();
        }
      })
      .start();
  };

  private allTargetsFlipped() {
    return this.targets.every((target) => target.flipped);
  }
}
