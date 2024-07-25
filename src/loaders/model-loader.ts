import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

export class ModelLoader {
  doneLoading = false;

  // Models used in this game, default to debug objects
  shootingRange = this.createDebugObject();
  pistol = this.createDebugObject();
  rifle = this.createDebugObject();
  radio = this.createDebugObject();

  private loadingManager = new THREE.LoadingManager();

  clone(object: THREE.Object3D) {
    return SkeletonUtils.clone(object);
  }

  load(onLoad: () => void) {
    // Setup loading manager
    this.loadingManager.onError = (url) => console.error("error loading", url);
    this.loadingManager.onLoad = () => {
      this.doneLoading = true;
      onLoad();
    };

    this.loadModels();
  }

  private loadModels = () => {
    const gltfLoader = new GLTFLoader(this.loadingManager);
    this.loadScene(gltfLoader);
    this.loadRadio(gltfLoader);

    const fbxLoader = new FBXLoader(this.loadingManager);
    this.loadPistol(fbxLoader);
    this.loadRifle(fbxLoader);
  };

  private loadScene(loader: GLTFLoader) {
    const sceneUrl = new URL("/models/shootingRange.glb", import.meta.url).href;
    loader.load(sceneUrl, (gltf) => {
      this.shootingRange = gltf.scene;
    });
  }

  private loadRadio(loader: GLTFLoader) {
    const radioUrl = new URL("/models/radio.glb", import.meta.url).href;
    loader.load(radioUrl, (gltf) => {
      const group = gltf.scene;
      //group.scale.multiplyScalar(0.1);
      group.name = "radio";
      this.radio = group;
    });
  }

  private loadPistol(loader: FBXLoader) {
    const pistolUrl = new URL("/models/pistol.fbx", import.meta.url).href;
    loader.load(pistolUrl, (group) => {
      this.scaleSyntyModel(group);
      group.name = "pistol";
      this.pistol = group;
    });
  }

  private loadRifle(loader: FBXLoader) {
    const url = new URL("/models/rifle.fbx", import.meta.url).href;
    loader.load(url, (group) => {
      this.scaleSyntyModel(group);
      group.name = "rifle";
      this.rifle = group;
    });
  }

  private scaleSyntyModel(group: THREE.Group) {
    // Synty models need scale adjusting, unless done in blender beforehand
    group.scale.multiplyScalar(0.01);
    group.updateMatrixWorld();
  }

  private createDebugObject(): THREE.Object3D {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
  }
}
