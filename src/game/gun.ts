import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { TextureLoader } from "../loaders/texture-loader";
import { EventListener } from "../listeners/event-listener";

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
    private readonly events: EventListener,
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
      this.placeStaticDecal(hit);
      this.events.fire("shot-intersect", hit);
    }
  };

  private getIntersection(): THREE.Intersection | undefined {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const intersections = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    if (!intersections.length) {
      return undefined;
    }

    return intersections[0];
  }

  private placeHitDecal(intersection: THREE.Intersection) {
    if (!intersection.face) {
      return;
    }

    const mesh = intersection.object as THREE.Mesh;

    // Transform local normal to world normal
    const normal = intersection.face.normal.clone();
    normal.transformDirection(mesh.matrixWorld);
    normal.add(intersection.point);

    // Move helper using world values
    this.decalHelper.position.copy(intersection.point);
    this.decalHelper.lookAt(normal);

    // Create decal in world space
    const decalGeom = new DecalGeometry(
      mesh,
      intersection.point,
      this.decalHelper.rotation,
      this.decalSize
    );
    const decal = new THREE.Mesh(decalGeom, this.bulletDecalMaterial);

    // The decal thinks it's at position 0, because the position is baked into the geometry.
    // This means it's always getting the intersection.point added behind the scenes
    // So when positioning, always subtract by intersection.point

    // Get intersection point as local to mesh
    const localIntersectionPoint = mesh.worldToLocal(
      intersection.point.clone()
    );

    // Add as child
    mesh.add(decal);

    // Move to local int point
    decal.position.copy(localIntersectionPoint);

    // Adjust by the baked-in geometry positions
    decal.position.sub(intersection.point);
  }

  private placeStaticDecal(intersection: THREE.Intersection) {
    // For now, can only place on static objects
    if (intersection.object.name.includes("body")) {
      return;
    }

    if (!intersection.face) {
      return;
    }

    const mesh = intersection.object as THREE.Mesh;

    // Transform local normal to world normal
    const normal = intersection.face.normal.clone();
    normal.transformDirection(mesh.matrixWorld);
    normal.add(intersection.point);

    // Move helper using world values
    this.decalHelper.position.copy(intersection.point);
    this.decalHelper.lookAt(normal);

    // Create decal in world space
    const decalGeom = new DecalGeometry(
      mesh,
      intersection.point,
      this.decalHelper.rotation,
      this.decalSize
    );
    const decal = new THREE.Mesh(decalGeom, this.bulletDecalMaterial);

    this.scene.add(decal);
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
    return this.mouseListener.lmb && this.shotTimer <= 0;
  }

  private onMouseDown = () => {
    if (this.canFire()) {
      this.onFire();
    }
  };
}
