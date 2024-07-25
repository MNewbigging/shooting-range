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

    const clickUrl = new URL(
      "/audio/Tractor Interior Buttons D.wav",
      import.meta.url
    ).href;
    loader.load(clickUrl, (buffer) => this.audioBuffers.set("click", buffer));

    const impactUrl = new URL("/audio/Drop Metal A.wav", import.meta.url).href;
    loader.load(impactUrl, (buffer) => this.audioBuffers.set("impact", buffer));

    const swapUrl = new URL("/audio/Kydex Holster 002.wav", import.meta.url)
      .href;
    loader.load(swapUrl, (buffer) => this.audioBuffers.set("swap", buffer));

    const synth80s = new URL(
      "/audio/80s Synth Rock Station Main.wav",
      import.meta.url
    ).href;
    loader.load(synth80s, (buffer) =>
      this.audioBuffers.set("synth-80s", buffer)
    );

    const electronic = new URL(
      "/audio/Heavy Electronic Edge Main.wav",
      import.meta.url
    ).href;
    loader.load(electronic, (buffer) =>
      this.audioBuffers.set("electronic", buffer)
    );

    const jazz = new URL("/audio/Jazz Love Dance Main.wav", import.meta.url)
      .href;
    loader.load(jazz, (buffer) => this.audioBuffers.set("jazz", buffer));

    const lofi = new URL("/audio/Lo-Fi Phat & Lazy Main.wav", import.meta.url)
      .href;
    loader.load(lofi, (buffer) => this.audioBuffers.set("lofi", buffer));

    const metal = new URL(
      "/audio/Metal Vol3 Sleeveless Main.wav",
      import.meta.url
    ).href;
    loader.load(metal, (buffer) => this.audioBuffers.set("metal", buffer));

    const rhythmic = new URL(
      "/audio/Rhythmic Vol2 Zebra Main.wav",
      import.meta.url
    ).href;
    loader.load(rhythmic, (buffer) => this.audioBuffers.set("zebra", buffer));

    const synthwave = new URL(
      "/audio/Synthwave Blue Sunset Main.wav",
      import.meta.url
    ).href;
    loader.load(synthwave, (buffer) =>
      this.audioBuffers.set("synthwave", buffer)
    );
  }
}
