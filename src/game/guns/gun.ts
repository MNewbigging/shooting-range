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
import { makeAutoObservable, observable } from "mobx";

export interface GunProps {
  object: THREE.Object3D;
  firingModeName: FiringModeName;
  rpm: number;
  magSize: number;
  bulletDecalMaterial: THREE.MeshPhongMaterial;
  holdPosition: THREE.Vector3;
  lowerPosMod: THREE.Vector3;
  lowerRotMod: THREE.Vector3;
  recoilPosMod: THREE.Vector3;
  recoildRotMode: THREE.Vector3;
}

export class Gun {
  enabled = false;
  readonly id = randomId();

  // Props
  readonly object: THREE.Object3D;
  readonly rpm: number;
  readonly bulletDecalMaterial: THREE.MeshPhongMaterial;
  readonly magSize: number;
  holdPosition: THREE.Vector3;
  lowerPosMod: THREE.Vector3;
  lowerRotMod: THREE.Vector3;
  recoilPosMod: THREE.Vector3;
  recoildRotMod: THREE.Vector3;

  private raycaster = new THREE.Raycaster();

  @observable magAmmo: number;

  private firingMode: FiringMode;

  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  private idleAnim: ChainedTween;
  private mixer: THREE.AnimationMixer;
  private reloadAction?: THREE.AnimationAction;

  private soundMap = new Map<string, THREE.PositionalAudio>();

  constructor(
    props: GunProps,
    private mouseListener: MouseListener,
    private keyboardListener: KeyboardListener,
    private events: EventListener,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    makeAutoObservable(this);

    // Pull out readonly props
    this.object = props.object;
    this.holdPosition = props.holdPosition;
    this.lowerPosMod = props.lowerPosMod;
    this.lowerRotMod = props.lowerRotMod;
    this.rpm = props.rpm;
    this.bulletDecalMaterial = props.bulletDecalMaterial;
    this.recoilPosMod = props.recoilPosMod;
    this.recoildRotMod = props.recoildRotMode;
    this.magSize = props.magSize;
    this.magAmmo = this.magSize;

    // Setup
    this.firingMode = this.getFiringMode(props.firingModeName);
    this.mixer = new THREE.AnimationMixer(props.object);
    this.mixer.addEventListener("finished", this.onReloadAnimationEnd);
    this.reloadAction = this.setupReloadAnim();
    this.idleAnim = TweenFactory.idleGun(this);
  }

  get recoilDurations() {
    // Given the rpm, this is the most time the entire recoil duration can take
    const maxTime = this.firingMode.timeBetweenShots * 1000 * 0.9; // error margin

    // It should always be quicker going out than back
    const outDuration = Math.ceil(maxTime / 4);

    // Reset
    const backDuration = maxTime - outDuration;

    return { outDuration, backDuration };
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

  setSoundMap(map: Map<string, THREE.PositionalAudio>) {
    this.soundMap = map;
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
    // Can't fire when reloading
    if (this.reloadAction?.isRunning()) {
      return;
    }

    // Is there a bullet available to fire?
    if (this.magAmmo <= 0) {
      this.playAudio("dry-trigger");
      // Must reload
      return;
    }

    // Spend a bullet
    this.magAmmo--;

    // Audio
    this.playAudio("shot");

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

  private playAudio(name: string) {
    const sound = this.soundMap.get(name);
    if (!sound) {
      return;
    }

    sound.stop().play();
  }

  private onPressR = () => {
    if (this.magAmmo === this.magSize) {
      return;
    }

    // Start the reload animation
    this.reloadAction?.reset().play();

    // Play unload mag sound now
    const unloadSound = this.soundMap.get("unload-mag");
    unloadSound?.stop().play();

    const loadSound = this.soundMap.get("load-mag");
    setTimeout(() => loadSound?.stop().play(), 300);
  };

  private onReloadAnimationEnd = () => {
    // Fill magazine!
    this.magAmmo = this.magSize;
  };
}
