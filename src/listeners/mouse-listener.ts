export type MouseEventCallback = () => void;
export type MouseEventType = "mousedown" | "mouseup";
export enum MouseButton {
  LEFT,
  MIDDLE,
  RIGHT,
}

export class MouseListener {
  lmb = false;
  lastReleasedButton?: MouseButton;

  private enabled = false;
  private pressListeners = new Map<MouseEventType, MouseEventCallback[]>();
  private releaseListeners = new Map<MouseEventType, MouseEventCallback[]>();

  constructor() {
    this.enable();
  }

  enable() {
    if (this.enabled) {
      return;
    }

    window.addEventListener("mousedown", this.onMouseDownEvent);
    window.addEventListener("mouseup", this.onMouseUpEvent);

    this.enabled = true;
  }

  disable() {
    if (!this.enabled) {
      return;
    }

    window.removeEventListener("mousedown", this.onMouseDownEvent);
    window.removeEventListener("mouseup", this.onMouseUpEvent);

    this.enabled = false;
  }

  addListener(eventType: MouseEventType, callback: MouseEventCallback) {
    const map =
      eventType === "mousedown" ? this.pressListeners : this.releaseListeners;

    const existing = map.get(eventType) ?? [];
    existing.push(callback);
    map.set(eventType, existing);
  }

  removeListener(eventType: MouseEventType, callback: MouseEventCallback) {
    const map =
      eventType === "mousedown" ? this.pressListeners : this.releaseListeners;

    let existing = map.get(eventType);
    if (existing?.length) {
      existing = existing.filter((cb) => cb !== callback);
      map.set(eventType, existing);
    }
  }

  private onMouseDownEvent = (e: MouseEvent) => {
    this.lmb = e.button === 0;

    this.pressListeners.get("mousedown")?.forEach((cb) => cb());
  };

  private onMouseUpEvent = (e: MouseEvent) => {
    this.lmb = !(e.button === 0);
    this.lastReleasedButton = e.button;

    this.releaseListeners.get("mouseup")?.forEach((cb) => cb());
  };
}
