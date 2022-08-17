import { PointConstructor, SystemAcceleration, Vector3, Vector6 } from "meca3";
import {
  Body,
  Color,
  initBodiesMesh,
  initCamera,
  initControls,
  initFrameMesh,
  initScene,
  initSettingsDom,
  initStats,
  initSystemSimulation,
  Settings,
  updateObjectFrame,
  updateObjectLines,
  updateObjectSpheres,
  updateSettingsDom,
  updateSimulation,
} from "meca3-examples";
import Orbit, { OrbitConstructor } from "./Orbit";

const BUFFER_LENGTH = 8192;
const SAMPLE_PER_FRAMES = 8192;
const TARGET_FRAMERATE = 60;

const SECS_PER_MONTH = 2.628e6;
const GRAVITATIONAL_CONSTANT = -6.67408e-11;

type OrbitalBody = {
  name: string;
  kind: "Star" | "Terrestrial" | "Giant";
  mass: number;
  radius: number;
  color: string;
  orbit: OrbitConstructor;
};

const orbits: OrbitalBody[] = [
  {
    name: "Sun",
    kind: "Star",
    mass: 1.9891e30,
    radius: 6.96342e8,
    color: "#E95700",
    orbit: {
      mu: 0.0,
      apoapsis: 0.0,
      periapsis: 0.0,
      argument: 0.0,
      inclination: {
        value: 0.0,
        argument: 0.0,
      },
    },
  },
  {
    name: "Mercury",
    kind: "Terrestrial",
    mass: 3.3011e23,
    radius: 2.4397e6,
    color: "#876945",
    orbit: {
      mu: 1.3271246205000001e20,
      apoapsis: 6.9817079e10,
      periapsis: 4.6001272e10,
      argument: 29.12478,
      inclination: {
        value: 7.00487,
        argument: 48.33167,
      },
    },
  },
  {
    name: "Venus",
    kind: "Terrestrial",
    mass: 4.8685e24,
    radius: 6.0518e6,
    color: "#FFFFF1",
    orbit: {
      mu: 1.32712764877e20,
      apoapsis: 1.08942109e11,
      periapsis: 1.07476259e11,
      argument: 54.85229,
      inclination: {
        value: 3.39,
        argument: 76.67069,
      },
    },
  },
  {
    name: "Earth",
    kind: "Terrestrial",
    mass: 5.9736e24,
    radius: 6.3781e6,
    color: "#195D8D",
    orbit: {
      mu: 1.3271283861844181e20,
      apoapsis: 1.52097701e11,
      periapsis: 1.47098074e11,
      argument: 288.064,
      inclination: {
        value: 0.0,
        argument: 174.873,
      },
    },
  },
  {
    name: "Mars",
    kind: "Terrestrial",
    mass: 6.4185e23,
    radius: 3.3962e6,
    color: "#79392E",
    orbit: {
      mu: 1.3271248284637e20,
      apoapsis: 2.4922873e11,
      periapsis: 2.06644545e11,
      argument: 286.4623,
      inclination: {
        value: 1.85061,
        argument: 49.578,
      },
    },
  },
  {
    name: "Jupiter",
    kind: "Giant",
    mass: 1.8986e27,
    radius: 7.1492e7,
    color: "#C28B51",
    orbit: {
      mu: 1.32839126552e20,
      apoapsis: 8.1662e11,
      periapsis: 7.4052e11,
      argument: 275.066,
      inclination: {
        value: 1.3053,
        argument: 100.55615,
      },
    },
  },
  {
    name: "Saturn",
    kind: "Giant",
    mass: 5.6846e26,
    radius: 6.0268e7,
    color: "#D9C2AD",
    orbit: {
      mu: 1.32750371205e20,
      apoapsis: 1.503983449e12,
      periapsis: 1.349823615e12,
      argument: 338.7169,
      inclination: {
        value: 2.48446,
        argument: 113.7153281104,
      },
    },
  },
  {
    name: "Uranus",
    kind: "Giant",
    mass: 8.681e25,
    radius: 2.5559e7,
    color: "#297D85",
    orbit: {
      mu: 1.32718233957e20,
      apoapsis: 3.006318143e12,
      periapsis: 2.734998229e12,
      argument: 96.541318,
      inclination: {
        value: 0.77,
        argument: 73.989821,
      },
    },
  },
  {
    name: "Neptune",
    kind: "Giant",
    mass: 1.0243e26,
    radius: 2.4764e7,
    color: "#3E5F9E",
    orbit: {
      mu: 1.3271927654700001e20,
      apoapsis: 4.55394649e12,
      periapsis: 4.452940833e12,
      argument: 273.24966,
      inclination: {
        value: 1.76917,
        argument: 131.72169,
      },
    },
  },
];

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
  scale: 1e-12,
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
  const frame = initFrameMesh();
  const { renderer, scene } = initScene(...spheres, ...lines, ...frame);
  const camera = initCamera(scale, 0, 0, 50e12);
  const controls = initControls(points, settings, camera);
  const dom = initSettingsDom();

  return function animate() {
    stats.begin();
    updateSimulation(points, barycenter, solver, settings);
    updateObjectSpheres(points, barycenter, spheres, settings);
    updateObjectLines(points, barycenter, lines, settings);
    updateSettingsDom(dom, settings, points, barycenter, solver.timer);
    zoomScale = updateObjectFrame(camera, frame, zoomScale);
    controls.update();
    renderer.setSize(window.outerWidth, window.outerHeight);
    renderer.render(scene, camera);
    stats.end();
    requestAnimationFrame(animate);
  };
}

const animate = init();
animate();

