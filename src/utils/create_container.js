
import { BoxLineGeometry } from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

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
	const room = new THREE.LineSegments(
		new BoxLineGeometry( 12, 6, 12, 10, 10, 10 ).translate( 0, 3, 0 ),
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

  // 360 skybox
  // var geometry = new THREE.SphereGeometry( 500, 60, 40 );
  // geometry.scale( - 1, 1, 1 );
  // var material = new THREE.MeshBasicMaterial( {
  //   map: new THREE.TextureLoader().load( './assets/video/room.jpg' )
  // } );
  // let mesh = new THREE.Mesh( geometry, material );
  // scene.add( mesh );
}

function vertexShaderBox() {
  return `
    varying vec3 vUv;

    void main() {
      vUv = position;

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `
}

function fragmentShaderBox() {
return `
    uniform vec3 colorA;
    uniform vec3 colorB;
    varying vec3 vUv;

    void main() {
      gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
    }
`
}

export function createExperimentalCube(size = 0.2) {
  // https://dev.to/maniflames/creating-a-custom-shader-in-threejs-3bhi
  let uniforms = {
        colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
        colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)}
    }

  let geometry = new THREE.BoxGeometry(size, size, size)
  let material =  new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: fragmentShaderBox(),
    vertexShader: vertexShaderBox(),
  })

  let mesh = new THREE.Mesh(geometry, material)
  return mesh;
}

export class TextLoader {
  group_ = null;
  scene_ = null;
  text_mesh_ = null;
  font_ = null;
  materials_ = null;
  constructor(scene) {
    this.group_ = new THREE.Group();
    this.scene_ = scene;
    scene.add(this.group_);

    this.materials_ = [
    					new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: true } ), // front
    					new THREE.MeshPhongMaterial( { color: 0xffffff } ) // side
    				];

    let that = this;
    const loader = new FontLoader();
    loader.load('./assets/helvetiker_regular.typeface.json', function ( response ) {
      that.font_ = response;
    });
  }

  UpdateText(content) {
    if (!this.font_) return;
    if (this.text_mesh_) {
      this.scene_.remove( this.text_mesh_ );
    }

    let text_geo = new TextGeometry( content, {
      font: this.font_,
      size: 0.05,
  		height: 0,
  		curveSegments: 1
    } );
    this.text_mesh_ = new THREE.Mesh( text_geo, this.materials_ );
    this.text_mesh_.position.set( 0.0, 1.0, -1.5 );
    this.scene_.add( this.text_mesh_ );
  };

};
