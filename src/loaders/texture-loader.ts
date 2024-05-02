import * as THREE from "three";

export class TextureLoader {
  doneLoading = false;

  private textures = new Map<string, THREE.Texture>();
  private loadingManager = new THREE.LoadingManager();

  get(name: string) {
    return this.textures.get(name);
  }

  load(onLoad: () => void) {
    // Setup loading manager
    this.loadingManager.onError = (url) => console.error("error loading", url);

    this.loadingManager.onLoad = () => {
      this.doneLoading = true;
      onLoad();
    };

    this.loadTextures();
  }

  private loadTextures() {
    const loader = new THREE.TextureLoader(this.loadingManager);
    this.getNameUrlMap().forEach((url, name) => {
      loader.load(url, (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        this.textures.set(name, texture);
      });
    });
  }

  private getNameUrlMap() {
    const nameUrlMap = new Map<string, string>();

    const wep01Url = new URL("/textures/Wep_Skin_01.png", import.meta.url).href;
    nameUrlMap.set("weapon-01", wep01Url);

    const wep26Url = new URL("/textures/Wep_Skin_26.png", import.meta.url).href;
    nameUrlMap.set("weapon-26", wep26Url);

    const bulletHoleUrl = new URL("/textures/bullet_hole.png", import.meta.url)
      .href;
    nameUrlMap.set("bullet-hole", bulletHoleUrl);

    return nameUrlMap;
  }

  static applyModelTexture(object: THREE.Object3D, texture: THREE.Texture) {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshLambertMaterial;
        mat.map = texture;
        // Synty models have this true by default, making model black
        mat.vertexColors = false;
      }
    });
  }
}
