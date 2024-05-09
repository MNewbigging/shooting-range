import { MouseListener } from "../../listeners/mouse-listener";

export type FiringModeName = "semi-auto" | "auto" | "burst";

// A firing mode doesn't do the firing, just determines WHEN to fire
export abstract class FiringMode {
  readonly timeBetweenShots: number;
  protected shotTimer = 0;

  constructor(rpm: number, private readonly fire: () => void) {
    this.timeBetweenShots = 1 / (rpm / 60);
  }

  abstract get name(): FiringModeName;
  abstract enable(): void;
  abstract disable(): void;

  update(dt: number) {
    this.shotTimer -= dt;
  }

  onFire() {
    this.shotTimer = this.timeBetweenShots;
    this.fire();
  }
}

export class AutomaticFiringMode extends FiringMode {
  constructor(
    private mouseListener: MouseListener,
    rpm: number,
    fire: () => void
  ) {
    super(rpm, fire);
  }

  get name(): FiringModeName {
    return "auto";
  }

  override enable(): void {
    //
  }

  override disable(): void {
    //
  }

  override update(dt: number) {
    super.update(dt);

    if (this.canFire()) {
      this.onFire();
    }
  }

  private canFire() {
    return this.mouseListener.lmb && this.shotTimer <= 0;
  }
}

export class SemiAutoFiringMode extends FiringMode {
  constructor(
    private mouseListener: MouseListener,
    rpm: number,
    fire: () => void
  ) {
    super(rpm, fire);
  }

  get name(): FiringModeName {
    return "semi-auto";
  }

  override enable(): void {
    this.mouseListener.addListener("mousedown", this.onMouseDown);
  }

  override disable() {
    this.mouseListener.removeListener("mousedown", this.onMouseDown);
  }

  private canFire() {
    return this.mouseListener.lmb && this.shotTimer <= 0;
  }

  private onMouseDown = () => {
    if (this.canFire()) {
      this.onFire();
    }
  };
}
