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
  }
}
