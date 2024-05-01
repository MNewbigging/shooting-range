import * as THREE from "three";

export class MouseListener {
  movementX = 0;
  movementY = 0;

  private clientX = 0;
  private clientY = 0;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener("mousemove", this.onMouseMove);
  }

  getNdc() {
    const rect = this.canvas.getBoundingClientRect();
    const clickCoords = {
      x: this.clientX - rect.left,
      y: this.clientY - rect.top,
    };

    clickCoords.x /= rect.width;
    clickCoords.y /= rect.height;

    clickCoords.y = 1.0 - clickCoords.y;

    clickCoords.x = clickCoords.x * 2.0 - 1.0;
    clickCoords.y = clickCoords.y * 2.0 - 1.0;

    return new THREE.Vector2(clickCoords.x, clickCoords.y);
  }

  postUpdate() {
    // Clear per-frame values
    this.movementX = 0;
    this.movementY = 0;
  }

  private onMouseMove = (e: MouseEvent) => {
    // Just store values for later use to keep this light
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.movementX = e.movementX;
    this.movementY = e.movementY;
  };
}
