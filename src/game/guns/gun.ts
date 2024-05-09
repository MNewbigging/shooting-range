import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { MouseListener } from "../../listeners/mouse-listener";
import { EventListener } from "../../listeners/event-listener";
import { KeyboardListener } from "../../listeners/keyboard-listener";
import { randomId } from "../../utils/utils";
import { ChainedTween, TweenFactory } from "../tween-factory";
import {
  FiringModeName,
  FiringMode,
  AutomaticFiringMode,
  SemiAutoFiringMode,
} from "./firing-modes";

export interface GunProps {
  object: THREE.Object3D;
  firingModeName: FiringModeName;
  rpm: number;
  bulletDecalMaterial: THREE.MeshPhongMaterial;
  holdPosition: THREE.Vector3;
  lowerPositionMod: THREE.Vector3;
  lowerRotationMod: THREE.Vector3;
}

export class Gun {
  enabled = false;
  readonly id = randomId();

  readonly object: THREE.Object3D;
  readonly rpm: number;
  readonly bulletDecalMaterial: THREE.MeshPhongMaterial;
  holdPosition: THREE.Vector3;
  lowerPositionMod: THREE.Vector3;
  lowerRotationMod: THREE.Vector3;

  recoilOffset = new THREE.Vector3(0, 0.02, 0.1);

  private raycaster = new THREE.Raycaster();

  private firingMode: FiringMode;

  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  private idleAnim: ChainedTween;
  private mixer: THREE.AnimationMixer;
  private reloadAction?: THREE.AnimationAction;

  constructor(
    props: GunProps,
    private mouseListener: MouseListener,
    private keyboardListener: KeyboardListener,
    private events: EventListener,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    // Pull out readonly props
    this.object = props.object;
    this.holdPosition = props.holdPosition;
    this.lowerPositionMod = props.lowerPositionMod;
    this.lowerRotationMod = props.lowerRotationMod;
    this.rpm = props.rpm;
    this.bulletDecalMaterial = props.bulletDecalMaterial;

    // Setup
    this.firingMode = this.getFiringMode(props.firingModeName);
    this.mixer = new THREE.AnimationMixer(props.object);
    this.reloadAction = this.setupReloadAnim();
    this.idleAnim = TweenFactory.idleGun(this);
  }

  get timeBetweenShots() {
    return this.firingMode.timeBetweenShots;
  }

  enable() {
    if (this.enabled) {
      return;
    }

    // Can start idle animation
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
    const recoilAnim = TweenFactory.recoilGun(this, () =>
      this.idleAnim.resume()
    );
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
