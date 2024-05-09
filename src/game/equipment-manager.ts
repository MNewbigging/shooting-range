import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { Gun, GunProps } from "./guns/gun";
import { TweenFactory, tilAnimEnd } from "./tween-factory";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { MouseListener } from "../listeners/mouse-listener";
import { GameLoader } from "../loaders/game-loader";
import { EventListener } from "../listeners/event-listener";

export class EquipmentManager {
  private raycaster = new THREE.Raycaster();
  private bulletDecalMaterial: THREE.MeshPhongMaterial;

  private tableGuns: Gun[] = []; // in the world
  private heldGuns: Gun[] = []; // on the player
  private equippedGun?: Gun; // in player's hands
  private equipping = false;
  private lowerAnim?: TWEEN.Tween<any>;
  private raiseAnim?: TWEEN.Tween<any>;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private gameLoader: GameLoader,
    private keyboardListener: KeyboardListener,
    private mouseListener: MouseListener,
    private events: EventListener
  ) {
    this.bulletDecalMaterial = this.setupBulletDecalMaterial();

    this.mouseListener.addListener("mousedown", this.onMouseDown);
    this.mouseListener.addListener("wheel", this.onMouseWheel);
  }

  setup() {
    this.setupPistol();
    this.setupRifle();
  }

  getLookedAtTableGun(): Gun | undefined {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    for (const gun of this.tableGuns) {
      const intersections = this.raycaster.intersectObject(gun.object, true);
      if (intersections.length) {
        return gun;
      }
    }

    return undefined;
  }

  update(dt: number) {
    this.equippedGun?.update(dt);
  }

  lowerEquippedItem() {
    // Cannot lower what is not equipped
    if (!this.equippedGun) {
      return;
    }

    // Currently lowering
    if (this.lowerAnim) {
      return;
    }

    // If raising, stop
    this.raiseAnim?.stop();
    this.raiseAnim = undefined;

    // Cannot use equipped gun while lowered
    this.equippedGun.disable();

    // Lower the equipped gun
    this.lowerAnim = TweenFactory.lowerGun(this.equippedGun);
    this.lowerAnim.start();
  }

  raiseEquippedItem() {
    // Cannot raise what isn't equipped
    if (!this.equippedGun) {
      return;
    }

    // Cannot raise if we never lowered
    if (!this.lowerAnim) {
      return;
    }

    // Already raising
    if (this.raiseAnim) {
      return;
    }

    // Stop lowering
    this.lowerAnim?.stop();
    this.lowerAnim = undefined;

    // Raise the equipped gun
    this.raiseAnim = TweenFactory.raiseGun(this.equippedGun);
    this.raiseAnim.onComplete(() => {
      this.raiseAnim = undefined;
      this.equippedGun?.enable();
    });
    this.raiseAnim.start();
  }

  async pickupGun(gun: Gun) {
    // Begin the pickup animation - move to just below camera
    const targetPos = this.camera.position.clone();
    await tilAnimEnd(TweenFactory.pickupGun(gun, targetPos));

    // Remove from table guns
    this.tableGuns = this.tableGuns.filter((g) => g.object !== gun.object);

    // Add to held guns
    this.heldGuns.push(gun);

    // Assign hotkey
    const index = this.heldGuns.length - 1;
    const key = `${this.heldGuns.length}`;
    this.keyboardListener.on(key, () => this.onGunHotkey(index));

    // Reset any rotation so it faces the right way
    gun.object.rotation.set(0, Math.PI, 0);

    // Hide it until ready to show
    gun.object.visible = false;

    // Adjust size if necessary
    this.adjustGunSize(gun);

    // Equip straight away
    this.equipGun(gun);
  }

  private adjustGunSize(gun: Gun) {
    // If this is a large gun, we need to shrink it and move it closer to camera
    // This should maek it seem the same size, whilst actually being smaller
    if (gun.object.name === "rifle") {
      gun.object.scale.multiplyScalar(0.75);
    }
  }

  private async equipGun(gun: Gun) {
    if (this.equipping) {
      return;
    }

    this.equipping = true;

    // Unequip then hide the current gun
    if (this.equippedGun) {
      await this.unequipGun(this.equippedGun);
    }

    // Add new gun to the camera straight away
    this.camera.add(gun.object);

    // Position it ready for the show animation
    gun.object.position.set(gun.holdPosition.x, -1, gun.holdPosition.z);
    gun.object.rotation.x = -Math.PI;

    // Ensure the gun is visible
    gun.object.visible = true;

    // Start the show animation
    await tilAnimEnd(TweenFactory.showGun(gun));

    // This gun is now equipped
    gun.enable();
    this.equippedGun = gun;
    this.equipping = false;

    // In case we're now looking at an interactive item and camera stops...
    // const lookingAt = this.getLookedAtTableGun();
    // if (lookingAt) {
    //   this.lowerEquippedGun();
    // }
  }

  private async unequipGun(gun: Gun) {
    gun.disable();
    await tilAnimEnd(TweenFactory.hideGun(gun));
    this.camera.remove(gun.object);
  }

  private onGunHotkey(index: number) {
    // Is there a gun for that index?
    if (this.heldGuns.length <= index) {
      console.log("not holding gun there");
      return;
    }

    const gun = this.heldGuns[index];

    // Are we already holding it?
    if (this.equippedGun?.id === gun.id) {
      console.log("already holding it");
      return;
    }

    // Swap to that gun so long as we're not currently swapping...
    this.equipGun(gun);
  }

  private onMouseWheel = (deltaY: number) => {
    // Up is negative, down is positive

    // If there are no held guns to swap to, can stop
    if (this.heldGuns.length < 2) {
      return;
    }

    // todo - if nothing is equipped, equip first gun

    const equippedIndex = this.heldGuns.findIndex(
      (gun) => gun.id === this.equippedGun?.id
    );
    let nextIndex = equippedIndex;

    // Up
    if (deltaY < 0) {
      // Move to next item in array, wrap around
      nextIndex =
        equippedIndex - 1 < 0 ? this.heldGuns.length - 1 : equippedIndex - 1;
    } else {
      // Down
      nextIndex =
        equippedIndex + 1 === this.heldGuns.length ? 0 : equippedIndex + 1;
    }

    this.equipGun(this.heldGuns[nextIndex]);
  };

  private onMouseDown = () => {
    // Check for left click
    if (!this.mouseListener.lmb) {
      return;
    }

    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);

    // Check for clicks on table guns
    const gun = this.getLookedAtTableGun();
    if (gun) {
      this.pickupGun(gun);
    }
  };

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

  private setupPistol() {
    const pistol = this.gameLoader.modelLoader.pistol;
    this.setupGunMaterial(pistol);

    // Place the pistol object on the table
    pistol.position.set(0.8, 1.05, 0.5);
    pistol.rotateY(Math.PI + 0.5);
    pistol.rotateZ(Math.PI / 2);
    this.scene.add(pistol);

    // Create the gun class for the pistol
    const pistolProps: GunProps = {
      object: pistol,
      firingModeName: "semi-auto",
      rpm: 120,
      bulletDecalMaterial: this.bulletDecalMaterial,
      holdPosition: new THREE.Vector3(0.15, -0.2, -0.5),
      lowerPositionMod: new THREE.Vector3(0, -0.2, 0),
      lowerRotationMod: new THREE.Vector3(-Math.PI / 4, 0, 0),
    };

    const pistolGun = new Gun(
      pistolProps,
      this.mouseListener,
      this.keyboardListener,
      this.events,
      this.scene,
      this.camera
    );

    // Add it to the table guns
    this.tableGuns.push(pistolGun);
  }

  private setupRifle() {
    const rifle = this.gameLoader.modelLoader.rifle;

    this.setupGunMaterial(rifle);

    rifle.position.set(0.8, 1.05, 1.2);
    rifle.rotateY(Math.PI - 0.2);
    rifle.rotateZ(Math.PI / 2);
    this.scene.add(rifle);

    const rifleProps: GunProps = {
      object: rifle,
      firingModeName: "auto",
      rpm: 480,
      bulletDecalMaterial: this.bulletDecalMaterial,
      holdPosition: new THREE.Vector3(0.12, -0.15, -0.23),
      lowerPositionMod: new THREE.Vector3(0, -0.15, 0),
      lowerRotationMod: new THREE.Vector3(-Math.PI / 4.5, 0, 0),
    };

    const rifleGun = new Gun(
      rifleProps,
      this.mouseListener,
      this.keyboardListener,
      this.events,
      this.scene,
      this.camera
    );

    this.tableGuns.push(rifleGun);
  }

  private setupGunMaterial(gun: THREE.Object3D) {
    const texture = this.gameLoader.textureLoader.get("weapon-26");
    if (!texture) {
      return;
    }

    gun.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshLambertMaterial;
        mat.map = texture;
        mat.vertexColors = false;
      }
    });
  }
}
