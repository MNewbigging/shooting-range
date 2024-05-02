export class MouseListener {
  lmb = false;

  constructor() {
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.lmb = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.lmb = false;
    }
  };
}
