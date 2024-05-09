import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { makeAutoObservable, observable } from "mobx";
import { MouseListener } from "../listeners/mouse-listener";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
import { RenderPipeline } from "./render-pipeline";
import { TargetManager } from "./target-manager";
import { EquipmentManager } from "./equipment-manager";

export class GameState {
  @observable paused = false;

  // High-level threejs stuff
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();
  private controls: PointerLockControls;

  // Listeners
  private mouseListener: MouseListener;
  private keyboardListener: KeyboardListener;
  private events: EventListener;

  // Game
  private targetManager: TargetManager;
  private equipmentManager: EquipmentManager;

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

    // Handle pointer lock events
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("pointerlockerror", this.onPointerLockError);

    // Setup game scene
    this.scene.background = new THREE.Color("#1680AF");
    this.setupLights();

    const range = this.gameLoader.modelLoader.shootingRange;
    this.scene.add(range);
    this.targetManager = new TargetManager(range, this.events);

    this.equipmentManager = new EquipmentManager(
      this.scene,
      this.camera,
      this.gameLoader,
      this.keyboardListener,
      this.mouseListener,
      this.events
    );
    this.equipmentManager.setup();

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
    camera.near = 0.01;
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

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();
    //const elapsed = this.clock.getElapsedTime();

    if (!this.paused) {
      // Targets
      this.targetManager.update(dt);

      // Equipment
      this.equipmentManager.update(dt);

      // Animations
      TWEEN.update();

      // Draw
      this.renderPipeline.render(dt);
    }
  };

  private onCameraMove = () => {
    // First clear any outlines for this frame
    this.renderPipeline.clearOutlines();

    // Are we looking at a table gun?
    const gun = this.equipmentManager.getLookedAtTableGun();
    if (gun) {
      this.renderPipeline.outlineObject(gun.object);
      this.equipmentManager.lowerEquippedItem();
    } else {
      this.equipmentManager.raiseEquippedItem();
    }

    /**
     * Slightly odd control above - the mgr has the lookedAtGun, but we need it here
     * and we're telling mgr how to react to its own knowledge...
     *
     * This class needs to know whether to outline something
     * The mgr needs to know whether to raise or lower an item
     *
     * Listening to camera move is better places at this high level, for control
     *
     * I could have the mgr provide an event for 'looking at table gun' but it's a bit specific...
     */
  };
}
