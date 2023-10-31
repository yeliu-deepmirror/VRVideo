import ThreeMeshUI from 'three-mesh-ui';
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import * as THREE from 'three';

export function createContainer() {
  // add mesh UI object
  const container = new ThreeMeshUI.Block({
  	height: 1.5,
  	width: 1
  });
  container.set({
  	fontFamily: './assets/Roboto-msdf.json',
  	fontTexture: './assets/Roboto-msdf.png',
  });
  container.position.set( 0, 1, -1.8 );
  container.rotation.x = -0.55;

  // Create two new blocks, that will contain a picture and some text :
  const imageBlock = new ThreeMeshUI.Block({
  	height: 1,
  	width: 1,
  	offset: 0.1 // distance separating the inner block from its parent
  });
  const loader = new THREE.TextureLoader();
  loader.load('./assets/images/spiny_bush_viper.jpg', (texture)=> {
  	imageBlock.set({ backgroundTexture: texture });
  });

  const textBlock = new ThreeMeshUI.Block({
  	height: 0.4,
  	width: 0.8,
  	margin: 0.05, // like in CSS, horizontal and vertical distance from neighbour
  	offset: 0.1 // distance separating the inner block from its parent
  }).add(
		new ThreeMeshUI.Text( { content: 'The spiny bush viper is known for its extremely keeled dorsal scales.' } )
	);
  container.add( imageBlock, textBlock );

  return container;
};

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
