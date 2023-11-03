import * as THREE from 'three';


// for render LR video : need to render different scene for different eyes
export class VideoLR {
  tag_ = '[VideoLR]';
  scene_ = null;

  // https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_video.html
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas
  constructor(scene, x = 0.0, y = 4.0, z = -4.0, width = 4.0, height = 2.0) {
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


function vertexShaderMpi() {
  return `
    precision mediump float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;

    attribute vec3 position;
    attribute vec2 uv;

    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
}

function fragmentShaderMpi() {
  return `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D texture_rgbs;
    uniform sampler2D texture_alphas;
    uniform vec2 texture_origin;
    uniform vec2 texture_scale;

    void main() {
      vec2 uv_offset = vec2(
          vUv.x * texture_scale.x + texture_origin.x,
          vUv.y * texture_scale.y + texture_origin.y);

      gl_FragColor = texture2D(texture_rgbs, uv_offset);
      // rgb in alpha images are the same, pick any one
      gl_FragColor.a = texture2D(texture_alphas, uv_offset).r;

      // bgr to rgb
      float x = gl_FragColor.x;
      gl_FragColor.x = gl_FragColor.z;
      gl_FragColor.z = x;

      // gl_FragColor = vec4(1, vUv.x, vUv.y, 1);
    }
`
}


const front_disparity = 1.0 / 1.0;
const back_disparity = 1.0 / 100.0;
const interval = (front_disparity - back_disparity) / 32;
function ComputeMpiDepth(layer_id) {
  return 1.0 / (back_disparity + layer_id * interval);
}

// for render a MPI video
// https://single-view-mpi.github.io/view.html?i=7
// * find a fast way to load MPI images (video or file)
// * render MPI images
export class ImageMPI {
  tag_ = '[ImageMPI]';
  scene_ = null;

  constructor(scene, x = 0.0, y = 1.6, z = -2.0, width = 1.0, height = 0.5) {
    self.scene_ = scene;
    // console.log(this.tag_, "load MPI image");

    const texture_rgbs = new THREE.TextureLoader().load('./assets/images/mpi/rgbs.jpg' );
    const texture_alphas = new THREE.TextureLoader().load('./assets/images/mpi/alphas.jpg' );

    let texture_scale = new THREE.Vector2( 1.0/8.0, 1.0/4.0 );

    let cnt = 0;
    // add to scene from far to close, to let it render in this order
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j >= 0; j--) {
        let layer_id = i + 8 * (3 - j);
        let depth_offset = 1.0 / (layer_id + 1);

        // far to close
        let offset = new THREE.Vector2( i/8, j/4 );

        // blend of gl
        // glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        let material_mpi = new THREE.RawShaderMaterial({
          uniforms: {
            texture_rgbs: { type: "t", value: texture_rgbs },
            texture_alphas: { type: "t", value: texture_alphas },
            texture_origin: { type: "v2", value: offset },
            texture_scale: { type: "v2", value: texture_scale },
          },
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendSrcAlpha: THREE.OneFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
          blendDstAlpha: THREE.OneFactor,
          transparent: true,
          depthWrite: true,
          fragmentShader: fragmentShaderMpi(),
          vertexShader: vertexShaderMpi()
        });

        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh( geometry, material_mpi );
        mesh.position.set(x, y, z - depth_offset);
        self.scene_.add(mesh);
        cnt++;
      }
    }
    console.log(this.tag_, "load MPI image", cnt);
  }
};
