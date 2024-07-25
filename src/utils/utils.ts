import * as THREE from "three";
import GUI from "lil-gui";

export function addGui(object: THREE.Object3D, name = "") {
  const gui = new GUI();

  gui.add(object.position, "x").name(name + " pos x");
  gui.add(object.position, "y").name(name + " pos y");
  gui.add(object.position, "z").name(name + " pos z");

  gui
    .add(object.rotation, "y")
    .name(name + " rot y")
    .min(0)
    .max(Math.PI * 2)
    .step(0.001);

  gui.add(object.scale, "x").name(name + " scale x");
}

export function getChildIncludesName(object: THREE.Object3D, includes: string) {
  return object.children.find((child) => child.name.includes(includes));
}

export function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function randomId(length: number = 5) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789";

  let id = "";
  for (let i = 0; i < length; i++) {
    const rnd = Math.floor(Math.random() * characters.length);
    id += characters.charAt(rnd);
  }

  return id;
}

export function getTimeDisplayString(totalSeconds?: number) {
  if (!totalSeconds) {
    return "-- : --";
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const minString = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const secString = seconds < 10 ? `0${seconds}` : `${seconds}`;

  return `${minString}:${secString}`;
}
