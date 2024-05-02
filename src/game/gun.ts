import * as THREE from "three";
import { GameLoader } from "../loaders/game-loader";
import { MouseListener } from "../listeners/mouse-listener";

export interface GunProps {
  firingMode: FiringMode;
  rpm: number;
}

export type FiringMode = "semi-auto" | "auto" | "burst";

export class Gun {
  firingMode: FiringMode;
  rpm: number;

  private canFire = true;
  private bulletDecalMaterial: THREE.MeshBasicMaterial;
  private decalHelper = new THREE.Object3D();
  private decalSize = new THREE.Vector3(0.1, 0.1, 0.1);

  constructor(
    private readonly gameLoader: GameLoader,
    private readonly mouseListener: MouseListener,
    props: GunProps
  ) {
    this.firingMode = props.firingMode;
    this.rpm = props.rpm;

    this.bulletDecalMaterial = this.setupBulletDecalMaterial();
  }

  update() {}

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
}
