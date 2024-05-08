import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { TextureLoader } from "../loaders/texture-loader";
import { EventListener } from "../listeners/event-listener";
import { KeyboardListener } from "../listeners/keyboard-listener";

export interface GunProps {
  object: THREE.Object3D;
  firingModeName: FiringModeName;
  rpm: number;
}

export type FiringModeName = "semi-auto" | "auto" | "burst";

/**
 * A gun is an item
 * It can exist without being equipped
 *
 * States:
 * - lying somewhere in the world
 * - being picked up (moves towards player for a second)
 * - being equipped (shows itself animation)
 * - equipped (idle/fire/reload animations)
 * - being unequipped (hides itself animation)
 */
export class Gun {
  enabled = false;

  private raycaster = new THREE.Raycaster();

  private firingMode: FiringMode;

  private bulletDecalMaterial: THREE.MeshBasicMaterial;
  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  private idleAnim: TWEEN.Tween<any>;
  private mixer: THREE.AnimationMixer;
  private reloadAction?: THREE.AnimationAction;

  constructor(
    public object: THREE.Object3D,
    public holdPosition: THREE.Vector3,
    public lowerValues: THREE.Vector2, // x = rot, y = pos relative to hold pos
    private gameLoader: GameLoader,
    private mouseListener: MouseListener,
    private keyboardListener: KeyboardListener,
    private events: EventListener,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private firingModeName: FiringModeName,
    private rpm: number
  ) {
    this.firingMode = this.getFiringMode(firingModeName);
    this.bulletDecalMaterial = this.setupBulletDecalMaterial();
    this.idleAnim = this.setupIdleAnim();
    this.mixer = new THREE.AnimationMixer(this.object);
    this.reloadAction = this.setupReloadAnim();
  }

  enable() {
    if (this.enabled) {
      return;
    }

    // Re-create idle animation for this position then start it
    this.idleAnim = this.setupIdleAnim();
    this.idleAnim.start();

    // Can now listen for input
    this.firingMode.enable();
    this.keyboardListener.on("r", this.onPressR);

    this.enabled = true;
  }

  disable() {
    if (!this.enabled) {
      return;
    }

    // Stop any active animations
    this.idleAnim.stop();
    this.reloadAction?.stop().reset();

    // Stop listening for input
    this.firingMode.disable();
    this.keyboardListener.off("r", this.onPressR);

    this.enabled = false;
  }

  setFiringMode(mode: FiringModeName) {
    this.firingMode.disable();
    this.firingMode = this.getFiringMode(mode);
  }

  update(dt: number) {
    if (!this.enabled) {
      return;
    }

    this.firingMode.update(dt);
    this.mixer.update(dt);
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

  private setupReloadAnim() {
    let reloadAction: THREE.AnimationAction | undefined;
    this.object.traverse((child) => {
      if (child.animations.length) {
        reloadAction = this.mixer.clipAction(child.animations[0]);
      }
    });

    reloadAction?.setLoop(THREE.LoopOnce, 1);

    return reloadAction;
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
        this.rpm,
        this.fire
      ));
    }

    return (this.firingMode = new SemiAutoFiringMode(
      this.mouseListener,
      this.rpm,
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

  private onPressR = () => {
    this.reloadAction?.reset().play();
  };
}

// A firing mode doesn't do the firing, just determines WHEN to fire
abstract class FiringMode {
  readonly timeBetweenShots: number;
  protected shotTimer = 0;

  constructor(rpm: number, private readonly fire: () => void) {
    this.timeBetweenShots = 1 / (rpm / 60);
  }

  abstract get name(): FiringModeName;
  abstract enable(): void;
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

  get name(): FiringModeName {
    return "auto";
  }

  override enable(): void {
    //
  }

  override disable(): void {
    //
  }

  override update(dt: number) {
    super.update(dt);

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
  }

  get name(): FiringModeName {
    return "semi-auto";
  }

  override enable(): void {
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
