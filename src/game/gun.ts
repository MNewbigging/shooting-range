import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";
import { TextureLoader } from "../loaders/texture-loader";

export interface GunProps {
  name: "pistol";
  firingMode: FiringMode;
  rpm: number;
}

export type FiringMode = "semi-auto" | "auto" | "burst";

export class Gun {
  private raycaster = new THREE.Raycaster();
  private object: THREE.Object3D;

  private firingMode: FiringMode;
  private rpm: number;
  private timeBetweenShots: number;
  private shotTimer = 0;

  private bulletDecalMaterial: THREE.MeshBasicMaterial;
  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  constructor(
    private readonly gameLoader: GameLoader,
    private readonly mouseListener: MouseListener,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
    props: GunProps
  ) {
    this.firingMode = props.firingMode;
    this.rpm = props.rpm;

    // RPM determines how many seconds between shots
    this.timeBetweenShots = 1 / (this.rpm / 60);

    this.object = this.setupGunModel(props.name);
    this.bulletDecalMaterial = this.setupBulletDecalMaterial();
  }

  update(dt: number, elapsed: number) {
    // Tick down the shot timer towards 0
    this.shotTimer -= dt;

    // If holding fire button and shotTimer is finished, we can shoot
    if (this.mouseListener.lmb && this.shotTimer <= 0) {
      this.fire();

      // Cannot fire again until timeBetweenShots has passed
      this.shotTimer = this.timeBetweenShots;
    } else {
      this.idle(elapsed);
    }
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

  private idle(elapsed: number) {
    // Bob up and down slightly
    this.object.position.y += Math.sin(elapsed * 2) * 0.00005;
  }

  private fire() {
    console.log("pew");

    // Was something hit?
    const hit = this.getIntersection();

    if (hit) {
      // Draw a decal where we hit
      this.placeHitDecal(hit);
    }
  }

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
