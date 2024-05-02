import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GameLoader } from "../loaders/game-loader";
import { TextureLoader } from "../loaders/texture-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { addGui } from "../utils/utils";

export class FirstScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera();
  private raycaster = new THREE.Raycaster();

  private controls: PointerLockControls;

  private gun: THREE.Object3D;
  private canFire = true;
  private bulletHoleMat: THREE.MeshPhongMaterial;
  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

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
    this.bulletHoleMat = this.setupBulletDecal();

    this.scene.background = new THREE.Color("#1680AF");

    // I could also just use the 'click' event instead of these two?
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
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

  private setupBulletDecal() {
    const decal = this.gameLoader.textureLoader.get("bullet-hole");

    const material = new THREE.MeshPhongMaterial({
      map: decal,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });

    return material;
  }

  private gunIdle(elapsedTime: number) {
    // Bob gun up and down
    this.gun.position.y += Math.sin(elapsedTime * 2) * 0.00005;
  }

  private onMouseDown = (e: MouseEvent) => {
    if (this.canFire) {
      // Fire
      this.fireGun();
      this.canFire = false;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    // Assumes you can fire as fast as you can click
    this.canFire = true;
  };

  private fireGun() {
    console.log("pew");

    // Animate trigger pull
    // Spawn bullet
    // Animate recoil

    // Raycast into scene
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children);
    if (!intersections.length) {
      return;
    }

    const hit = intersections[0];
    if (!hit.face) {
      return;
    }

    const mesh = hit.object as THREE.Mesh;

    const normal = hit.face.normal.clone();
    normal.transformDirection(mesh.matrixWorld);
    normal.add(hit.point);

    this.decalHelper.position.copy(hit.point);
    this.decalHelper.lookAt(normal);

    const position = hit.point;

    const decalGeom = new DecalGeometry(
      mesh,
      position,
      this.decalHelper.rotation,
      this.decalSize
    );
    const decal = new THREE.Mesh(decalGeom, this.bulletHoleMat);
    this.scene.add(decal);
  }
}
