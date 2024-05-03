import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
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

  private idleAnim: TWEEN.Tween<any>;

  constructor(
    private readonly gameLoader: GameLoader,
    private readonly mouseListener: MouseListener,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly onShootSomething: (hit: THREE.Intersection) => void,
    private readonly props: GunProps
  ) {
    this.firingMode = this.getFiringMode(props.firingModeName);
    this.object = this.setupGunModel(props.name);
    this.bulletDecalMaterial = this.setupBulletDecalMaterial();

    // Enter idle animation by default
    this.idleAnim = this.setupIdleAnim();
    this.idleAnim.start();
  }

  setFiringMode(mode: FiringModeName) {
    this.firingMode.disable();
    this.firingMode = this.getFiringMode(mode);
  }

  update(dt: number, elapsed: number) {
    this.firingMode.update(dt);

    TWEEN.update();
  }

  private setupGunModel(name: string) {
    const mesh = this.gameLoader.modelLoader.get(name);
    const texture = this.gameLoader.textureLoader.get("weapon-26");
    if (texture) {
      TextureLoader.applyModelTexture(mesh, texture);
    }

    // Turn it around since we're looking into scene along negative z
    mesh.rotation.y += Math.PI;

    // Offset relative to camera
    mesh.position.set(0.15, -0.2, -0.5);

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

  private setupIdleAnim() {
    const start = this.object.position.y;
    const target = this.object.position.y + 0.01;
    const anim = new TWEEN.Tween(this.object.position).to({ y: target }, 1500);
    const reverse = new TWEEN.Tween(this.object.position).to(
      { y: start },
      1500
    );

    anim.chain(reverse);
    reverse.chain(anim);

    return anim;
  }

  private getRecoilAnim() {
    const startPos = this.object.position.clone();
    const startRot = this.object.rotation.x;

    const recoilOffset = new THREE.Vector3(0, 0.02, 0.1);
    const targetPos = new THREE.Vector3()
      .copy(this.object.position)
      .add(recoilOffset);
    const targetRot = this.object.rotation.x + 0.1;

    // Seconds between shots to milliseconds, halved because it needs to return to start pos
    const maxTime = this.firingMode.timeBetweenShots * 1000 * 0.5;
    const duration = maxTime * 0.5;

    const anim = new TWEEN.Tween(this.object).to(
      {
        position: { y: targetPos.y, z: targetPos.z },
        rotation: { x: targetRot },
      },
      duration
    );
    const reverse = new TWEEN.Tween(this.object).to(
      {
        position: { y: startPos.y, z: startPos.z },
        rotation: { x: startRot },
      },
      duration
    );
    anim.chain(reverse);

    return anim;
  }

  private getFiringMode(name: FiringModeName) {
    if (name === "auto") {
      return (this.firingMode = new AutomaticFiringMode(
        this.mouseListener,
        this.props.rpm,
        this.fire
      ));
    }

    return (this.firingMode = new SemiAutoFiringMode(
      this.mouseListener,
      this.props.rpm,
      this.fire
    ));
  }

  private fire = () => {
    // Animate
    this.idleAnim.pause();
    const recoilAnim = this.getRecoilAnim();
    recoilAnim.onComplete(() => this.idleAnim.resume());
    recoilAnim.start();

    // Was something hit?
    const hit = this.getIntersection();

    if (hit) {
      this.placeHitDecal(hit);
      this.onShootSomething(hit);
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

    // If the object hit is not static, add decal as a child
    if (hit.object.name.includes("body")) {
      hit.object.worldToLocal(decal.position);
      decal.quaternion.multiply(hit.object.quaternion.clone().invert());
      hit.object.add(decal);
    } else {
      this.scene.add(decal);
    }
  }
}

// A firing mode doesn't do the firing, just determines WHEN to fire
abstract class FiringMode {
  readonly timeBetweenShots: number;
  protected shotTimer = 0;

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
  constructor(
    private mouseListener: MouseListener,
    rpm: number,
    fire: () => void
  ) {
    super(rpm, fire);
  }

  disable(): void {
    //
  }

  update() {
    if (this.canFire()) {
      this.onFire();
    }
  }

  private canFire() {
    return this.mouseListener.lmb && this.shotTimer <= 0;
  }
}

class SemiAutoFiringMode extends FiringMode {
  constructor(
    private mouseListener: MouseListener,
    rpm: number,
    fire: () => void
  ) {
    super(rpm, fire);

    this.mouseListener.addListener("mousedown", this.onMouseDown);
  }

  override disable() {
    this.mouseListener.removeListener("mousedown", this.onMouseDown);
  }

  private canFire() {
    return this.shotTimer <= 0;
  }

  private onMouseDown = () => {
    if (this.canFire()) {
      this.onFire();
    }
  };
}
