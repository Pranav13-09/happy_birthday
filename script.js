import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import tableMatImage from "./table.png";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// SECTION constants
const candleRadius = 0.35; // Base radius of the candle
const candleHeight = 3.5; // Total height of the candle
const candleCount = 5; // Number of candles

const serviceKey = import.meta.env.VITE_EMAIL_SERVICE_KEY;
const templateKey = import.meta.env.VITE_EMAIL_TEMPLATE_ID;
const test = import.meta.env;
console.log(serviceKey,templateKey,"I am env loaded", test); 

const baseRadius = 2.5; // Base radius of the cake
const baseHeight = 2; // Height of the cake base
const middleRadius = 2; // Middle radius of the cake
const middleHeight = 1.25; // Height of the cake middle
const topRadius = 1.5 // Top radius of the cake
const topHeight = 1; // Height of the cake top

const tableHeightOffset = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(3, 5, 8).setLength(15);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101005);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minPolarAngle = THREE.MathUtils.degToRad(60);
controls.maxPolarAngle = THREE.MathUtils.degToRad(95);
controls.minDistance = 4;
controls.maxDistance = 20;
controls.autoRotate = true;
controls.autoRotateSpeed = 1;
controls.target.set(0, 2, 0);
controls.update();

var light = new THREE.DirectionalLight(0xffffff, 0.025);
light.position.setScalar(10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.05));


// flame

function getFlameMaterial(isFrontSide) {
	let side = isFrontSide ? THREE.FrontSide : THREE.BackSide;
	return new THREE.ShaderMaterial({
		uniforms: {
			time: { value: 0 }
		},
		vertexShader: `
uniform float time;
varying vec2 vUv;
varying float hValue;

//https://thebookofshaders.com/11/
// 2D Random
float random (in vec2 st) {
return fract(sin(dot(st.xy,
vec2(12.9898,78.233)))
* 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
vec2 i = floor(st);
vec2 f = fract(st);

// Four corners in 2D of a tile
float a = random(i);
float b = random(i + vec2(1.0, 0.0));
float c = random(i + vec2(0.0, 1.0));
float d = random(i + vec2(1.0, 1.0));

// Smooth Interpolation

// Cubic Hermine Curve.  Same as SmoothStep()
vec2 u = f*f*(3.0-2.0*f);
// u = smoothstep(0.,1.,f);

// Mix 4 coorners percentages
return mix(a, b, u.x) +
(c - a)* u.y * (1.0 - u.x) +
(d - b) * u.x * u.y;
}

void main() {
vUv = uv;
vec3 pos = position;

pos *= vec3(0.8, 2, 0.725);
hValue = position.y;
//float sinT = sin(time * 2.) * 0.5 + 0.5;
float posXZlen = length(position.xz);

pos.y *= 1. + (cos((posXZlen + 0.25) * 3.1415926) * 0.25 + noise(vec2(0, time)) * 0.125 + noise(vec2(position.x + time, position.z + time)) * 0.5) * position.y; // flame height

pos.x += noise(vec2(time * 2., (position.y - time) * 4.0)) * hValue * 0.0312; // flame trembling
pos.z += noise(vec2((position.y - time) * 4.0, time * 2.)) * hValue * 0.0312; // flame trembling

gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
`,
		fragmentShader: `
varying float hValue;
varying vec2 vUv;

// honestly stolen from https://www.shadertoy.com/view/4dsSzr
vec3 heatmapGradient(float t) {
return clamp((pow(t, 1.5) * 0.8 + 0.2) * vec3(smoothstep(0.0, 0.35, t) + t * 0.5, smoothstep(0.5, 1.0, t), max(1.0 - t * 1.7, t * 7.0 - 6.0)), 0.0, 1.0);
}

void main() {
float v = abs(smoothstep(0.0, 0.4, hValue) - 1.);
float alpha = (1. - v) * 0.99; // bottom transparency
alpha -= 1. - smoothstep(1.0, 0.97, hValue); // tip transparency
gl_FragColor = vec4(heatmapGradient(smoothstep(0.0, 0.3, hValue)) * vec3(0.95,0.95,0.4), alpha) ;
gl_FragColor.rgb = mix(vec3(0,0,1), gl_FragColor.rgb, smoothstep(0.0, 0.3, hValue)); // blueish for bottom
gl_FragColor.rgb += vec3(1, 0.74, 0) * (1.25 - vUv.y); // make the midst brighter
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.66, 0.32, 0.03), smoothstep(0.95, 1., hValue)); // tip
}
`,
		transparent: true,
		side: side
	});
}
var flameMaterials = [];
function flame() {
	let flameGeo = new THREE.SphereGeometry(0.5, 32, 32);
	flameGeo.translate(0, 0.5, 0);
	let flameMat = getFlameMaterial(true);
	flameMaterials.push(flameMat);
	let flame = new THREE.Mesh(flameGeo, flameMat);
	flame.position.set(0.06, candleHeight, 0.06);
	flame.rotation.y = THREE.MathUtils.degToRad(-45);
	return flame;
}

const candleColors = [0xffc0cb, 0xfff5ba, 0xadd8e6]; 

function createCandle() {
    const candleGroup = new THREE.Group();

    // Candle Geometry - scale up to make it larger
    const candleGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 16); // Adjusted diameter and height
	const textureLoader = new THREE.TextureLoader();
	const candleTexture = textureLoader.load('/candle.png');
    const candleMaterial = new THREE.MeshPhongMaterial({ color: 0xad2001, map : candleTexture });
    const candleMesh = new THREE.Mesh(candleGeometry, candleMaterial, );
    candleMesh.position.y = 1.5; // Adjusted position to keep the base at y = 0

    // Flame Geometry - scale up to match larger candle
    const flameGeometry = new THREE.SphereGeometry(0.3, 8, 8); // Adjusted size for the flame
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa500 }); // Orange color for flame
    const flameMesh = new THREE.Mesh(flameGeometry, flameMaterial);
    flameMesh.position.y = 3.1; // Position flame above the larger candle
    candleGroup.add(candleMesh);
    candleGroup.add(flameMesh);

    // Candle Glow (PointLight)
    const candleLight = new THREE.PointLight(0xffd700, 0.5, 2); // Soft, warm glow
    candleLight.position.set(0, 3.1, 0);
    candleGroup.add(candleLight);

    // Flame Flicker Effect - randomize flame size periodically
    setInterval(() => {
        const scale = 0.8 + Math.random() * 0.4; // Randomly adjust flame size
        flameMesh.scale.set(scale, scale, scale);
        candleLight.intensity = 0.4 + Math.random() * 0.2; // Slight variation in glow
    }, 100); // Flicker every 100 ms

    return candleGroup;
}

const candleMesh = createCandle();

// candle light
var candleLight = new THREE.PointLight(0xffaa33, 1, 5, 2);
candleLight.position.set(0, candleHeight, 0);
candleLight.castShadow = true;
candleMesh.add(candleLight);
var candleLight2 = new THREE.PointLight(0xffaa33, 1, 10, 2);
candleLight2.position.set(0, candleHeight + 1, 0);
candleLight2.castShadow = true;
candleMesh.add(candleLight2);

candleMesh.add(flame());
candleMesh.add(flame())


var tableGeo = new THREE.CylinderGeometry(14, 14, 0.5, 64);
tableGeo.translate(0, -tableHeightOffset, 0);

// Load texture for the table (wood or marble)
const textureLoader = new THREE.TextureLoader();
const tableTexture = textureLoader.load(tableMatImage);
tableTexture.wrapS = THREE.RepeatWrapping;
tableTexture.wrapT = THREE.RepeatWrapping;
tableTexture.repeat.set(4, 4); // Adjust for visible grain or marble veins

// Enhanced table material for a polished wooden or marble look
var tableMat = new THREE.MeshStandardMaterial({
    map: tableTexture,
    metalness: 0.2,       // Slight metalness for a polished look
    roughness: 0.4,       // Moderate roughness to keep some texture
});

// Create and add the table mesh
var tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.receiveShadow = true;

scene.add(tableMesh);

var clock = new THREE.Clock();
var time = 0;

render();
function render() {
	requestAnimationFrame(render);
	time += clock.getDelta();
	flameMaterials[0].uniforms.time.value = time;
	flameMaterials[1].uniforms.time.value = time;
	candleLight2.position.x = Math.sin(time * Math.PI) * 0.25;
	candleLight2.position.z = Math.cos(time * Math.PI * 0.75) * 0.25;
	candleLight2.intensity = 2 + Math.sin(time * Math.PI * 2) * Math.cos(time * Math.PI * 1.5) * 0.25;
	controls.update();
	renderer.render(scene, camera);
}



function createFlower(color) {
    const flowerGroup = new THREE.Group();
    
    // Center of the flower
    const centerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const centerMaterial = new THREE.MeshPhongMaterial({ color: 0xffff66 });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    flowerGroup.add(center);

    // Flower petals
    const petalGeometry = new THREE.CylinderGeometry(0.02, 0.1, 0.1, 12);
    const petalMaterial = new THREE.MeshPhongMaterial({ color: color });
    
    for (let i = 0; i < 5; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.rotation.z = Math.PI / 2;
        petal.position.set(Math.cos((i * 2 * Math.PI) / 5) * 0.15, 0, Math.sin((i * 2 * Math.PI) / 5) * 0.15);
        petal.rotation.y = (i * 2 * Math.PI) / 5;
        flowerGroup.add(petal);
    }

    return flowerGroup;
}

function createCake() {
	const cakeGroup = new THREE.Group();

	// Load texture for cream-like appearance
	const textureLoader = new THREE.TextureLoader();
	const creamTexture = textureLoader.load('/sprinkle.jpg');
	const sprinkleTexture = textureLoader.load('/decoration.jpg');

	// Base layer with a soft pink color and cream texture
	const baseGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 32);
	const baseMaterial = new THREE.MeshPhongMaterial({
		color: 0xffc0cb, // Soft pink
		map: creamTexture,
		metalness: 0.1,
		roughness: 0.6
	});
	const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
	baseMesh.castShadow = true;
	baseMesh.receiveShadow = true;

	// Middle layer with light yellow and cream texture
	const middleGeometry = new THREE.CylinderGeometry(middleRadius, middleRadius, middleHeight, 32);
	const middleMaterial = new THREE.MeshPhongMaterial({
		color: 0xFAFAD2, // Light yellow
		map: creamTexture,
		metalness: 0.2,
		roughness: 0.5
	});
	const middleMesh = new THREE.Mesh(middleGeometry, middleMaterial);
	middleMesh.position.y = baseHeight / 2 + middleHeight / 2;
	middleMesh.castShadow = true;
	middleMesh.receiveShadow = true;

	// Top layer with a sky blue color and cream texture
	const topGeometry = new THREE.CylinderGeometry(topRadius, topRadius, topHeight, 32);
	const topMaterial = new THREE.MeshPhongMaterial({
		color: 0xadd8e6, // Sky blue
		map: creamTexture,
		metalness: 0.1,
		roughness: 0.4
	});
	const topMesh = new THREE.Mesh(topGeometry, topMaterial);
	topMesh.position.y = baseHeight / 2 + middleHeight + topHeight / 2;
	topMesh.castShadow = true;
	topMesh.receiveShadow = true;



const flowerColors = [0xff69b4, 0xff1493, 0xffc0cb]; // Pink shades for the flowers


	for (let i = 0; i < 6; i++) {
		const flower = createFlower(flowerColors[1]);
		flower.position.set(
			Math.cos((i * Math.PI) / 3) * baseRadius * 0.9,
			baseHeight / 2 + 0.1, // Middle of the base layer
			Math.sin((i * Math.PI) / 3) * baseRadius * 0.9
		);
		cakeGroup.add(flower);
	}
	
	// Flowers around the middle of the middle layer
	for (let i = 0; i < 6; i++) {
		const flower = createFlower(flowerColors[i % flowerColors.length]);
		flower.position.set(
			Math.cos((i * Math.PI) / 3) * middleRadius * 0.8,
			baseHeight + middleHeight / 4, // Middle of the middle layer
			Math.sin((i * Math.PI) / 3) * middleRadius * 0.8
		);
		cakeGroup.add(flower);
	}
	
	// Flowers around the middle of the top layer
	for (let i = 0; i < 4; i++) {
		const flower = createFlower(flowerColors[i % flowerColors.length]);
		flower.position.set(
			Math.cos((i * Math.PI) / 2) * topRadius * 0.6,
			baseHeight + middleHeight + 0.1 , // Middle of the top layer
			Math.sin((i * Math.PI) / 2) * topRadius * 0.6
		);
		cakeGroup.add(flower);
	}
	


	// Add all layers to the cake group
	cakeGroup.add(baseMesh);
	cakeGroup.add(middleMesh);
	cakeGroup.add(topMesh);

	return cakeGroup;
}

const cake = createCake();
scene.add(cake);

// 修改 caseMesh 的縮放和位置
candleMesh.scale.set(0.3, 0.3, 0.3);
candleMesh.castShadow = false;
candleMesh.position.y = baseHeight / 2 + middleHeight + topHeight; // 調整高度以放置在蛋糕頂部

// 創建多個蠟燭
function createCandles(count) {
	const candleGroup = new THREE.Group();
	const radius = 1;
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		const candle = candleMesh.clone();
		candle.position.x = Math.cos(angle) * radius;
		candle.position.z = Math.sin(angle) * radius;
		candleGroup.add(candle);
	}
	return candleGroup;
}

// 將蠟燭添加到蛋糕上
const candles = createCandles(candleCount);
cake.add(candles);

// 調整相機位置
camera.position.set(0, 5, 10);
camera.lookAt(cake.position);

const spotLight1 = new THREE.SpotLight(0xffffff, 1.2);
spotLight1.position.set(0, 20, 0);
spotLight1.castShadow = true;
spotLight1.shadow.mapSize.width = 1024;
spotLight1.shadow.mapSize.height = 1024;
scene.add(spotLight1);

// Target the spotlight on the cake
spotLight1.target = cake;


const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);

// Spotlight above the cake
const spotLight = new THREE.SpotLight(0xffffff, 1.2);
spotLight.position.set(0, 20, 0);
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.target = cake;
scene.add(spotLight);

// Colored point lights for ambiance
const pointLight1 = new THREE.PointLight(0xffb6c1, 0.3, 15);
pointLight1.position.set(5, 3, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xffffff, 0.3, 15);
pointLight2.position.set(-5, 3, -5);
scene.add(pointLight2);

const pointLight3 = new THREE.PointLight(0xd8bfd8, 0.3, 15);
pointLight3.position.set(-5, 3, 5);
scene.add(pointLight3);


// 添加按住事件監聽
let holdTimeout;
let allowBlowout=false;


const holdReminder=document.getElementById('hold-reminder');
const audio=document.getElementById("happy-birthday-audio");

audio.addEventListener('ended', function() {
	holdReminder.style.display = 'flex';
	setTimeout(function() {
		holdReminder.classList.add('show');
	}, 10); // 確保 display 設置生效後再添加類名
	allowBlowout=true;
});

// // enable the hold event after the song is played
function handleHoldStart() {
	if(!allowBlowout){
		return;
	}

	holdTimeout = setTimeout(() => {
		var count = 200;
		var defaults = {
		origin: { y: 0.7 }
		};



		function fire(particleRatio, opts) {
		confetti({
			...defaults,
			...opts,
			particleCount: Math.floor(count * particleRatio)
		});
		}

	const audio2 = document.getElementById('party-audio');
	audio2.play();
		fire(0.25, {
		spread: 26,
		startVelocity: 55,
		});
		fire(0.2, {
		spread: 60,
		});
		fire(0.35, {
		spread: 100,
		decay: 0.91,
		scalar: 0.8
		});
		fire(0.1, {
		spread: 120,
		startVelocity: 25,
		decay: 0.92,
		scalar: 1.2
		});
		fire(0.1, {
		spread: 120,
		startVelocity: 45,
		});
			}, 500);

	holdTimeout = setTimeout(() => {
		blowOutCandles();
	}, 500);
}

function handleHoldEnd() {
	clearTimeout(holdTimeout);
}

const button = document.getElementById('blowCandlesButton');
button.addEventListener('click', () => {
	handleHoldStart();
  });


function showCongratulation() {
  const overlay = document.getElementById('congratulation-overlay');
  overlay.style.pointerEvents = 'auto';
  overlay.style.background = 'rgba(0, 0, 0, 0.8)';
  overlay.style.opacity = '1';
}
function shiftToNewScene(){
	// scene.children.forEach((child) => {
	// 	console.log(child,"I am the child");
    //     if (child.geometry) child.geometry.dispose();
    //     if (child.material) {
    //         if (Array.isArray(child.material)) {
    //             child.material.forEach((mat) => mat.dispose());
    //         } else {
    //             child.material.dispose();
    //         }
    //     }
    //     scene.remove(child);
    // });
	scene.remove(cake);
	scene.remove(candles);
	cake.traverse((child) => {
		if (child.isMesh) {
			child.geometry.dispose();
			if (child.material.map) child.material.map.dispose();
			child.material.dispose();
		}
	});
	candles.traverse((child) => {
		if (child.isMesh) {
			child.geometry.dispose();
			if (child.material.map) child.material.map.dispose();
			child.material.dispose();
		}
	});
	const scene1 = new THREE.Scene();
	const loader = new FontLoader();
	const audio1 = document.getElementById('next-audio');
	audio1.play();
	audio1.volume=0.6;

	const audio3 = document.getElementById('next2-audio');
	const btn = document.getElementById('makeWishDiv');
	btn.style.display='flex';
	btn.style.zIndex='1000';
	btn.style.position='fixed';
	btn.style.top='5vh';
	btn.style.left='50vw-10px';

	audio1.addEventListener('ended', function() {
		audio3.play();
		audio3.volume=0.7;
	});
	


loader.load('/lobster2.json', function (font) {
	const textGeometry1 = new TextGeometry('Happy Birthday', {
        font: font,
        size: 1.5, // Larger font size for "Happy Birthday"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

    const textGeometry2 = new TextGeometry('Sayali  !!!', {
        font: font,
        size: 1.8, // Smaller font size for "Sayali"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

    // Create Material
    const textMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffa07a, // Warm coral color
        emissive: 0x553333, // Subtle glow effect
        roughness: 0.4,
        metalness: 0.5,
        clearcoat: 1.0, // Adds a polished shine
        clearcoatRoughness: 0.1,
    });

    // Adjust lighting to complement the new color scheme
    const ambientLight1 = new THREE.AmbientLight(0x1e90ff, 0.4); // Soft blue ambient light
    scene1.add(ambientLight1);

    const spotLight1 = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI / 4);
    spotLight1.position.set(10, 20, 10);
    spotLight1.castShadow = true;
    scene1.add(spotLight1);

    // Create Mesh for each line
    const textMesh1 = new THREE.Mesh(textGeometry1, textMaterial);
    const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial);

    // Position the text (adjust Y position for each line)
    textMesh1.position.set(-6, 6, 2); // Position "Happy Birthday"
    textMesh2.position.set(-4, 2.5, 2); // Position "Sayali" below it

    // Add to the scene
    scene1.add(textMesh1);
    scene1.add(textMesh2);

	function animateText() {
		const time = Date.now() * 0.002;
		textMesh1.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
		textMesh2.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
	}

    // Background - Starry Effect
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 50; // Spread stars
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true,
        opacity: 0.8
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene1.add(starField);

    // Lighting
    const spotLight = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI / 4);
    spotLight.position.set(10, 20, 10);
    spotLight.castShadow = true;
    scene1.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0xadd8e6, 0.3); // Soft blue ambient light
    scene1.add(ambientLight);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
       animateText(); // Text Animation
        starField.rotation.y += 0.0005; // Rotate stars slowly
        renderer.render(scene1, camera);
    }

    animate();
});

// Renderer and Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 5, 15);

}


const submitWishBtn = document.getElementById('submitWishBtn');
submitWishBtn.addEventListener('click',()=>{
	submitWish();
})

function closeWishForm(final =false) {
    const wishForm = document.getElementById('wishForm');
    wishForm.style.display = 'none'; // Hide the overlay
	const wishbtn = document.getElementById('makeWishDiv');
	const wishDiv =  document.getElementById('makeAWishBtn');
    
	if(final){
         console.log("I am returning");
		return;
	}
	console.log("I am after");
	wishDiv.style.display='flex';
	wishbtn.style.display='flex';
	wishbtn.style.zIndex='1000';
	wishbtn.style.position='fixed';
	wishbtn.style.top='5vh';
	wishbtn.style.left='50vw-10px';

}

function shiftToFinalScene(){
	scene.children.forEach((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
            } else {
                child.material.dispose();
            }
        }
        scene.remove(child);
    });
	
	const whatsappbtn = document.getElementById('whatsapp-icon-container');
	whatsappbtn.style.display ='flex'
	const scene1 = new THREE.Scene();
	const loader = new FontLoader();
	
loader.load('/lobster2.json', function (font) {
	const textGeometry1 = new TextGeometry('Your wishes will all come true', {
        font: font,
        size: 0.5, // Larger font size for "Happy Birthday"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

	const textGeometry2 = new TextGeometry('May this year be filled with,', {
        font: font,
        size: 0.6, // Smaller font size for "Sayali"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

	const textGeometry3 = new TextGeometry('endless joy and new opportunities,', {
        font: font,
        size: 0.6, // Smaller font size for "Sayali"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

	const textGeometry4 = new TextGeometry('Happy Birthday and may your journey', {
        font: font,
        size: 0.6, // Smaller font size for "Sayali"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

	const textGeometry5 = new TextGeometry('be as beautiful as you are.', {
        font: font,
        size: 0.6, // Smaller font size for "Sayali"
        height: 0.4, // Text depth
        curveSegments: 32, // Smoother curves
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 8, // High-quality bevel
    });

	

 

    // Create Material
    const textMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffa07a, // Warm coral color
        emissive: 0x553333, // Subtle glow effect
        roughness: 0.4,
        metalness: 0.5,
        clearcoat: 1.0, // Adds a polished shine
        clearcoatRoughness: 0.1,
    });

    // Adjust lighting to complement the new color scheme
    const ambientLight1 = new THREE.AmbientLight(0x1e90ff, 0.4); // Soft blue ambient light
    scene1.add(ambientLight1);

    const spotLight1 = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI / 4);
    spotLight1.position.set(10, 20, 10);
    spotLight1.castShadow = true;
    scene1.add(spotLight1);

    // Create Mesh for each line
    const textMesh1 = new THREE.Mesh(textGeometry1, textMaterial);
    const textMesh2 = new THREE.Mesh(textGeometry2, textMaterial);
	const textMesh3 = new THREE.Mesh(textGeometry3,textMaterial);
	const textMesh4 = new THREE.Mesh(textGeometry4, textMaterial);
	const textMesh5 = new THREE.Mesh(textGeometry5,textMaterial);

    // Position the text (adjust Y position for each line)
    textMesh1.position.set(-6, 10, 2); // Position "Happy Birthday"
    textMesh2.position.set(-6, 8, 2);
	textMesh3.position.set(-6, 6, 2);
	textMesh4.position.set(-6, 4, 2);
	textMesh5.position.set(-6, 2, 2);



    // Add to the scene
    scene1.add(textMesh1);
    scene1.add(textMesh2);
	scene1.add(textMesh3);
	scene1.add(textMesh4);
	scene1.add(textMesh5);

	function animateText() {
		const time = Date.now() * 0.002;
		textMesh1.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
		textMesh2.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
		textMesh3.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
		textMesh4.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
		textMesh5.scale.setScalar(1 + Math.sin(time) * 0.05); // Subtle pulsating effect
	}

    // Background - Starry Effect
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 50; // Spread stars
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,
        transparent: true,
        opacity: 0.8
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    scene1.add(starField);

    // Lighting
    const spotLight = new THREE.SpotLight(0xffffff, 1.5, 50, Math.PI / 4);
    spotLight.position.set(10, 20, 10);
    spotLight.castShadow = true;
    scene1.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0xadd8e6, 0.3); // Soft blue ambient light
    scene1.add(ambientLight);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
       animateText(); // Text Animation
        starField.rotation.y += 0.0005; // Rotate stars slowly
        renderer.render(scene1, camera);
    }

    animate();
});

// Renderer and Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 5, 15);

}

function submitWish() {

	console.log("Submit wish is called");
    const wishText = document.getElementById("wishText").value;

    if (wishText.trim() === "") {
        alert("Please write a wish before making a one !!");
        return;
    }

    // Replace with your actual service ID and template ID
    const serviceID = serviceKey;
    const templateID = templateKey;

    // Prepare the data for EmailJS
    const templateParams = {
        wish_message: wishText, // The user's wish
    };

    // Send email using EmailJS
    emailjs.send(serviceID, templateID, templateParams)
        .then(() => {
            document.getElementById("wishForm").style.display = "none"; // Close the modal
        })
        .catch((error) => {
            
        });
		closeWishForm(true);

		shiftToFinalScene();
}

function blowOutCandles() {
	candles.children.forEach(candle => {
		const speed = 1 + Math.random() * 3;
		extinguishCandle(candle, speed);
	});

	// 逐漸增加環境光
	let ambientLightIntensity = ambientLight.intensity;
	const ambientInterval = setInterval(() => {
		ambientLightIntensity += 0.01;
		if (ambientLightIntensity >= 0.1) {
			clearInterval(ambientInterval);
			ambientLight.intensity = 0.1;
			// showCongratulation();
			shiftToNewScene();
		} else {
			ambientLight.intensity = ambientLightIntensity;
		}
	}, 3000);

	document.getElementById('hold-reminder').style.display = 'none';
}

function extinguishCandle(candle, speed) {
	const flames = candle.children.filter(child => child.material && child.material.type === 'ShaderMaterial');
	const lights = candle.children.filter(child => child instanceof THREE.PointLight);

	let progress = 0;
	const extinguishInterval = setInterval(() => {
		progress += 0.0002 * speed;
		if (progress >= 1) {
			clearInterval(extinguishInterval);
			flames.forEach(flame => flame.visible = false);
			lights.forEach(light => light.intensity = 0);
		} else {
		
			flames.forEach(flame => {
				flame.material.opacity = 1 - progress;
				flame.scale.set(1 - progress, 1 - progress, 1 - progress);
			});

		
			lights.forEach(light => {
				light.intensity = 1 - progress;
			});
		}
	}, 30);
}



const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.3,
    transparent: true,
    opacity: 0.8,
});

// Generate random positions for stars
const starCount = 1000;
const positions = [];
for (let i = 0; i < starCount; i++) {
	let zPosition;
    if (Math.random() > 0.5) {
        zPosition = Math.random() * (200) + 25;  // Random between 25 and 225
    } else {
        zPosition = -(Math.random() * (200));     // Random between -1 and -200
    }

    positions.push(
        (Math.random() - 0.5) * 200, // X position
        (Math.random() - 0.5) * 200, // Y position
        zPosition                    // Z position within the specified range
    );
}
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

// Create the Points object for the stars
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Optional: Adjust camera or star field if necessary
 


function animateStars() {
    // Randomly adjust opacity over time to simulate twinkling
    starMaterial.opacity = 0.6 + Math.sin(Date.now() * 0.002) * 0.4;
}

// In your main animation loop:
function animate() {
    requestAnimationFrame(animate);
    
    // Add star twinkling animation
    animateStars();
    
    renderer.render(scene, camera);
}

animate();











