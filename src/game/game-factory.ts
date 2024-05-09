import * as THREE from "three";
import { TextureLoader } from "../loaders/texture-loader";
import { GameLoader } from "../loaders/game-loader";
import { GunProps } from "./guns/gun";

export class GameFactory {
  static getBulletDecalMaterial(textureLoader: TextureLoader) {
    const decal = textureLoader.get("bullet-hole");

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

  static getPistolProps(
    gameLoader: GameLoader,
    bulletDecalMaterial: THREE.MeshPhongMaterial
  ): GunProps {
    return {
      object: gameLoader.modelLoader.pistol,
      firingModeName: "semi-auto",
      rpm: 120,
      bulletDecalMaterial,
      holdPosition: new THREE.Vector3(0.15, -0.2, -0.5),
      lowerPositionMod: new THREE.Vector3(0, -0.2, 0),
      lowerRotationMod: new THREE.Vector3(-Math.PI / 4, 0, 0),
    };
  }

  static getRifleProps(
    gameLoader: GameLoader,
    bulletDecalMaterial: THREE.MeshPhongMaterial
  ): GunProps {
    return {
      object: gameLoader.modelLoader.rifle,
      firingModeName: "auto",
      rpm: 480,
      bulletDecalMaterial,
      holdPosition: new THREE.Vector3(0.15, -0.2, -0.3),
      lowerPositionMod: new THREE.Vector3(0, -0.15, 0),
      lowerRotationMod: new THREE.Vector3(-Math.PI / 4.5, 0, 0),
    };
  }
}
