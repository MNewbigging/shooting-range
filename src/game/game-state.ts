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

/**
 * TODO:
 * - Move all of first scene into game state
 * - Then have the render pipeline create the renderer
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

  constructor(private gameLoader: GameLoader) {
    makeAutoObservable(this);

    // Setup render pipeline
    this.camera = this.setupCamera();
    this.renderPipeline = new RenderPipeline(this.scene, this.camera);

    // Listeners
    this.mouseListener = new MouseListener();
    this.keyboardListener = new KeyboardListener();
    this.events = new EventListener();

    // Handle pointer lock events
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("pointerlockerror", this.onPointerLockError);

    // Setup
    this.setupLights();
    this.setupObjects();

    const range = this.gameLoader.modelLoader.shootingRange;
    this.scene.add(range);

    // Extract targets from the main scene object
    this.targetManager = new TargetManager(range, this.events);

    this.controls = new PointerLockControls(
      this.camera,
      this.renderPipeline.canvas
    );
    this.controls.addEventListener("change", this.onCameraMove);

    this.scene.background = new THREE.Color("#1680AF");

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

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (!this.paused) {
      this.targetManager.update(dt);

      TWEEN.update();
      this.renderPipeline.render(dt);
    }
  };

  private onCameraMove = () => {
    const { pistol } = this.gameLoader.modelLoader;

    // First clear any outlines
    this.renderPipeline.clearOutlines();

    const interactive = [pistol];

    // Test for intersections against interactive objects
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    for (const object of interactive) {
      const intersections = this.raycaster.intersectObject(object, true);
      if (intersections.length) {
        this.renderPipeline.outlineObject(object);
        break;
      }
    }
  };
}
