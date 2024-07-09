import * as THREE from "three";

export class AudioLoader {
  doneLoading = false;

  audioBuffers = new Map<string, AudioBuffer>();

  private loadingManager = new THREE.LoadingManager();

  load(onLoad: () => void) {
    // Setup loading manager
    this.loadingManager.onError = (url) => console.error("error loading", url);
    this.loadingManager.onLoad = () => {
      this.doneLoading = true;
      onLoad();
    };

    this.loadAudio();
  }

  private loadAudio() {
    const loader = new THREE.AudioLoader(this.loadingManager);

    const pistolShotUrl = new URL(
      "/audio/45 ACP 1911 Pistol - Gunshot B 001.wav",
      import.meta.url
    ).href;
    loader.load(pistolShotUrl, (buffer) =>
      this.audioBuffers.set("pistol-shot", buffer)
    );

    const pistolDryTriggerUrl = new URL(
      "/audio/45 ACP 1911 Pistol - Dry Trigger 003.wav",
      import.meta.url
    ).href;
    loader.load(pistolDryTriggerUrl, (buffer) =>
      this.audioBuffers.set("pistol-dry-trigger", buffer)
    );

    const unloadMagSoundUrl = new URL(
      "/audio/45 ACP 1911 Pistol - Magazine Unload 001.wav",
      import.meta.url
    ).href;
    loader.load(unloadMagSoundUrl, (buffer) =>
      this.audioBuffers.set("unload-mag", buffer)
    );

    const loadMagSoundUrl = new URL(
      "/audio/45 ACP 1911 Pistol - Magazine Load 001.wav",
      import.meta.url
    ).href;
    loader.load(loadMagSoundUrl, (buffer) =>
      this.audioBuffers.set("load-mag", buffer)
    );

    const rifleShotUrl = new URL(
      "/audio/5.56 M4 Rifle -  Gunshot A 001.wav",
      import.meta.url
    ).href;
    loader.load(rifleShotUrl, (buffer) =>
      this.audioBuffers.set("rifle-shot", buffer)
    );

    const rifleDryTriggerUrl = new URL(
      "/audio/5.56 M4 Rifle - Dry Trigger 001.wav",
      import.meta.url
    ).href;
    loader.load(rifleDryTriggerUrl, (buffer) =>
      this.audioBuffers.set("rifle-dry-trigger", buffer)
    );

    const rifleMagUnloadUrl = new URL(
      "/audio/5.56 M4 Rifle -  Magazine Unloading 001.wav",
      import.meta.url
    ).href;
    loader.load(rifleMagUnloadUrl, (buffer) =>
      this.audioBuffers.set("rifle-mag-unload", buffer)
    );

    const rifleMagLoadUrl = new URL(
      "/audio/5.56 M4 Rifle -  Magazine Loading 001.wav",
      import.meta.url
    ).href;
    loader.load(rifleMagLoadUrl, (buffer) =>
      this.audioBuffers.set("rifle-mag-load", buffer)
    );
  }
}
