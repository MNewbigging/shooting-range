import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { Gun } from "./gun";
import { addGui, getChildIncludesName, randomRange } from "../utils/utils";

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
}

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

  constructor(
    private renderer: THREE.WebGLRenderer,
    private gameLoader: GameLoader,
    private mouseListener: MouseListener
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

    // Sliders
    this.sliders.forEach((slider) => this.moveSlider(slider, dt));

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
      const target: Target = { object: child, hit: false };

      // Always add to the body map
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
      } else {
        // Create a target object
        this.targets.push(target);
      }
    });

    console.log("targets", this.targets);
    console.log("sliders", this.sliders);
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
    // // Determine if this was a target body
    // if (hit.object.name.includes("body")) {
    //   // If this target isn't already in the hit position

    //   // Rotate the target back
    //   hit.object.rotateX(-Math.PI / 2);
    // }

    const target = this.targetBodyMap.get(intersection.object.name);
    if (!target) {
      return;
    }

    if (!target.hit) {
      target.hit = true;

      const body = target.object.getObjectByName(intersection.object.name);
      if (!body) {
        return;
      }

      // flip backwards
      // const forwards = target.object.getWorldDirection(new THREE.Vector3());
      // const sidewards = new THREE.Vector3()
      //   .crossVectors(new THREE.Vector3(0, 1, 0), forwards)
      //   .normalize();
      // body.setRotationFromAxisAngle(sidewards, -Math.PI / 2);

      //body.rotateX(-Math.PI / 2);
      // this works but sends copies into space?!
    }
  };
}
