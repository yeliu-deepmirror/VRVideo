import ThreeMeshUI from 'three-mesh-ui';
import * as THREE from 'three';


export function CreateContainer() {
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
  loader.load('./assets/spiny_bush_viper.jpg', (texture)=> {
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
