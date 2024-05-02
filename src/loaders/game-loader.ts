import * as THREE from "three";
import { action, makeAutoObservable, observable } from "mobx";

import { ModelLoader } from "./model-loader";
import { AnimLoader } from "./anim-loader";
import { TextureLoader } from "./texture-loader";

// This is a higher-order loader class that groups the various loaders together
export class GameLoader {
  @observable loading = false;

  readonly textureLoader = new TextureLoader();
  readonly modelLoader = new ModelLoader();
  readonly animLoader = new AnimLoader();

  constructor() {
    makeAutoObservable(this);
    THREE.Cache.enabled = true;
  }

  @action load() {
    this.loading = true;

    this.textureLoader.load(this.onLoaderFinish);
    this.modelLoader.load(this.onLoaderFinish);
    // this.animLoader.load(this.onLoaderFinish); // if adding, also check for doneLoading below
  }

  private onLoaderFinish = () => {
    // Simply check if all loaders have finished now
    if (this.modelLoader.doneLoading && this.textureLoader.doneLoading) {
      this.loading = false;
    }
  };
}
