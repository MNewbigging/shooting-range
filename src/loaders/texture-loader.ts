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
    this.loadWeaponSkin1Texture(loader);
  }

  private loadWeaponSkin1Texture(loader: THREE.TextureLoader) {
    const url = new URL("/textures/Wep_Skin_01.png", import.meta.url).href;
    loader.load(url, (texture) => {
      // So colours don't look washed out
      texture.encoding = THREE.sRGBEncoding;
      this.textures.set("weapon-01", texture);
    });
  }
}
