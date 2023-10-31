
/* Import everything we need from Three.js */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import VRControl from 'three-mesh-ui/examples/utils/VRControl.js';

import ThreeMeshUI from 'three-mesh-ui';
import * as DM_UTILS from './create_container.js';
import * as DM_MPI from './mpi_render.js';

window.addEventListener('load', init);

let scene, camera, renderer, vr_control
let sceneObjects = []

function loop() {
	ThreeMeshUI.update();  // tell three-mesh-ui when to update.
	renderer.render( scene, camera );

	for(let object of sceneObjects) {
		object.rotation.x += 0.01;
		object.rotation.y += 0.03;
	}
	// requestAnimationFrame(loop);
};

function addBasicCube() {
  let geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  let material = new THREE.MeshLambertMaterial();

  let mesh = new THREE.Mesh(geometry, material);
	mesh.position.set( -0.9, 1, -1.8 );
  scene.add(mesh);
  sceneObjects.push(mesh);
};

function init() {
	/* Create the container object, the scene */
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x505050 );

	/* Create the camera from which the scene will be seen */
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
	camera.position.set( 0, 1.6, 0 );
	camera.lookAt( 0, 1, -1.8 );

	/* Create the renderer object, with VR parameters enabled */
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.xr.enabled = true;
	document.body.appendChild(VRButton.createButton(renderer));
	document.body.appendChild( renderer.domElement );

	// create controller
	vr_control = VRControl( renderer, camera, scene );
	scene.add( vr_control.controllerGrips[ 0 ], vr_control.controllers[ 0 ] );
	scene.add( vr_control.controllerGrips[ 1 ], vr_control.controllers[ 1 ] );

	// add mesh UI object
	const container = DM_UTILS.createContainer()
	scene.add( container );

	DM_UTILS.setUpRoom(scene)
	DM_UTILS.addLighting(scene, true);
	addBasicCube();

	var mesh = DM_MPI.createExperimentalCube();
	mesh.position.set( 0.9, 1, -1.8 );
	scene.add(mesh);
  sceneObjects.push(mesh);

	/* Render loop (called ~60 times/second, or more in VR) */
	renderer.setAnimationLoop( loop );
};
