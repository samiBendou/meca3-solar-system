import { PointConstructor, SystemAcceleration, Vector3, Vector6 } from "meca3";
import {
  Body,
  Color,
  initAxesMesh,
  initCamera,
  initControls,
  initScene,
  initSettingsDom,
  initStats,
  initSystemSimulation,
  Settings,
  updateAxesMesh,
  updateLinesMesh,
  updateSettingsDom,
  updateSimulation,
  updateSpheresMesh,
} from "meca3-examples";
import * as THREE from "three";
import orbits, { OrbitalBody } from "./data";
import { initBodiesMesh } from "./init";
import Orbit from "./Orbit";

const BUFFER_LENGTH = 8192;
const SAMPLE_PER_FRAMES = 8192;
const TARGET_FRAMERATE = 60;

const SECS_PER_MONTH = 2.628e6;
const GRAVITATIONAL_CONSTANT = -6.67408e-11;

const initOrbitBody =
  (trueAnomaly: number) =>
  (body: OrbitalBody): Body & PointConstructor => {
    const orbit = new Orbit(body.orbit);
    const position = orbit.positionAt(trueAnomaly);
    const speed = orbit.speedAt(trueAnomaly);
    return {
      id: body.name,
      radius: 10,
      mass: body.mass,
      color: body.color as unknown as Color,
      trajectoryLength: BUFFER_LENGTH,
      state: Vector6.concatenated(position, speed),
    };
  };

const initLight = (): THREE.PointLight => {
  const color = Color.White;
  const intensity = 1;
  return new THREE.PointLight(color, intensity, 10e12, 1000);
};

const data = {
  barycenter: {
    state: Vector6.zeros,
    trajectoryLength: BUFFER_LENGTH,
    color: Color.White,
    radius: 5,
  },
  points: orbits.map(initOrbitBody(Math.random() * 2 * Math.PI)),
};

// gravitational field between bodies
const zero = Vector3.zeros;
const acceleration = Vector3.zeros;
const gravitationalAcceleration: SystemAcceleration = (p, point) => {
  if (point.id === p.id) {
    return zero;
  }
  const dist3 = point.position.dist(p.position) ** 3;
  const k = (GRAVITATIONAL_CONSTANT * point.mass) / dist3;
  acceleration.copy(p.position);
  return acceleration.sub(point.position).mul(k);
};

let zoomScale = 1;
const settings = new Settings({
  scale: 1e-9,
  speed: SECS_PER_MONTH / TARGET_FRAMERATE,
  samples: SAMPLE_PER_FRAMES,
});

function init() {
  const { scale } = settings;
  const stats = initStats();
  const { points, solver, barycenter } = initSystemSimulation(
    data,
    gravitationalAcceleration,
    settings
  );
  const { spheres, lines } = initBodiesMesh([data.barycenter, ...data.points]);
  const axes = initAxesMesh();
  const light = initLight();
  const { renderer, scene } = initScene(light, ...spheres, ...lines, ...axes);
  const camera = initCamera(scale, 0, 0, 1e9);
  const controls = initControls(points, settings, camera);
  const dom = initSettingsDom();

  return function animate() {
    stats.begin();
    updateSimulation(points, barycenter, solver, settings);
    updateSpheresMesh(points, barycenter, spheres, settings);
    updateLinesMesh(points, barycenter, lines, settings);
    updateSettingsDom(dom, settings, points, barycenter, solver.timer);
    zoomScale = updateAxesMesh(camera, axes, zoomScale);
    controls.update();
    renderer.setSize(window.outerWidth, window.outerHeight);
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
  };
}

const animate = init();
animate();

