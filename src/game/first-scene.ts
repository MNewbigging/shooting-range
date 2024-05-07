import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { Gun } from "./gun";
import { addGui } from "../utils/utils";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
import { TargetManager } from "./target-manager";
import { TextureLoader } from "../loaders/texture-loader";
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

/**
 * How to equip items?
 *
 * - Pick it up from the world by left-clicking it
 * - It gets added to an array of equipped items (index + 1 is hotkey)
 *
 * When picking up item or pressing equipped item hotkey:
 * - Hide the current item, if any
 * - Show the new item
 *
 * So I need:
 * - a ref to the current item in order to hide it
 * - a ref to the new item in order to show it
 *
 * To test:
 * - put the gun object on the table (try without making the gun class)
 * - outline pass on hover
 * - on left click, put it hands without show anim
 *
 * Then:
 * - add a show animation to newly picked up gun
 * - add another gun, test swapping...
 *
 */
interface EquippableItem {}

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: PointerLockControls;

  private targetManager: TargetManager;

  // Equipped items
  private equippedItems = []; // First slot is always empty
  private currentItem = 0;

  // All the guns found in the game
  //private gun: Gun;

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

    // Get the scene object
    const range = this.gameLoader.modelLoader.shootingRange;
    this.scene.add(range);

    // Extract targets from the main scene object
    this.targetManager = new TargetManager(range, this.events);

    this.scene.background = new THREE.Color("#1680AF");
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  update(dt: number, elapsed: number) {
    // Update
    //Need a ref to the current item to update itthis.gun.update(dt, elapsed);

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
    this.camera.position.set(0, 1.7, 1.2);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI / 2);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private setupObjects() {
    const pistol = this.gameLoader.modelLoader.pistol;

    // Apply the basic weapon skin to the pistol
    const texture = this.gameLoader.textureLoader.get("weapon-26");
    if (texture) {
      TextureLoader.applyModelTexture(pistol, texture);
    }

    // Place the pistol object on the table

    pistol.position.set(0.8, 1.05, 0.5);
    pistol.rotateY(Math.PI + 0.5);
    pistol.rotateZ(Math.PI / 2);
    this.scene.add(pistol);
  }

  private setupGun() {
    // Pistol
    return new Gun(
      this.gameLoader,
      this.mouseListener,
      this.keyboardListener,
      this.events,
      this.scene,
      this.camera,
      this.gameLoader.modelLoader.pistol,
      "semi-auto",
      120
    );
  }
}
