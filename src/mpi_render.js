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

// for render LR video : need to render different scene for different eyes
export class VideoLR {
  tag_ = '[VideoLR]';
  scene_ = null;

  // https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video.html
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas
  constructor(scene, x = 0.0, y = 2.0, z = -4.0, width = 4.0, height = 2.0) {
    self.scene_ = scene;
    console.log(this.tag_, "load videos");

    // <video id="video_lr" loop crossOrigin="anonymous" playsinline style="display:none" muted="muted">
    //   <source src="./assets/video/ip_man_LR_with_audio.mp4" type='video/mp4;'>
    // </video>

    var video_lr = document.createElement('video');
    video_lr.id = "video_lr";
    video_lr.src = './assets/video/ip_man_LR_with_audio.mp4';
    video_lr.type = "video/mp4";
    video_lr.muted = "muted";

    // var video_lr = document.getElementById('video_lr');
    video_lr.play();
    let texture = new THREE.VideoTexture(video_lr);

    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      map: texture
    });

    { // create left eye view
      const geometry = new THREE.PlaneGeometry(width, height);
      const nvs = geometry.attributes.uv.array;
      nvs[2] = 0.5;
      nvs[6] = 0.5;
      const mesh = new THREE.Mesh( geometry, material );
      mesh.position.set(x, y, z);
      mesh.layers.set( 1 );
      self.scene_.add(mesh);
    }
    { // create right eye view
      const geometry = new THREE.PlaneGeometry(width, height);
      const nvs = geometry.attributes.uv.array;
      nvs[0] = 0.5;
      nvs[4] = 0.5;
      const mesh = new THREE.Mesh( geometry, material );
      mesh.position.set(x, y, z);
      mesh.layers.set( 2 );
      self.scene_.add(mesh);
    }
  }
};

// for render a MPI video
// https://single-view-mpi.github.io/view.html?i=7
// * find a fast way to load MPI images (video or file)
// * render MPI images
