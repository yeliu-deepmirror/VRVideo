
/* Import everything we need from Three.js */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Stats from 'three/addons/libs/stats.module.js';
import VRControl from '../src/utils/VRControl.js';
import DmWs from '../src/utils/web_socket.js';

// import ThreeMeshUI from 'three-mesh-ui';
import * as DM_UTILS from '../src/utils/create_container.js';

window.addEventListener('load', init);

let dm_ws_;
let scene, camera, dolly, renderer, vr_control, stats;
let scene_rotation_cubes = [];
let gamepad_0, gamepad_1;
let text_logger_;
let camera_xr_;

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

function loop() {
	stats.update();
  // {
	// 	let message = '#cam_' + camera_xr_.cameras.length;
	// 	text_logger_.UpdateText(message);
	// }

	renderer.render( scene, camera );

	for(let object of scene_rotation_cubes) {
		object.rotation.x += 0.01;
		object.rotation.y += 0.03;
	}
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
	stats.domElement.style.cssText = 'position:absolute;top:0px;left:90%;';
	container.appendChild( stats.dom );

	console.log("Initialize the world.");
	/* Create the container object, the scene */
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x505050 );

	/* Create the renderer object, with VR parameters enabled */
	renderer = new THREE.WebGLRenderer({ antialias: false });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	camera_xr_ = renderer.xr.getCamera();
	document.body.appendChild(VRButton.createButton(renderer));
	document.body.appendChild( renderer.domElement );

	/* Create the camera from which the scene will be seen */
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.set( 0, 1.2, 0 );
	camera.lookAt( 0, 1.2, -1 );
	camera.layers.enable(1);

	// https://github.com/NikLever/Learn-WebXR/blob/6294bd4d2b0ceb82536c4ab2bb3de79bd5f8decc/start/lecture6_1/app.js#L198
	dolly = new THREE.Object3D();
	dolly.add(camera);
	for (let i = 0; i < camera_xr_.cameras.length; i++) {
		dolly.add(camera_xr_.cameras[i]);
	}
	scene.add(dolly);

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

	DM_UTILS.setUpRoom(scene)
	DM_UTILS.addLighting(scene, true);
	addBasicCube();
	text_logger_ = new DM_UTILS.TextLoader(scene);
	// dm_ws_ = new DmWs(text_logger_);

	var mesh = DM_UTILS.createExperimentalCube();
	mesh.position.set( 0.9, 1, -1.8 );
	scene.add(mesh);
  scene_rotation_cubes.push(mesh);

	/* Render loop (called ~60 times/second, or more in VR) */
	renderer.setAnimationLoop( loop );
};
