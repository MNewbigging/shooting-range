import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { makeAutoObservable, observable } from "mobx";
import { MouseListener } from "../listeners/mouse-listener";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
import { RenderPipeline } from "./render-pipeline";
import { TextureLoader } from "../loaders/texture-loader";
import { TargetManager } from "./target-manager";
import { Gun } from "./gun";

/**
 * TODO:
 * - Move all of first scene into game state
 * - Then have the render pipeline create the renderer
 *
 * - Click callback priority/order:
 * -- Pick up / interact
 * -- Shoot (shouldn't shoot things you interact with)
 */

export class GameState {
  @observable paused = false;

  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();
  private controls: PointerLockControls;
  private raycaster = new THREE.Raycaster();

  private mouseListener: MouseListener;
  private keyboardListener: KeyboardListener;
  private events: EventListener;

  private targetManager: TargetManager;
  private tableGuns: Gun[] = []; // in the world
  private heldGuns: Gun[] = []; // on the player
  private equippedGun?: Gun; // in player's hands

  constructor(private gameLoader: GameLoader) {
    makeAutoObservable(this);

    // Render pipeline
    this.camera = this.setupCamera();
    this.scene.add(this.camera);
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    // Listeners
    this.mouseListener = new MouseListener();
    this.keyboardListener = new KeyboardListener();
    this.events = new EventListener();

    this.mouseListener.addListener("mousedown", this.onMouseDown);

    // Handle pointer lock events
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("pointerlockerror", this.onPointerLockError);

    // Setup game scene
    this.scene.background = new THREE.Color("#1680AF");
    this.setupLights();
    this.setupPistol();

    const range = this.gameLoader.modelLoader.shootingRange;
    this.scene.add(range);
    this.targetManager = new TargetManager(range, this.events);

    this.controls = new PointerLockControls(
      this.camera,
      this.renderPipeline.canvas
    );
    this.controls.addEventListener("change", this.onCameraMove);

    // Start game
    this.update();
  }

  resumeGame = () => {
    this.renderPipeline.canvas.requestPointerLock();
    this.paused = false;
    this.mouseListener.enable();
  };

  private onPointerLockChange = () => {
    // If exiting
    if (document.pointerLockElement !== this.renderPipeline.canvas) {
      this.pauseGame();
    }
  };

  private onPointerLockError = () => {
    this.pauseGame();
  };

  private pauseGame() {
    this.paused = true;
    this.mouseListener.disable();
  }

  private setupCamera() {
    const camera = new THREE.PerspectiveCamera();
    camera.fov = 75;
    camera.far = 500;
    camera.near = 0.1;
    camera.position.set(0, 1.7, 1.2);

    return camera;
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(undefined, 0.25);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight(undefined, Math.PI / 2);
    directLight.position.copy(new THREE.Vector3(0.75, 1, 0.75).normalize());
    this.scene.add(directLight);
  }

  private setupPistol() {
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

    // Create the gun class for the pistol
    const pistolGun = new Gun(
      pistol,
      this.gameLoader,
      this.mouseListener,
      this.keyboardListener,
      this.events,
      this.scene,
      this.camera,
      "semi-auto",
      120
    );

    // Add it to the table guns
    this.tableGuns.push(pistolGun);
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();
    //const elapsed = this.clock.getElapsedTime();

    if (!this.paused) {
      // Targets
      this.targetManager.update(dt);

      // Active item
      this.equippedGun?.update(dt);

      // Animations
      TWEEN.update();

      // Draw
      this.renderPipeline.render(dt);
    }
  };

  private onCameraMove = () => {
    // First clear any outlines
    this.renderPipeline.clearOutlines();

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    // Are we looking at a table gun?
    for (const gun of this.tableGuns) {
      const intersections = this.raycaster.intersectObject(gun.object, true);
      if (intersections.length) {
        this.renderPipeline.outlineObject(gun.object);
        break;
      }
    }
  };

  private onMouseDown = () => {
    // Check for left click
    if (!this.mouseListener.lmb) {
      return;
    }

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    // Check for clicks on table guns
    for (const gun of this.tableGuns) {
      const intersections = this.raycaster.intersectObject(gun.object);
      if (intersections.length) {
        // Pick it up
        this.pickupGun(gun);
        return;
      }
    }
  };

  private pickupGun(gun: Gun) {
    // Begin the pickup animation - move to just below camera
    const targetPos = this.camera.position.clone();
    targetPos.y = gun.object.position.y;

    new TWEEN.Tween(gun.object.position)
      .to({ x: targetPos.x, y: targetPos.y, z: targetPos.z }, 200)
      .easing(TWEEN.Easing.Quadratic.In)
      .start()
      .onComplete(() => {
        // Remove from table guns
        this.tableGuns = this.tableGuns.filter((g) => g.object !== gun.object);

        // Add to held guns
        this.heldGuns.push(gun);

        // Reset any rotation so it faces the right way
        gun.object.rotation.set(0, Math.PI, 0);

        // Equip straight away
        this.equipGun(gun);
      });
  }

  private equipGun(gun: Gun) {
    // Unequip then hide the current gun

    // Then remove it from the camera

    // Add new gun to the camera straight away
    this.camera.add(gun.object);

    // Position it ready for the show animation
    gun.object.position.set(gun.holdPosition.x, -1, gun.holdPosition.z);
    gun.object.rotation.x = -Math.PI;

    // Start the show animation
    // todo cancel this if swapping before shown
    const showAnim = this.getShowGunAnim(gun);
    showAnim.start().onComplete(() => {
      gun.equip();
      this.equippedGun = gun;
    });
  }

  private getShowGunAnim(gun: Gun) {
    const target = gun.holdPosition.clone();
    const startRotX = gun.object.rotation.x;

    // Animate from current off-screen pos into holding position
    return new TWEEN.Tween(gun.object)
      .to(
        {
          position: { x: target.x, y: target.y, z: target.z },
          rotation: { x: startRotX + Math.PI },
        },
        250
      )
      .easing(TWEEN.Easing.Back.Out);
  }

  private hideGun() {}
}

/**
 * I deliberately test intersections against a particular object3d, so I know what to do on click
 *
 * What if I could:
 * - create the gun class, give it the gun object ref
 * - position the gun in the world
 *
 * - test for intersections against the scene
 * - if I click a gun, then pick it up
 *
 * might avoid more custom/specific logic
 */
