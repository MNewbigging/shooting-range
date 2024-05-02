import * as THREE from "three";

import { GameLoader } from "../loaders/game-loader";
import { FirstScene } from "./first-scene";
import { makeAutoObservable, observable } from "mobx";

export class GameState {
  @observable paused = false;

  private renderer: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  private firstScene: FirstScene;

  constructor(private gameLoader: GameLoader) {
    makeAutoObservable(this);

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;

    // Add canvas to dom
    const canvas = this.renderer.domElement;
    const canvasRoot = document.getElementById("canvas-root");
    canvasRoot?.appendChild(canvas);
    canvas.requestPointerLock();

    this.firstScene = new FirstScene(this.renderer, this.gameLoader);

    // Handle any canvas resize events
    window.addEventListener("resize", this.onCanvasResize);
    this.onCanvasResize();

    // Handle pointer lock events
    document.addEventListener("pointerlockchange", this.onPointerLockChange);

    // Start game
    this.update();
  }

  resumeGame = () => {
    this.renderer.domElement.requestPointerLock();
    this.paused = false;
  };

  private onCanvasResize = () => {
    const canvas = this.renderer.domElement;
    const camera = this.firstScene.getCamera();

    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    camera.aspect = canvas.clientWidth / canvas.clientHeight;

    camera.updateProjectionMatrix();
  };

  private onPointerLockChange = () => {
    // If exiting
    if (document.pointerLockElement !== this.renderer.domElement) {
      this.paused = true;
    }
  };

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (!this.paused) {
      this.firstScene.update(dt, elapsed);
    }
  };
}
