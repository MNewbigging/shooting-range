import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { Gun } from "./gun";

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: PointerLockControls;

  private gun: Gun;

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
  }

  private setupGun() {
    return new Gun(this.gameLoader, this.scene, this.camera, {
      name: "pistol",
      firingModeName: "semi-auto",
      rpm: 60,
    });
  }
}
