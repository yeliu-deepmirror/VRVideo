
/* Import everything we need from Three.js */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Stats from 'three/addons/libs/stats.module.js';
import VRControl from './utils/VRControl.js';

// import ThreeMeshUI from 'three-mesh-ui';
import * as DM_UTILS from './utils/create_container.js';
import * as DM_MPI from './mpi_render.js';
import * as DM_GS from './gaussian_splatting_render.js';

window.addEventListener('load', init);

let gaussian_splatting;
let scene, camera, dolly, renderer, vr_control, stats;
let scene_rotation_cubes = [];
let gamepad_0, gamepad_1;

const move_speed = 0.1;
const rotate_speed = 0.03;

function MoveDolly(x, y, z) {
	// moving in the camera reference frame
	let quaternion = new THREE.Quaternion();
	camera.getWorldQuaternion(quaternion);
	let movement = new THREE.Vector3(x * move_speed, y * move_speed, z * move_speed);
	movement.applyQuaternion( quaternion );
	dolly.position.x += movement.x;
	dolly.position.y += movement.y;
	dolly.position.z += movement.z;
}

// https://github.com/mattvr/vr-art-gallery/blob/897274d4f2848fa944d78f09c53b8a0c42f34039/src_app/app.ts#L80
function handleControllerLeft() {
	if (!gamepad_0) return;
	MoveDolly(gamepad_0.axes[2], 0, gamepad_0.axes[3]);
}
function handleControllerRight() {
	if (!gamepad_1) return;
	dolly.rotation.y -= gamepad_1.axes[2] * rotate_speed;
}

function loop() {
	stats.update();
	renderer.render( scene, camera );

	for(let object of scene_rotation_cubes) {
		object.rotation.x += 0.01;
		object.rotation.y += 0.03;
	}
	// requestAnimationFrame(loop);
	handleControllerLeft();
	handleControllerRight();
};

function addBasicCube() {
  let geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  let material = new THREE.MeshLambertMaterial();

  let mesh = new THREE.Mesh(geometry, material);
	mesh.position.set( -0.9, 1, -1.8 );
  scene.add(mesh);
  scene_rotation_cubes.push(mesh);
};

function init() {
	let container = document.getElementById( 'container' );
	stats = new Stats();
	container.appendChild( stats.dom );

	console.log("Initialize the world.");
	/* Create the container object, the scene */
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x505050 );

	/* Create the camera from which the scene will be seen */
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.set( 0, 1.6, 0 );
	camera.lookAt( 0, 1, -1.8 );

	// https://github.com/NikLever/Learn-WebXR/blob/6294bd4d2b0ceb82536c4ab2bb3de79bd5f8decc/start/lecture6_1/app.js#L198
	dolly = new THREE.Object3D();
	dolly.add(camera);
	scene.add(dolly);

	/* Create the renderer object, with VR parameters enabled */
	renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild(VRButton.createButton(renderer));
	document.body.appendChild( renderer.domElement );

	// create controller
	vr_control = VRControl( renderer, camera, scene );
	vr_control.controllers[0].addEventListener( 'connected', function (event) {
		console.log("connect gamepad 0");
		gamepad_0 = event.data.gamepad;
	});
	vr_control.controllers[1].addEventListener( 'connected', function (event) {
		console.log("connect gamepad 1");
		gamepad_1 = event.data.gamepad;
	});
	// add controllers to dolly instead of directly to the scene
	dolly.add(vr_control.controllerGrips[ 0 ], vr_control.controllers[ 0 ]);
	dolly.add(vr_control.controllerGrips[ 1 ], vr_control.controllers[ 1 ]);

	const cameraVR = renderer.xr.getCamera();
	if (cameraVR.cameras.length == 0) {
		window.addEventListener("keydown", (e) => {
			if (gamepad_0 || gamepad_1) return;

			switch (e.key) {
				case 'w':
					MoveDolly(0, 0, -1); break;
				case 's':
					MoveDolly(0, 0, 1); break;
				case 'a':
					MoveDolly(-1, 0, 0); break;
				case 'd':
					MoveDolly(1, 0, 0); break;
				case 'ArrowLeft':
					dolly.rotation.y += rotate_speed; break;
				case 'ArrowRight':
				  dolly.rotation.y -= rotate_speed; break;
				case 'ArrowUp':
					dolly.rotation.x += rotate_speed; break;
				case 'ArrowDown':
					dolly.rotation.x -= rotate_speed; break;
				default:
			}
		});
	}

	gaussian_splatting = new DM_GS.GaussianSplattingRender(scene, renderer, camera);
	gaussian_splatting.LoadPlyFromUrl('./assets/pointcloud/jmw_night.ply');

	DM_UTILS.setUpRoom(scene)
	DM_UTILS.addLighting(scene, true);
	addBasicCube();
	// scene.add(DM_MPI.createMpiPlane());

	var mesh = DM_MPI.createExperimentalCube();
	mesh.position.set( 0.9, 1, -1.8 );
	scene.add(mesh);
  scene_rotation_cubes.push(mesh);

	/* Render loop (called ~60 times/second, or more in VR) */
	renderer.setAnimationLoop( loop );
};
