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
  private raycaster = new THREE.Raycaster();

  // Listeners
  private mouseListener: MouseListener;
  private keyboardListener: KeyboardListener;
  private events: EventListener;

  // Game
  targetManager: TargetManager;
  equipmentManager: EquipmentManager;
  generator: THREE.Object3D;

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
    this.setupLights();

    const range = this.gameLoader.modelLoader.shootingRange;
    this.scene.add(range);

    const spawn = range.getObjectByName("Spawn");
    if (spawn) {
      this.camera.position.copy(spawn.position);
      this.camera.position.y = 1.7;
      this.camera.rotateY(-Math.PI / 2);
    }

    this.generator = range.getObjectByName("Generator") ?? new THREE.Object3D();
    this.mouseListener.addListener("mousedown", this.onMousedown);

    this.targetManager = new TargetManager(range, this.events);

    this.equipmentManager = new EquipmentManager(
      this.scene,
      this.camera,
      this.gameLoader,
      this.keyboardListener,
      this.mouseListener,
      this.events,
      this.raycaster
    );
    this.equipmentManager.setup();

    this.controls = new PointerLockControls(
      this.camera,
      this.renderPipeline.canvas
    );
    this.controls.addEventListener("change", this.onCameraMove);

    const hdri = this.gameLoader.textureLoader.get("hdri");
    if (hdri) {
      this.scene.environment = hdri;
      this.scene.background = hdri;
    }

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

    // Get the object to outline, if any
    const lookingAtObject = this.isLookingAtGenerator()
      ? this.generator
      : this.equipmentManager.getLookedAtTableGun()?.object;

    if (lookingAtObject) {
      this.renderPipeline.outlineObject(lookingAtObject);
      this.equipmentManager.lowerEquippedItem();
    } else {
      this.equipmentManager.raiseEquippedItem();
    }
  };

  private isLookingAtGenerator() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObject(this.generator, false);
    return !!intersections.length;
  }

  private onMousedown = () => {
    // If looking at the generator, use it
    if (this.isLookingAtGenerator()) {
      this.targetManager.resetAllTargets();
    }
  };
}
