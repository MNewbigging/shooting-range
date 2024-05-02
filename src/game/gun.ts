import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { TextureLoader } from "../loaders/texture-loader";

export interface GunProps {
  name: "pistol";
  firingModeName: FiringModeName;
  rpm: number;
}

export type FiringModeName = "semi-auto" | "auto" | "burst";

export class Gun {
  private raycaster = new THREE.Raycaster();
  private object: THREE.Object3D;

  private firingMode: FiringMode;

  private bulletDecalMaterial: THREE.MeshBasicMaterial;
  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  constructor(
    private readonly gameLoader: GameLoader,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly props: GunProps
  ) {
    this.firingMode = this.getFiringMode(props.firingModeName);
    this.object = this.setupGunModel(props.name);
    this.bulletDecalMaterial = this.setupBulletDecalMaterial();
  }

  setFiringMode(mode: FiringModeName) {
    this.firingMode.disable();
    this.firingMode = this.getFiringMode(mode);
  }

  update(dt: number, elapsed: number) {
    this.firingMode.update(dt);
    // Probably shouldn't do this when firing though...
    //this.idle(elapsed);
  }

  private setupGunModel(name: string) {
    const mesh = this.gameLoader.modelLoader.get(name);
    const texture = this.gameLoader.textureLoader.get("weapon-26");
    if (texture) {
      TextureLoader.applyModelTexture(mesh, texture);
    }

    // Turn it around since we're looking into scene along negative z
    mesh.rotateY(Math.PI);

    // Offset relative to camera
    mesh.position.set(0.45, -0.2, -0.5);

    this.camera.add(mesh);
    this.scene.add(this.camera);

    return mesh;
  }

  private setupBulletDecalMaterial() {
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

  private getFiringMode(name: FiringModeName) {
    if (name === "auto") {
      return (this.firingMode = new AutomaticFiringMode(
        this.props.rpm,
        this.fire
      ));
    }

    return (this.firingMode = new SemiAutoFiringMode(
      this.props.rpm,
      this.fire
    ));
  }

  private idle(elapsed: number) {
    // Bob up and down slightly
    this.object.position.y += Math.sin(elapsed * 2) * 0.00005;
  }

  private fire = () => {
    console.log("pew");

    // Was something hit?
    const hit = this.getIntersection();

    if (hit) {
      this.placeHitDecal(hit);
    }
  };

  private getIntersection(): THREE.Intersection | undefined {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObjects(this.scene.children);
    if (!intersections.length) {
      return undefined;
    }

    return intersections[0];
  }

  private placeHitDecal(hit: THREE.Intersection) {
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
    const decal = new THREE.Mesh(decalGeom, this.bulletDecalMaterial);
    this.scene.add(decal);
  }
}

// A firing mode doesn't do the firing, just determines WHEN to fire
abstract class FiringMode {
  protected shotTimer = 0;
  private timeBetweenShots: number;

  constructor(rpm: number, private readonly fire: () => void) {
    this.timeBetweenShots = 1 / (rpm / 60);
  }

  abstract disable(): void;

  update(dt: number) {
    this.shotTimer -= dt;
  }

  onFire() {
    this.shotTimer = this.timeBetweenShots;
    this.fire();
  }
}

class AutomaticFiringMode extends FiringMode {
  lmb = false;

  constructor(rpm: number, fire: () => void) {
    super(rpm, fire);

    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  override disable() {
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  update() {
    if (this.canFire()) {
      this.onFire();
    }
  }

  private canFire() {
    return this.lmb && this.shotTimer <= 0;
  }

  private onMouseDown = (e: MouseEvent) => {
    this.lmb = e.button === 0;
  };

  private onMouseUp = (e: MouseEvent) => {
    this.lmb = !(e.button === 0);
  };
}

class SemiAutoFiringMode extends FiringMode {
  lmbWasReleased = true;

  constructor(rpm: number, fire: () => void) {
    super(rpm, fire);

    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  override disable() {
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  private canFire() {
    return this.lmbWasReleased && this.shotTimer <= 0;
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && this.canFire()) {
      this.onFire();
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.lmbWasReleased = true;
    }
  };
}
