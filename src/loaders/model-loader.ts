import * as THREE from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { TextureLoader } from "./texture-loader";

export class ModelLoader {
  doneLoading = false;

  private models = new Map<string, THREE.Object3D>();
  private loadingManager = new THREE.LoadingManager();

  get(modelName: string): THREE.Object3D {
    // Return the model if found
    const model = this.models.get(modelName);
    if (model) {
      return SkeletonUtils.clone(model);
    }

    // Otherwise create debug object and error message
    console.error(
      `Could not find ${modelName}, returning debug object instead`
    );
    return new THREE.Mesh(
      new THREE.SphereGeometry(),
      new THREE.MeshBasicMaterial({ color: "red" })
    );
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
    this.loadTarget(gltfLoader);

    const fbxLoader = new FBXLoader(this.loadingManager);
    this.loadPistol(fbxLoader);
  };

  private loadScene(loader: GLTFLoader) {
    const sceneUrl = new URL("/models/shootingRange.glb", import.meta.url).href;
    loader.load(sceneUrl, (gltf) => {
      this.models.set("shooting-range", gltf.scene);
    });
  }

  private loadTarget(loader: GLTFLoader) {
    const targetUrl = new URL("/models/target.glb", import.meta.url).href;
    loader.load(targetUrl, (gltf) => {
      const target = gltf.scene.children[0];
      // target.name = "target";
      this.models.set("target", target);
    });
  }

  private loadPistol(loader: FBXLoader) {
    const pistolUrl = new URL("/models/pistol.fbx", import.meta.url).href;
    loader.load(pistolUrl, (group) => {
      this.scaleSyntyModel(group);
      this.models.set("pistol", group);
    });
  }

  private loadSyntyModel(loader: FBXLoader) {
    const url = new URL("/bandit.fbx", import.meta.url).href;
    loader.load(url, (group) => {
      this.scaleSyntyModel(group);
      this.models.set("bandit", group);
    });
  }

  private applyModelTexture(group: THREE.Group, texture: THREE.Texture) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshLambertMaterial;
        mat.map = texture;
        // Synty models have this true by default, making model black
        mat.vertexColors = false;
      }
    });
  }

  private scaleSyntyModel(group: THREE.Group) {
    // Synty models need scale adjusting, unless done in blender beforehand
    group.scale.multiplyScalar(0.01);
    group.updateMatrixWorld();
  }
}
