import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

let scene, camera, renderer;
let currentGroup; // Groupe contenant le modèle et les décalcomanies
let currentColor = "#ff0000";

let uploadedTexture = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let decalMeshes = []; // Tableau pour stocker les décalcomanies appliquées

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE4E4E4);

  const viewer = document.getElementById("viewer");
  const width = viewer.clientWidth || window.innerWidth * 0.7;
  const height = viewer.clientHeight || window.innerHeight;

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.6, 2);
  camera.lookAt(0, 1.2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  viewer.appendChild(renderer.domElement);

  setupLights();
  setupGround();
  loadModel('/models/wif.glb', 1, { x: 0, y: 0, z: 0 });

  setupInteractions();
  setupImageUpload();
  setupMouseClick();
  setupMouseRotation();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
}

function setupGround() {
  const planeGeometry = new THREE.PlaneGeometry(50, 50);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  plane.receiveShadow = true;
  scene.add(plane);
}

function loadModel(modelPath, scale, position) {
  const loader = new GLTFLoader();

  if (currentGroup) scene.remove(currentGroup);
  removeAllDecals();

  loader.load(modelPath, (gltf) => {
    const model = gltf.scene;
    model.scale.set(scale, scale, scale);
    model.position.set(position.x, position.y, position.z);

    currentGroup = new THREE.Group();
    currentGroup.add(model);

    applyColor(currentColor);
    scene.add(currentGroup);
  });
}

function removeAllDecals() {
  decalMeshes.forEach((decal) => {
    if (decal.parent) {
      decal.parent.remove(decal);
    }
  });
  decalMeshes.length = 0; // Vide le tableau des décalcomanies
}

function applyColor(color) {
  currentColor = color;
  if (currentGroup) {
    currentGroup.traverse((child) => {
      if (child.isMesh) child.material.color.set(color);
    });
  }
}

function setupMouseClick() {
  renderer.domElement.addEventListener('click', (event) => {
    if (!uploadedTexture) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(currentGroup, true);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const position = intersect.point.clone();
      const normal = intersect.face.normal.clone().transformDirection(intersect.object.matrixWorld).normalize();

      applyDecal(intersect.object, position, normal);
    }
  });
}

function applyDecal(mesh, position, normal) {
  const size = new THREE.Vector3(0.15, 0.15, 0.15);

  const up = new THREE.Vector3(0, 1, 0);
  const orientation = new THREE.Euler();
  const matrix = new THREE.Matrix4();
  matrix.lookAt(normal, new THREE.Vector3(0, 0, 0), up);
  orientation.setFromRotationMatrix(matrix);
  orientation.z += Math.PI;

  const decalGeometry = new DecalGeometry(mesh, position, orientation, size);

  const decalMaterial = new THREE.MeshBasicMaterial({
    map: uploadedTexture,
    transparent: true,
    opacity: 1,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    side: THREE.DoubleSide,
  });

  const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
  currentGroup.add(decalMesh);
  decalMeshes.push(decalMesh);
}

function setupMouseRotation() {
  let isDragging = false;
  let previousMousePosition = { x: 0 };

  renderer.domElement.addEventListener('mousedown', () => {
    isDragging = true;
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (isDragging && currentGroup) {
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
      };

      const rotationSpeed = 0.005;

      const deltaRotationQuaternion = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(0, deltaMove.x * rotationSpeed, 0, 'XYZ'));

      currentGroup.quaternion.multiplyQuaternions(deltaRotationQuaternion, currentGroup.quaternion);

      const euler = new THREE.Euler().setFromQuaternion(currentGroup.quaternion, 'XYZ');
      const maxRotationY = Math.PI / 4;
      const minRotationY = -Math.PI / 4;

      if (euler.y > maxRotationY) euler.y = maxRotationY;
      else if (euler.y < minRotationY) euler.y = minRotationY;

      currentGroup.quaternion.setFromEuler(euler);
    }

    previousMousePosition.x = event.clientX;
  });

  renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
  });

  renderer.domElement.addEventListener('mouseleave', () => {
    isDragging = false;
  });
}

// Configurer les interactions
function setupInteractions() {
  document.getElementById('color-picker').addEventListener('input', (event) => {
    applyColor(event.target.value);
  });
}

init();
