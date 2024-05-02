import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { GameLoader } from "../loaders/game-loader";
import { TextureLoader } from "../loaders/texture-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { addGui } from "../utils/utils";

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private raycaster = new THREE.Raycaster();
  private mouseListener: MouseListener;

  private controls: PointerLockControls;

  private gun: THREE.Object3D;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private gameLoader: GameLoader
  ) {
    this.controls = new PointerLockControls(
      this.camera,
      this.renderer.domElement
    );
    this.mouseListener = new MouseListener(this.renderer.domElement);

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
    this.gunIdle(elapsed);

    // Draw
    this.renderer.render(this.scene, this.camera);

    // Post update
    this.mouseListener.postUpdate();
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
    const { modelLoader, textureLoader } = this.gameLoader;

    const pistol = modelLoader.get("pistol");
    const pistolTex = textureLoader.get("weapon-26");
    if (pistolTex) {
      TextureLoader.applyModelTexture(pistol, pistolTex);
    }

    // Turn it around since we're looking into scene along negative z
    pistol.rotateY(Math.PI);

    // Offset relative to camera
    pistol.position.set(0.45, -0.2, -0.5);

    this.camera.add(pistol);
    this.scene.add(this.camera);

    return pistol;
  }

  private gunIdle(elapsedTime: number) {
    // Bob gun up and down
    this.gun.position.y += Math.sin(elapsedTime * 2) * 0.00005;
  }
}
