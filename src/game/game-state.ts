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
import { TweenFactory, tilAnimEnd } from "./tween-factory";

/**
 * TODO:
 * - Move all of first scene into game state
 * - Then have the render pipeline create the renderer
 *
 * - Click callback priority/order:
 * -- Pick up / interact
 * -- Shoot (shouldn't shoot things you interact with)
 */

// Keeping track of common properties/functions of held items
interface Item {
  update(dt: number): void;
  equip(): void;
  unequip(): void;
  lower(): void;
  lowered: boolean; // either lowered or not
}

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
  private lowerEquipped = false;
  private lowerAnim?: TWEEN.Tween<any>;
  private raiseAnim?: TWEEN.Tween<any>;

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
    this.setupRifle();

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
      new THREE.Vector3(0.15, -0.2, -0.5),
      new THREE.Vector2(-Math.PI / 4, -0.2),
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

  private setupRifle() {
    const rifle = this.gameLoader.modelLoader.rifle;

    const texture = this.gameLoader.textureLoader.get("weapon-26");
    if (texture) {
      TextureLoader.applyModelTexture(rifle, texture);
    }

    rifle.position.set(0.8, 1.05, 1.2);
    rifle.rotateY(Math.PI - 0.2);
    rifle.rotateZ(Math.PI / 2);
    this.scene.add(rifle);

    const rifleGun = new Gun(
      rifle,
      new THREE.Vector3(0.15, -0.2, -0.3),
      new THREE.Vector2(-Math.PI / 4.5, -0.15),
      this.gameLoader,
      this.mouseListener,
      this.keyboardListener,
      this.events,
      this.scene,
      this.camera,
      "auto",
      480
    );

    this.tableGuns.push(rifleGun);
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
        this.lowerEquippedGun();

        return;
      }
    }

    // Not looking at any table guns we can't shoot
    this.stopLoweringEquippedGun();
  };

  private lowerEquippedGun() {
    // If we're already lowered, can stop
    if (this.lowerEquipped) {
      return;
    }

    this.lowerEquipped = true;

    // If raising, stop
    this.raiseAnim?.stop();
    this.raiseAnim = undefined;

    // Is the lower animation already underway?
    if (!this.lowerAnim && this.equippedGun) {
      // Create it
      this.lowerAnim = TweenFactory.lowerGun(this.equippedGun);
      this.lowerAnim.onComplete(() => {
        this.lowerAnim = undefined;
      });
      this.lowerAnim.onStart(() => console.log("lowering"));

      // Disable gun for now
      this.equippedGun.disable();
      this.lowerAnim.start();
    }
  }

  private stopLoweringEquippedGun() {
    if (!this.lowerEquipped) {
      return;
    }

    this.lowerEquipped = false;

    // If still lowering, stop
    this.lowerAnim?.stop();
    this.lowerAnim = undefined;

    // If there is a gun to raise, raise it
    if (!this.raiseAnim && this.equippedGun) {
      this.raiseAnim = TweenFactory.raiseGun(this.equippedGun);
      this.raiseAnim.onComplete(() => {
        this.raiseAnim = undefined;
        this.equippedGun?.enable();
      });
      this.raiseAnim.onStart(() => console.log("raising"));
      this.raiseAnim.start();
    }
  }

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

  private async pickupGun(gun: Gun) {
    // Begin the pickup animation - move to just below camera
    const targetPos = this.camera.position.clone();

    await tilAnimEnd(TweenFactory.pickupGun(gun, targetPos));

    // Remove from table guns
    this.tableGuns = this.tableGuns.filter((g) => g.object !== gun.object);

    // Add to held guns
    this.heldGuns.push(gun);

    // Reset any rotation so it faces the right way
    gun.object.rotation.set(0, Math.PI, 0);

    // Hide it until ready to show
    gun.object.visible = false;

    // Equip straight away
    this.equipGun(gun);
  }

  private async equipGun(gun: Gun) {
    // Unequip then hide the current gun
    if (this.equippedGun) {
      this.equippedGun.disable();
      await tilAnimEnd(TweenFactory.hideGun(gun));
      this.camera.remove(this.equippedGun.object);
    }

    // Add new gun to the camera straight away
    this.camera.add(gun.object);

    // Position it ready for the show animation
    gun.object.position.set(gun.holdPosition.x, -1, gun.holdPosition.z);
    gun.object.rotation.x = -Math.PI;

    // Start the show animation
    await tilAnimEnd(TweenFactory.showGun(gun));

    // This gun is now equipped
    gun.enable();
    this.equippedGun = gun;
  }
}
