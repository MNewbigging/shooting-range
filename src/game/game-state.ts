import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { GameLoader } from "../loaders/game-loader";
import { FirstScene } from "./first-scene";
import { makeAutoObservable, observable } from "mobx";
import { MouseListener } from "../listeners/mouse-listener";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { EventListener } from "../listeners/event-listener";
import { RenderPipeline } from "./render-pipeline";

export class GameState {
  @observable paused = false;

  private renderPipeline: RenderPipeline;
  private clock = new THREE.Clock();

  private mouseListener: MouseListener;
  private keyboardListener: KeyboardListener;
  private events: EventListener;

  private firstScene: FirstScene;

  constructor(private gameLoader: GameLoader) {
    makeAutoObservable(this);

    // Setup renderer
    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;

    // Add canvas to dom
    const canvas = renderer.domElement;
    const canvasRoot = document.getElementById("canvas-root");
    canvasRoot?.appendChild(canvas);
    canvas.requestPointerLock();

    // Listeners
    this.mouseListener = new MouseListener();
    this.keyboardListener = new KeyboardListener();
    this.events = new EventListener();

    // Scenes
    this.firstScene = new FirstScene(
      renderer,
      this.gameLoader,
      this.mouseListener,
      this.keyboardListener,
      this.events
    );

    // Setup render pipeline
    this.renderPipeline = new RenderPipeline(
      renderer,
      this.firstScene.scene,
      this.firstScene.camera
    );

    // Handle pointer lock events
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("pointerlockerror", this.onPointerLockError);

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

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (!this.paused) {
      this.firstScene.update(dt, elapsed);
      TWEEN.update();
      this.renderPipeline.render(dt);
    }
  };
}
