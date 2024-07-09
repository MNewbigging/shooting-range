import * as THREE from "three";
import { action, makeAutoObservable, observable } from "mobx";

import { ModelLoader } from "./model-loader";
import { TextureLoader } from "./texture-loader";
import { AudioLoader } from "./audio-loader";

// This is a higher-order loader class that groups the various loaders together
export class GameLoader {
  @observable loading = false;

  readonly textureLoader = new TextureLoader();
  readonly modelLoader = new ModelLoader();
  readonly audioLoader = new AudioLoader();

  constructor() {
    makeAutoObservable(this);
    THREE.Cache.enabled = true;
  }

  @action load() {
    this.loading = true;

    this.textureLoader.load(this.onLoaderFinish);
    this.modelLoader.load(this.onLoaderFinish);
    this.audioLoader.load(this.onLoaderFinish);
  }

  private onLoaderFinish = () => {
    // Simply check if all loaders have finished now
    if (
      this.modelLoader.doneLoading &&
      this.textureLoader.doneLoading &&
      this.audioLoader.doneLoading
    ) {
      this.loading = false;
    }
  };
}
