import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { Gun } from "./gun";
import { addGui } from "../utils/utils";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
import { TargetManager } from "./target-manager";
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

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: PointerLockControls;

  private gun: Gun;
  private targetManager: TargetManager;

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
    this.gun = this.setupGun();

    // Get the scene object
    const range = this.gameLoader.modelLoader.get("shooting-range");
    this.scene.add(range);

    // Extract targets from the main scene object
    this.targetManager = new TargetManager(range, this.events);

    this.scene.background = new THREE.Color("#1680AF");
  }

  getCamera() {
    return this.camera;
  }

  update(dt: number, elapsed: number) {
    // Update
    this.gun.update(dt, elapsed);

    // Targets
    this.targetManager.update(dt);

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

  private setupGun() {
    return new Gun(
      this.gameLoader,
      this.mouseListener,
      this.scene,
      this.camera,
      this.events,
      {
        name: "pistol",
        firingModeName: "semi-auto",
        rpm: 320,
      }
    );
  }
}
