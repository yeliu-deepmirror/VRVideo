
/* Import everything we need from Three.js */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import VRControl from 'three-mesh-ui/examples/utils/VRControl.js';

import ThreeMeshUI from 'three-mesh-ui';
import * as DM_UTILS from './create_container.js';
import * as DM_MPI from './mpi_render.js';
import * as DM_GS from './gaussian_splatting_render.js';

window.addEventListener('load', init);

let scene, camera, dolly, renderer, vr_control;
let scene_rotation_cubes = [];
let gamepad_0, gamepad_1;

// https://github.com/mattvr/vr-art-gallery/blob/897274d4f2848fa944d78f09c53b8a0c42f34039/src_app/app.ts#L80
function handleControllerLeft() {
	if (!gamepad_0) return;
	const move_speed = 0.1;

	// moving in the camera reference frame
	let quaternion = new THREE.Quaternion();
	camera.getWorldQuaternion(quaternion);
	let movement = new THREE.Vector3(gamepad_0.axes[2] * move_speed, 0, gamepad_0.axes[3] * move_speed);
	movement.applyQuaternion( quaternion );
	dolly.position.x += movement.x;
	dolly.position.y += movement.y;
	dolly.position.z += movement.z;
}
function handleControllerRight() {
	if (!gamepad_1) return;
	const rotate_speed = 0.03;
	dolly.rotation.y -= gamepad_1.axes[2] * rotate_speed;
}

function loop() {
	ThreeMeshUI.update();  // tell three-mesh-ui when to update.
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
	scene.add( dolly );

	/* Create the renderer object, with VR parameters enabled */
	renderer = new THREE.WebGLRenderer({ antialias: true });
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
	scene.add( vr_control.controllerGrips[ 0 ], vr_control.controllers[ 0 ] );
	scene.add( vr_control.controllerGrips[ 1 ], vr_control.controllers[ 1 ] );

	// add mesh UI object
	const container = DM_UTILS.createContainer()
	scene.add( container );

	DM_UTILS.setUpRoom(scene)
	DM_UTILS.addLighting(scene, true);
	addBasicCube();
	DM_GS.loadPly(scene);

	var mesh = DM_MPI.createExperimentalCube();
	mesh.position.set( 0.9, 1, -1.8 );
	scene.add(mesh);
  scene_rotation_cubes.push(mesh);

	/* Render loop (called ~60 times/second, or more in VR) */
	renderer.setAnimationLoop( loop );
};
