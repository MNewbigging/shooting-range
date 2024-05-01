import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GameLoader } from "../loaders/game-loader";
import { TextureLoader } from "../loaders/texture-loader";

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private controls: OrbitControls;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private gameLoader: GameLoader
  ) {
    this.setupCamera();
    this.setupLights();
    this.setupObjects();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 1, 0);

    this.scene.background = new THREE.Color("#1680AF");
  }

  getCamera() {
    return this.camera;
  }

  update(dt: number) {
    this.controls.update();

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
    const { modelLoader, textureLoader } = this.gameLoader;

    const range = modelLoader.get("shooting-range");
    this.scene.add(range);

    // Pistol model setup
    const pistol = modelLoader.get("pistol");
    const pistolTex = textureLoader.get("weapon-26");
    if (pistolTex) {
      TextureLoader.applyModelTexture(pistol, pistolTex);
    }

    // Position gun in front of camera
    const position = this.camera.position.clone();
    const lookDir = this.camera.getWorldDirection(new THREE.Vector3());
    position.add(lookDir.multiplyScalar(0.25));
    position.x += 0.15;
    position.y -= 0.25;

    pistol.position.copy(position);

    this.scene.add(pistol);
  }
}
