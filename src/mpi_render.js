import * as THREE from 'three';

function vertexShaderMpi() {
  return `
    varying vec3 vUv;

    void main() {
      vUv = position;

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `
}

function fragmentShaderMpi() {
return `
    varying vec3 vUv;

    void main() {
      gl_FragColor = vec4(1.0, 1.0, vUv.z, 1.0);
    }
`
}

export class VideoMpi {
  tag_ = '[VideoMpi]';
  scene_ = null;

  constructor(scene) {
    self.scene_ = scene;
    console.log(this.tag_, "load videos");

    // https://single-view-mpi.github.io/view.html?i=7
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video.html
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas

    var video_l = document.getElementById('video_l');
    video_l.play();

    let texture = new THREE.VideoTexture(video_l);
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry(2, 1);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: texture
    });
    const mesh = new THREE.Mesh( geometry, material );
    mesh.position.set( 0.0, 2, -4 );
    mesh.layers.set( 1 );


    self.scene_.add(mesh);


  }


};

export function createMpiPlane() {
  // https://www.npmjs.com/package/opencv-bindings
  // const cv = require('opencv-bindings');
  // // set a timeout, it takes some time for opencv.js to load since it's just one massive file
  // setTimeout(() => {
  //     console.log(cv.getBuildInformation());
  // }, 1000);


  // https://stackoverflow.com/questions/55082573/use-webgl-texture-as-a-three-js-texture-map
  const geometry = new THREE.PlaneGeometry(2, 1);
  let material =  new THREE.ShaderMaterial({
    uniforms: {},
    fragmentShader: fragmentShaderMpi(),
    vertexShader: vertexShaderMpi(),
  });

  let mesh = new THREE.Mesh( geometry, material );
  mesh.position.set( 0.0, 2, -4 );
  return mesh;
}


// for render a MPI video
// * find a fast way to load MPI images (video or file)
// * render MPI images


// for render LR video : need to render different scene for different eyes
