import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';


let scene, camera, renderer;
let currentObject;
let currentColor = "#ff0000";

let uploadedTexture = null; 
let uploadedImageDataURL = null; 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let decalMeshes = []; // Tableau pour stocker les images mises sur le tshirt (terme technique décalcomanies)

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xE4E4E4);

  const viewer = document.getElementById("viewer");
  const width = viewer.clientWidth || window.innerWidth * 0.7;
  const height = viewer.clientHeight || window.innerHeight;

  // Caméra perspective
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

  // Charger le T-shirt par défaut
  loadModel('/models/wif.glb', 1, { x: 0, y: 0, z: 0 }, { x: 0 });

  setupInteractions();
  setupImageUpload();
  setupMouseClick();
  setupControls();
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Configure les lumières
function setupLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(0, 10, 0);
  directionalLight.castShadow = true;

  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);
}

// Sol pour les ombres pas bon a fix mercredi la pas le temps
function setupGround() {
  const planeGeometry = new THREE.PlaneGeometry(50, 50);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.4 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1;
  plane.receiveShadow = true;
  scene.add(plane);
}

// Charger un modèle GLB avec configuration de position et rotation
function loadModel(modelPath, scale, position, rotation) {
  const loader = new GLTFLoader();

  // Supprimer l'objet actuel avant de charger un nouveau modèle
  if (currentObject) scene.remove(currentObject);

  // Supprimer également les images collées sur le tshirt
  removeAllDecals();

  loader.load(
    modelPath,
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(scale, scale, scale);
      model.position.set(position.x, position.y, position.z);
      model.rotation.x = rotation.x;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true; 
          child.receiveShadow = false;
        }
      });

      currentObject = model; 
      applyColor(currentColor); 
      scene.add(currentObject); 
    },
    (error) => {
      console.error('Erreur lors du chargement du modèle GLB :', error);
    }
  );
}

// Appliquer la couleur choisie par l'utilisateur
function applyColor(color) {
  currentColor = color; 
  if (currentObject && currentObject.traverse) {
    currentObject.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            mat.color.set(color);
            mat.needsUpdate = true; 
          });
        } else {
          child.material.color.set(color);
          child.material.needsUpdate = true; 
        }
      }
    });
  }
}

// Appliquer la texture de coton
function applyCottonTexture() {
  const textureLoader = new THREE.TextureLoader();

  const colorMap = textureLoader.load('/textures/fabric/Fabric018_4K-JPG_Color.jpg');
  const normalMap = textureLoader.load('/textures/fabric/Fabric018_4K-JPG_NormalGL.jpg');
  const roughnessMap = textureLoader.load('/textures/fabric/Fabric018_4K-JPG_Roughness.jpg');

  // Assurer un encodage correct
  colorMap.encoding = THREE.sRGBEncoding;
  colorMap.flipY = false;

  if (currentObject && currentObject.traverse) {
    currentObject.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          roughness: 1.0,
          metalness: 0.0,
        });

        child.material.color.set(currentColor);
        child.material.needsUpdate = true; 
      }
    });
  }
}

// Appliquer la texture de cuir
function applyLeatherTexture() {
  const textureLoader = new THREE.TextureLoader();

  const colorMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_Color.jpg');
  const normalMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_NormalGL.jpg');
  const roughnessMap = textureLoader.load('/textures/leather/Leather037_2K-JPG_Roughness.jpg');

  // Assurer un encodage correct
  colorMap.encoding = THREE.sRGBEncoding;
  colorMap.flipY = false;

  normalMap.encoding = THREE.LinearEncoding;
  normalMap.flipY = false;

  roughnessMap.encoding = THREE.LinearEncoding;
  roughnessMap.flipY = false;

  if (currentObject && currentObject.traverse) {
    currentObject.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          normalMap: normalMap,
          roughnessMap: roughnessMap,
          roughness: 0.8,
          metalness: 0.2, 
          normalScale: new THREE.Vector2(1, 1), 
        });

        child.material.color.set(currentColor); 
        child.material.needsUpdate = true; 
      }
    });
  }
}

// Réinitialiser la texture à l'état normal
function resetTexture() {
  if (currentObject && currentObject.traverse) {
    currentObject.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: currentColor, 
          roughness: 1.0,
          metalness: 0.0,
        });
        child.material.needsUpdate = true; 
      }
    });
  }
}

// Configurer l'upload d'image et ajuster le contraste
function setupImageUpload() {
  const imageUpload = document.getElementById('image-upload');
  imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImageDataURL = e.target.result;
        loadImageAndAdjustContrast(uploadedImageDataURL);
      };
      reader.readAsDataURL(file);
    }
  });
}

// Fonction pour charger l'image et ajuster le contraste
function loadImageAndAdjustContrast(imageDataURL) {
  const img = new Image();
  img.onload = () => {
    // Créer un canvas pour manipuler l'image
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Obtenir les données de l'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Ajuster le contraste de l'image car elle change a cause de la lumière de la scène
    const contrast = 50; 
    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    // Permet d'ajuster le contraste des pixels d'une image Rouge,Vert et Bleu
    for (let i = 0; i < data.length; i += 4) {
      data[i] = truncate(contrastFactor * (data[i] - 128) + 128);     // Rouge
      data[i + 1] = truncate(contrastFactor * (data[i + 1] - 128) + 128); // Vert
      data[i + 2] = truncate(contrastFactor * (data[i + 2] - 128) + 128); // Bleu
      
    }

    
    ctx.putImageData(imageData, 0, 0);

    // Créer une texture à partir du canvas
    const textureLoader = new THREE.TextureLoader();
    const canvasDataURL = canvas.toDataURL();
    uploadedTexture = textureLoader.load(canvasDataURL, () => {
      uploadedTexture.wrapS = THREE.RepeatWrapping;
      uploadedTexture.repeat.x = -1;
    });
    uploadedTexture.encoding = THREE.sRGBEncoding;
    uploadedTexture.flipY = false;
  };
  img.src = imageDataURL;
}

// Fonction pour s'assurer que les valeurs sont dans la plage 0-255
function truncate(value) {
  return Math.min(255, Math.max(0, value));
}

// Capturer le clic de l'utilisateur sur le modèle 3D
function setupMouseClick() {
  renderer.domElement.addEventListener('click', onClick, false);
}

function onClick(event) {
  if (!uploadedTexture) {
    // Si aucune image n'est chargée, ne rien faire
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(currentObject, true);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const point = intersect.point;
    const normal = intersect.face.normal.clone().transformDirection(intersect.object.matrixWorld).normalize();
    const mesh = intersect.object;

    applyDecal(mesh, point, normal);
  }
}

// Appliquer une image comme décalcomanie
function applyDecal(mesh, position, normal) {
  const size = new THREE.Vector3(0.125, 0.125, 0.125); // Taille réduite par 4

  // Calculer l'orientation du décalcomanie
  const up = new THREE.Vector3(0, 1, 0);
  const orientation = new THREE.Euler();

  // Créer une matrice de rotation basée sur le normal et l'axe 'up'
  const matrix = new THREE.Matrix4();
  matrix.lookAt(normal, new THREE.Vector3(0, 0, 0), up);

  // Convertir la matrice en angles d'Euler
  orientation.setFromRotationMatrix(matrix);

  // Faire une rotation de 180 degrés autour des axes Z et Y pour corriger l'orientation
  orientation.z += Math.PI;

  const decalGeometry = new DecalGeometry(
    mesh,
    position,
    orientation,
    size
  );

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
  scene.add(decalMesh);

  decalMeshes.push(decalMesh);
}

// Fonction pour enlever toutes les images (décalcomanies)
function removeAllDecals() {
  for (let i = 0; i < decalMeshes.length; i++) {
    scene.remove(decalMeshes[i]);
  }
  decalMeshes = []; // Réinitialiser le tableau
}

// Gestion des interactions (changer modèle, couleur, et texture)
function setupInteractions() {
  const tshirtBtn = document.getElementById("tshirt-btn");
  const poloBtn = document.getElementById("polo-btn");
  const pullBtn = document.getElementById("pull-btn");
  const cottonBtn = document.getElementById("cotton-btn");
  const leatherBtn = document.getElementById("leather-btn");
  const normalBtn = document.getElementById("normal-btn");
  const colorPicker = document.getElementById("color-picker");
  const removeImagesBtn = document.getElementById("remove-images-btn");

  if (tshirtBtn) {
    tshirtBtn.addEventListener("click", () => {
      loadModel('/models/wif.glb', 1, { x: 0, y: 0, z: 0 }, { x: 0 });
    });
  }

  if (poloBtn) {
    poloBtn.addEventListener("click", () => {
      loadModel('/models/waf.glb', 1, { x: 0, y: 0, z: 0 }, { x: 0 });
    });
  }

  if (pullBtn) {
    pullBtn.addEventListener("click", () => {
      loadModel('/models/wouf.glb', 1, { x: 0, y: 0, z: 0 }, { x: 0 });
    });
  }

  if (cottonBtn) {
    cottonBtn.addEventListener("click", applyCottonTexture);
  }

  if (leatherBtn) {
    leatherBtn.addEventListener("click", applyLeatherTexture);
  }

  if (normalBtn) {
    normalBtn.addEventListener("click", resetTexture);
  }

  if (colorPicker) {
    colorPicker.addEventListener("input", (event) => {
      applyColor(event.target.value);
    });
  }

  if (removeImagesBtn) {
    removeImagesBtn.addEventListener("click", removeAllDecals);
  }
}

// Redimensionner
window.addEventListener("resize", () => {
  const viewer = document.getElementById("viewer");
  const width = viewer.clientWidth || window.innerWidth * 0.7;
  const height = viewer.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

function setupControls() {
  let isDragging = false;
  let previousMousePosition = { x: 0 };

  renderer.domElement.addEventListener('mousedown', (event) => {
    isDragging = true;
  });

  renderer.domElement.addEventListener('mousemove', (event) => {
    if (isDragging && currentObject) {
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
      };

      const rotationSpeed = 0.005; // Ajustez la vitesse de rotation

      currentObject.rotation.y += deltaMove.x * rotationSpeed; // Rotation uniquement sur l'axe Y

      // Limiter la rotation horizontale (axe Y)
      const maxRotationY = Math.PI / 4; // Limite droite (45 degrés)
      const minRotationY = -Math.PI / 4; // Limite gauche (-45 degrés)
      currentObject.rotation.y = Math.max(
        minRotationY,
        Math.min(maxRotationY, currentObject.rotation.y)
      );
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


init();
