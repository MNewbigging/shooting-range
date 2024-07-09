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
  }
}
