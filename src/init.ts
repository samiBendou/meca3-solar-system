import { Body } from "meca3-examples";
import * as THREE from "three";

export function initBarycenterMesh(point: Body) {
  const { radius, color } = point;
  const geometry = new THREE.BoxGeometry(radius, radius);
  const material = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export function initSphereMesh(point: Body) {
  const { radius, color } = point;
  const geometry = new THREE.SphereGeometry(radius, 16, 32);
  const material = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geometry, material);
}

export function initLineMesh(point: Body) {
  const { color, trajectoryLength } = point;
  const geometry = new THREE.Geometry();
  const material = new THREE.LineBasicMaterial({
    color,
  });
  geometry.vertices = new Array(trajectoryLength)
    .fill(undefined)
    .map(() => new THREE.Vector3(0, 0, 0));
  return new THREE.Line(geometry, material);
}

export function initBodiesMesh(points: Body[]) {
  const spheres = points.map(initSphereMesh);
  const lines = points.map(initLineMesh);
  return { spheres, lines };
}

