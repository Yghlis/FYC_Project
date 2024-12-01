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
  // Initialisation de la scène
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE4E4E4);

  const viewer = document.getElementById("viewer");
  const width = viewer.clientWidth || window.innerWidth * 0.7;
  const height = viewer.clientHeight || window.innerHeight;

  // Configuration de la caméra
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.6, 2);
  camera.lookAt(0, 1.2, 0);

  // Configuration du renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  viewer.appendChild(renderer.domElement);

  setupLights();

  // Charger le modèle par défaut
  loadModel('/models/wif.glb', 1, { x: 0, y: 0, z: 0 });

  setupInteractions();
  setupImageUpload();
  setupMouseClick();
  setupMouseRotation(); // Ajout de la rotation par la souris
  setupTextureButtons(); // Ajout des boutons pour changer de texture
  animate();
}

// Animation
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Lumières
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
}

// Charger un modèle
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

// Appliquer une couleur
function applyColor(color) {
  currentColor = color;
  if (currentGroup) {
    currentGroup.traverse((child) => {
      if (child.isMesh) child.material.color.set(color);
    });
  }
}

// Appliquer une texture normale (par défaut)
function applyNormalTexture() {
  if (currentGroup) {
    currentGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: currentColor, // Couleur actuelle
          roughness: 1.0,
          metalness: 0.0,
        });
        child.material.needsUpdate = true;
      }
    });
  }
}

// Appliquer une texture en cuir
function applyLeatherTexture() {
  const textureLoader = new THREE.TextureLoader();

  const colorMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_Color.jpg');
  const normalMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_NormalGL.jpg');
  const roughnessMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_Roughness.jpg');

  if (currentGroup) {
    currentGroup.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMap, // Texture de couleur
          normalMap: normalMap, // Carte normale
          roughnessMap: roughnessMap, // Carte de rugosité
          roughness: 0.8,
          metalness: 0.2,
        });
        child.material.needsUpdate = true;
      }
    });
  }
}

// Gérer les boutons de textures
function setupTextureButtons() {
  const normalBtn = document.getElementById('normal-btn');
  const leatherBtn = document.getElementById('leather-btn');

  normalBtn.addEventListener('click', applyNormalTexture);
  leatherBtn.addEventListener('click', applyLeatherTexture);
}

// Gérer l'upload d'image
function setupImageUpload() {
  const imageUpload = document.getElementById('image-upload');
  const imagePreview = document.getElementById('image-preview');

  imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedTexture = new THREE.TextureLoader().load(e.target.result, () => {
          uploadedTexture.flipY = false;
          uploadedTexture.encoding = THREE.sRGBEncoding;
        });

        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('remove-images-btn').addEventListener('click', () => {
    removeAllDecals();
    uploadedTexture = null;
    imagePreview.src = "";
    imagePreview.style.display = 'none';
  });
}

// Appliquer une image comme décalcomanie
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

// Gérer le clic pour appliquer une image
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

// Supprimer les décalcomanies
function removeAllDecals() {
  decalMeshes.forEach((decal) => {
    if (decal.parent) {
      decal.parent.remove(decal);
    }
  });
  decalMeshes.length = 0;
}

// Rotation contrôlée par la souris
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
      const maxRotationY = Math.PI / 4; // Limite droite (45°)
      const minRotationY = -Math.PI / 4; // Limite gauche (-45°)

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
