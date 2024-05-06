import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { Gun } from "./gun";
import { addGui, getChildIncludesName, randomRange } from "../utils/utils";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
/**
 * Target logic:
 *
 * 2 modes - default and timed
 *
 * Timed:
 * - All targets become active immediately
 * - player must shoot each target once
 * - once all targets are shot, mode ends and time taken is displayed
 *
 * Default:
 * - Targets become active at random
 * - Targets remain active until shot
 *
 * When not in timed mode, enter default mode.
 *
 * Would be good to place the targets in blender, but I need to control in code...
 * How do I do the sliders? I can grab them and move them, but I need to know end points...
 */
interface Target {
  object: THREE.Object3D;
  hit: boolean;
  flipCooldown: number;
}

// Is the separation of types a good thing?
interface SliderTarget extends Target {
  start: THREE.Vector3;
  end: THREE.Vector3;
  moveTo: THREE.Vector3;
  speed: number;
}

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: PointerLockControls;

  private gun: Gun;

  private targets: Target[] = [];
  private sliders: SliderTarget[] = [];

  private targetBodyMap = new Map<string, Target>();
  private targetFlipCd = 0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private gameLoader: GameLoader,
    private mouseListener: MouseListener,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {
    this.controls = new PointerLockControls(
      this.camera,
      this.renderer.domElement
    );

    this.setupCamera();
    this.setupLights();
    this.setupObjects();
    this.gun = this.setupGun();

    this.scene.background = new THREE.Color("#1680AF");
  }

  getCamera() {
    return this.camera;
  }

  update(dt: number, elapsed: number) {
    // Update
    this.gun.update(dt, elapsed);

    // Targets
    this.sliders.forEach((slider) => this.moveSlider(slider, dt));

    // Flip targets
    //this.flipTargets(dt);

    // Draw
    this.renderer.render(this.scene, this.camera);
  }

  private setupCamera() {
    this.camera.fov = 75;
    this.camera.far = 500;
    this.camera.near = 0.1;
    const canvas = this.renderer.domElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.position.set(0, 1.7, 2);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI / 2);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private setupObjects() {
    const { modelLoader } = this.gameLoader;

    const range = modelLoader.get("shooting-range");
    this.scene.add(range);

    range.children.forEach((child) => {
      if (!child.name.includes("target")) {
        return;
      }

      // Create a target object
      const target: Target = { object: child, hit: false, flipCooldown: 0 };
      this.targets.push(target);

      // Always add to the body map and targets array
      const body = getChildIncludesName(child, "body");
      if (body) {
        this.targetBodyMap.set(body.name, target);
      }

      // Is this a slider target?
      if (child.name.includes("slider")) {
        // Get the start and end positions
        const start = getChildIncludesName(child, "start")?.getWorldPosition(
          new THREE.Vector3()
        );
        const end = getChildIncludesName(child, "end")?.getWorldPosition(
          new THREE.Vector3()
        );
        if (start && end) {
          // Create a slider object
          this.sliders.push({
            ...target,
            start,
            end,
            moveTo: end,
            speed: randomRange(0.5, 2),
          });
        }
      }
    });
  }

  private setupGun() {
    return new Gun(
      this.gameLoader,
      this.mouseListener,
      this.scene,
      this.camera,
      this.onShootSomething,
      {
        name: "pistol",
        firingModeName: "semi-auto",
        rpm: 320,
      }
    );
  }

  private moveSlider(slider: SliderTarget, dt: number) {
    // Move towards target
    const direction = slider.moveTo
      .clone()
      .sub(slider.object.position)
      .normalize();
    slider.object.position.add(direction.multiplyScalar(dt * slider.speed));

    // If at target, reverse
    const distance = slider.object.position.distanceTo(slider.moveTo);
    if (distance <= 0.05) {
      slider.moveTo = slider.moveTo.equals(slider.start)
        ? slider.end
        : slider.start;
    }
  }

  private onShootSomething = (intersection: THREE.Intersection) => {
    // If we shot a target's body, get the target from the body name here
    const target = this.targetBodyMap.get(intersection.object.name);
    if (!target) {
      return;
    }

    // So long as this target wasn't already in the hit position
    if (!target.hit) {
      // Hit it
      target.hit = true;

      // Flip backwards - target bodies are children so this local rotation just works!
      const body = intersection.object;
      const start = body.rotation.x;
      new TWEEN.Tween(body.rotation)
        .to({ x: start - Math.PI / 2 }, 250)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

      // Flip it upright after a random interval
    }
  };

  // todo - this flips immediately when hitting first target, because timer hasn't been set
  // could flip based on last hit time

  // check for flipping at random intervals (smaller intervals when more are flipped)
  // can only flip a target that was hit more than n seconds ago

  private flipTargets(dt: number) {
    // Count down random flip timer
    this.targetFlipCd -= dt;

    if (this.targetFlipCd > 0) {
      return;
    }

    // Time to flip - pick a random target to flip back up
    const toFlip = this.targets.filter((t) => t.hit);
    if (!toFlip.length) {
      return;
    }

    const rnd = Math.floor(Math.random() * toFlip.length);
    const target = toFlip[rnd];

    // No longer hit
    target.hit = false;

    // Rotate the body child back up
    const body = getChildIncludesName(target.object, "body");
    if (body) {
      const start = body.rotation.x;
      new TWEEN.Tween(body.rotation)
        .to({ x: start + Math.PI / 2 }, 250)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    }

    // Reset timer - faster when more are flipped
    const time = this.targets.length - toFlip.length - 2;
    this.targetFlipCd = Math.max(1, time);
  }
}
