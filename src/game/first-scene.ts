import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GameLoader } from "../loaders/game-loader";
import { TextureLoader } from "../loaders/texture-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { addGui } from "../utils/utils";

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private raycaster = new THREE.Raycaster();
  private mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1);
  private mouseListener: MouseListener;

  private lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly halfPi = Math.PI / 2;
  private readonly lookSpeed = 1.6;
  private readonly minPolarAngle = 0;
  private readonly maxPolarAngle = Math.PI;

  private gun: THREE.Object3D;

  // private controls: OrbitControls;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private gameLoader: GameLoader
  ) {
    this.mouseListener = new MouseListener(this.renderer.domElement);

    this.setupCamera();
    this.setupLights();
    this.setupObjects();
    this.gun = this.setupGun();

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;
    // this.controls.target.set(0, 1, 0);

    this.scene.background = new THREE.Color("#1680AF");
  }

  getCamera() {
    return this.camera;
  }

  update(dt: number) {
    //this.controls.update();
    this.mouseLook();
    this.aimGun();
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
    const { modelLoader, textureLoader } = this.gameLoader;

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

    // Position gun in front of camera
    // const position = this.camera.position.clone();
    // const lookDir = this.camera.getWorldDirection(new THREE.Vector3());
    // position.add(lookDir.multiplyScalar(0.35));
    // position.x += 0.35;
    // position.y -= 0.3;
    // pistol.position.copy(position);

    // Rotate to face into scene
    //pistol.rotateY(Math.PI);

    this.scene.add(pistol);

    return pistol;
  }

  private aimGunOld() {
    // Get normalised device coords
    const ndc = this.mouseListener.getNdc();

    // Raycast against a plane in the distance
    this.raycaster.setFromCamera(ndc, this.camera);
    const target = this.raycaster.ray.intersectPlane(
      this.mousePlane,
      new THREE.Vector3()
    );
    if (target) {
      this.gun?.lookAt(target);
    }
  }

  private mouseLook() {
    this.lookEuler.setFromQuaternion(this.camera.quaternion);

    this.lookEuler.y -= this.mouseListener.movementX * 0.002 * this.lookSpeed;
    this.lookEuler.x -= this.mouseListener.movementY * 0.002 * this.lookSpeed;

    this.lookEuler.x = Math.max(
      this.halfPi - this.maxPolarAngle,
      Math.min(this.halfPi - this.minPolarAngle, this.lookEuler.x)
    );

    this.camera.quaternion.setFromEuler(this.lookEuler);
  }

  private aimGun() {
    this.gun.position.set(
      this.camera.position.x - Math.sin(this.camera.rotation.y) * 0.5,
      this.camera.position.y - 0.5,
      this.camera.position.z + Math.cos(this.camera.rotation.y) * 0.5
    );

    // this.gun.rotation.set(
    //   this.camera.rotation.x,
    //   this.camera.rotation.y,
    //   this.camera.rotation.z
    // );
  }
}
