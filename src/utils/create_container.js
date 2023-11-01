
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import * as THREE from 'three';

export function addLighting(scene, add_point_light = true) {
  if (add_point_light) {
    let pointLight = new THREE.PointLight(0xdddddd)
    pointLight.position.set(0, 3, 0)
    scene.add(pointLight)
  }

  let ambientLight = new THREE.AmbientLight(0x505050)
  scene.add(ambientLight)
}

export function setUpRoom(scene) {
  /* Create basic room mesh, and add it to the scene */
	const room = new THREE.LineSegments(
		new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
		new THREE.LineBasicMaterial( { color: 0x808080 } )
	);
  scene.add( room );

  const axesHelper = new THREE.AxesHelper( 1 );
  axesHelper.position.set( 0, 0, -1.8 );
  scene.add( axesHelper );

  // add sky box
  const path = './assets/images/MilkyWay/dark-s_';
  const format = '.jpg';
  const urls = [
    path + 'px' + format, path + 'nx' + format,
    path + 'py' + format, path + 'ny' + format,
    path + 'pz' + format, path + 'nz' + format
  ];

  const textureCube = new THREE.CubeTextureLoader().load( urls );
  scene.background = textureCube;
}
