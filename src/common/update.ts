import { Barycenter, Point, Solver, Timer } from "meca3";
import * as THREE from "three";
import { Object3D } from "three";
import { Duration, UNIT_MAP, UnitPrefix } from "./constants";
import Settings, { Frame } from "./settings";
import { SettingsDom } from "./types";

function framePosition(frame: Frame, points: Point[], barycenter: Barycenter) {
  switch (frame) {
    case null:
      return new THREE.Vector3(0, 0, 0);
    case "barycenter":
      return new THREE.Vector3(...barycenter.position.xyz);
    default:
      return new THREE.Vector3(...points[frame].position.xyz);
  }
}

function frameTrajectory(
  frame: Frame,
  points: Point[],
  barycenter: Barycenter
) {
  switch (frame) {
    case null:
      return null;
    case "barycenter":
      return barycenter.trajectory;
    default:
      return points[frame].trajectory;
  }
}

function frameLabel(frame: Frame, points: Point[]) {
  switch (frame) {
    case null:
      return "fixed";
    case "barycenter":
      return "barycenter";
    default:
      return points[frame].id;
  }
}

export function makeTime(secs: number) {
  const years = secs / Duration.Year;
  const months = secs / Duration.Month;
  const days = secs / Duration.Day;
  const hours = secs / Duration.Hour;
  const minutes = secs / Duration.Minutes;
  if (years >= 1) {
    return `${years.toFixed(2)} years`;
  }
  if (months >= 1) {
    return `${months.toFixed(2)} m ${Math.floor(months % 30)} d`;
  }
  if (days >= 1) {
    return `${Math.floor(days)} d ${Math.floor(hours % 24)} h`;
  }
  if (hours >= 1) {
    return `${Math.floor(hours)} h ${Math.floor(minutes % 60)} m`;
  }
  if (minutes >= 1) {
    return `${Math.floor(minutes)} m ${Math.floor(secs % 60)} s`;
  }
  const { value, unit } = makeUnit(secs);
  return `${value.toFixed(2)} ${unit}s`;
}

export function makeUnit(si: number) {
  const exp = Math.floor(Math.log10(si));
  if (exp < 3 && exp >= 0) {
    return { value: si, unit: UnitPrefix.None };
  }
  if (exp >= 24) {
    return { value: si / 1e9, unit: UnitPrefix.Giga };
  }
  if (exp <= -24) {
    return { value: si / 1e-9, unit: UnitPrefix.Nano };
  }
  const rem = exp % 3;
  const exp3 = exp - rem + (exp < 0 && rem !== 0 ? -3 : 0);
  return { value: si * Math.pow(10, -exp3), unit: UNIT_MAP[exp3] };
}

export function updateSimulation<T>(
  points: Point[],
  barycenter: Barycenter,
  solver: Solver<Point[], T>,
  settings: Settings
) {
  // updating the position and speed of the points
  solver.timer.dt = settings.speed / settings.samples;
  const states = solver.advance(settings.speed);
  points.forEach((point, idx) => {
    point.update(states[idx].state);
  });
  barycenter.update(points);
}

export function updateLightObject<T extends Object3D>(
  idx: number,
  points: Point[],
  barycenter: Barycenter,
  object: T,
  settings: Settings
) {
  const frame = framePosition(settings.frame, points, barycenter);
  const position = points[idx].position.xyz;
  object.position
    .set(...position)
    .sub(frame)
    .multiplyScalar(settings.scale);
}

export function updateSpheresObject<T extends Object3D>(
  points: Point[],
  barycenter: Barycenter,
  spheres: T[],
  settings: Settings
) {
  // updating spheres position in sphere according to current position of points in field
  const frame = framePosition(settings.frame, points, barycenter);
  [barycenter, ...points].forEach((point, idx) => {
    const sphere = spheres[idx];
    const position = point.position.xyz;
    sphere.position
      .set(...position)
      .sub(frame)
      .multiplyScalar(settings.scale);
  });
}

export function updateLinesObject<T extends Object3D>(
  points: Point[],
  barycenter: Barycenter,
  lines: T[][],
  settings: Settings
) {
  const frame = frameTrajectory(settings.frame, points, barycenter);
  const zero = new THREE.Vector3(0, 0, 0);
  const direction = new THREE.Vector3();
  const upVector = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  const frameVector = new THREE.Vector3();

  [barycenter, ...points].forEach((point, idx) => {
    const line = lines[idx];
    const trajectory = point.trajectory;
    line.forEach((vertex, vIdx) => {
      const previousLine = line[vIdx - 1];
      const previousVertex = vIdx === 0 ? zero : previousLine.position;
      const position = trajectory.get(vIdx);
      const pos =
        frame === null ? zero : frameVector.set(...frame.get(vIdx).xyz);

      vertex.position
        .set(...position.xyz)
        .sub(pos)
        .multiplyScalar(settings.scale);
      direction
        .subVectors(vertex.position, previousVertex)
        .negate()
        .normalize();
      quaternion.setFromUnitVectors(upVector, direction);
      vertex.setRotationFromQuaternion(quaternion);
    });
  });
}

export function updateAxesMesh(
  camera: THREE.OrthographicCamera,
  frame: THREE.Mesh[],
  scaleF: number
) {
  const scale = (camera.top - camera.bottom) / camera.zoom / 800;
  const transfer = scale / scaleF;
  frame.forEach((mesh) => {
    mesh.geometry.scale(transfer, transfer, transfer);
    mesh.position.multiplyScalar(transfer);
  });
  return scale;
}

export function updateSettingsDom(
  dom: SettingsDom,
  settings: Settings,
  points: Point[],
  barycenter: Barycenter,
  timer: Timer
) {
  dom.frame.innerText = frameLabel(settings.frame, points);
  dom.samples.innerText = settings.samples.toFixed(0);
  dom.dt.innerText = makeTime(timer.dt);
  dom.delta.innerText = makeTime(settings.speed);
  dom.momentum.innerText = barycenter.momentum.mag.toPrecision(5);
  dom.elapsed.innerText = makeTime(timer.t1);

  const { value, unit } = makeUnit(200 / settings.scale);
  dom.scale.innerText = `${value.toPrecision(4)} ${unit}m`;
}
