import * as THREE from 'three';
import { TimingObject } from 'timing-object';
import { setTimingsrc } from 'timingsrc';


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


function vertexShaderMpiLayers() {
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

function fragmentShaderMpiLayers() {
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

      gl_FragColor.rgb = texture2D(texture_rgbs, uv_offset).rgb;
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
export class ImageLayersMPI {
  tag_ = '[ImageLayersMPI]';
  scene_ = null;

  constructor(scene, x = 0.0, y = 2.0, z = -2.0, width = 1.0, height = 0.5) {
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
        let depth_offset = 2.0 / (layer_id + 1);

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
          fragmentShader: fragmentShaderMpiLayers(),
          vertexShader: vertexShaderMpiLayers()
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

function vertexShaderMpi() {
  return `
    precision mediump float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 homographyMatrix;

    attribute vec3 position;
    attribute vec2 uv;

    varying vec2 vUv;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      vec3 coord = homographyMatrix * vec3(uv.x, 1.0 - uv.y, 1.0);
      vUv = vec2(coord.x, 1.0 - coord.y);
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
    uniform vec2 texture_origin_alpha;
    uniform vec2 texture_scale_alpha;

    void main() {
      // check if the pixel outside the block
      if (vUv.x < 0.0) discard;
      if (vUv.y < 0.0) discard;
      if (vUv.x > 1.0) discard;
      if (vUv.y > 1.0) discard;

      // process to get correct texture value
      vec2 uv_offset = vec2(
          vUv.x * texture_scale.x + texture_origin.x,
          vUv.y * texture_scale.y + texture_origin.y);
      vec2 uv_offset_alpha = vec2(
          vUv.x * texture_scale_alpha.x + texture_origin_alpha.x,
          vUv.y * texture_scale_alpha.y + texture_origin_alpha.y);

      gl_FragColor.rgb = texture2D(texture_rgbs, uv_offset).rgb;
      // rgb in alpha images are the same, pick any one
      gl_FragColor.a = texture2D(texture_alphas, uv_offset_alpha).r;

      // bgr to rgb
      float x = gl_FragColor.x;
      gl_FragColor.x = gl_FragColor.z;
      gl_FragColor.z = x;
    }
`
}

function get_camera_to_group(w2g, w2c) {
  let camera_pose = w2c.invert();
  let cam_x = camera_pose.elements[12];
  let cam_y = camera_pose.elements[13];
  let cam_z = camera_pose.elements[14];

  let x = w2g.elements[0] * cam_x + w2g.elements[4] * cam_y + w2g.elements[8] * cam_z + w2g.elements[12];
  let y = w2g.elements[1] * cam_x + w2g.elements[5] * cam_y + w2g.elements[9] * cam_z + w2g.elements[13];
  let z = w2g.elements[2] * cam_x + w2g.elements[6] * cam_y + w2g.elements[10] * cam_z + w2g.elements[14];
  return new THREE.Vector3(x, y, z);
}

// render MPI for different cameras
export class ImageMPI {
  tag_ = '[ImageMPI]';
  scene_ = null;
  camera_ = null;
  mesh_group_ = null;
  homo_scale_ = 0.2;

  videos_ = [];
  depths_ = [];
  materials_left_ = [];
  materials_right_ = [];

  update(world_to_left, world_to_right) {
    // update material homography by camera
    let left_to_group = get_camera_to_group(this.mesh_group_.matrixWorld, world_to_left);
    let right_to_group = null;
    if (world_to_right != null) {
      right_to_group = get_camera_to_group(this.mesh_group_.matrixWorld, world_to_right);
    }

    for (let i = 0; i < this.materials_left_.length; i++) {
      let homography_left = this.compute_homograph(left_to_group, 1.0 / this.depths_[i]);
      this.materials_left_[i].uniforms.homographyMatrix.value = homography_left;
      if (right_to_group != null) {
        let homography_right = this.compute_homograph(right_to_group, 1.0 / this.depths_[i]);
        this.materials_right_[i].uniforms.homographyMatrix.value = homography_right;
      }
    }

    console.log(this.tag_, this.videos_[0].currentTime, this.videos_[1].currentTime, this.videos_[2].currentTime);
  }

  set_video(video) {
    video.type = "video/mp4";
    video.muted = "muted";
    video.loop = true;
    video.autoplay = false;
  }

  compute_homograph(camera_to_group, depth_inv) {
    let px = this.homo_scale_ * camera_to_group.x;
    let py = this.homo_scale_ * camera_to_group.y;
    let pz = this.homo_scale_ * camera_to_group.z;
    let nx = 0;
    let ny = 0;
    let nz = 1;

    let homography = new THREE.Matrix3();
    homography.set(
      1 + depth_inv * px * nx, depth_inv * px * ny, depth_inv * px * nz,
      depth_inv * py * nx, 1 + depth_inv * py * ny, depth_inv * py * nz,
      depth_inv * pz * nx, depth_inv * pz * ny, 1 + depth_inv * pz * nz);
    return homography;
  }

  constructor(scene, camera, x = 0.0, y = 1.2, z = -2.0, width = 1.0, height = 0.5) {
    this.scene_ = scene;
    this.camera_ = camera;
    this.mesh_group_ = new THREE.Group();
    this.mesh_group_.position.set(x, y, z);
    console.log(this.tag_, "load MPI image");

    var video_l = document.createElement('video');
    {
      video_l.id = "video_l";
      video_l.src = './assets/video/cv_mpi_rgb_l_h264.mp4';
      this.set_video(video_l);
    }
    var video_r = document.createElement('video');
    {
      video_r.id = "video_r";
      video_r.src = './assets/video/cv_mpi_rgb_r_h264.mp4';
      this.set_video(video_r);
    }
    var video_a = document.createElement('video');
    {
      video_a.id = "video_a";
      video_a.src = './assets/video/cv_mpi_alpha_h264.mp4';
      this.set_video(video_a);
    }
    video_l.play();
    video_r.play();
    video_a.play();
    this.videos_ = [video_a, video_l, video_r];

    // https://github.com/chrisguttandin/video-synchronization-demo/blob/master/src/scripts/app.js
    const timingObject = new TimingObject();
    timingObject.addEventListener('readystatechange', () => {
        if (timingObject.readyState === 'open') {
            timingObject.update({ position: 0, velocity: 1 });
            setTimingsrc(video_l, timingObject);
            setTimingsrc(video_r, timingObject);
            setTimingsrc(video_a, timingObject);
        }
    });


    let texture_l = new THREE.VideoTexture(video_l);
    let texture_r = new THREE.VideoTexture(video_r);
    let texture_alphas = new THREE.VideoTexture(video_a);
    texture_l.colorSpace = THREE.SRGBColorSpace;
    texture_r.colorSpace = THREE.SRGBColorSpace;
    texture_alphas.colorSpace = THREE.SRGBColorSpace;

    // const texture_rgbs = new THREE.TextureLoader().load('./assets/images/mpi/rgbs.jpg' );
    // const texture_alphas = new THREE.TextureLoader().load('./assets/images/mpi/alphas.jpg' );

    let texture_scale = new THREE.Vector2( 1.0/4.0, 1.0/4.0 );
    let texture_scale_alpha = new THREE.Vector2( 1.0/8.0, 1.0/4.0 );

    let homography = new THREE.Matrix3();
    homography.set(1, 0, 0, 0, 1, 0, 0, 0, 1 );  // set in row-major, while saved in col-major

    let cnt = 0;

    const front_disparity = 1.0;
    const back_disparity = 1.0 / 100.0;
    const interval = (front_disparity - back_disparity) / 32;

    // add to scene from far to close, to let it render in this order
    for (let i = 0; i < 8; i++) {
      for (let j = 3; j >= 0; j--) {
        // add very small offset to keep the layers separate (while not visible)
        let layer_id = i + 8 * (3 - j);
        let depth_offset = -0.001 * layer_id;
        let depth = 1.0 / (back_disparity + layer_id * interval);
        this.depths_.push(depth)

        // far to close
        let offset_alpha = new THREE.Vector2( i/8, j/4 );
        let offset;
        if (i < 4) {
          offset = new THREE.Vector2( i/4, j/4 );
        } else {
          offset = new THREE.Vector2( (i - 4)/4, j/4 );
        }

        let uniforms = {
          texture_alphas: { type: "t", value: texture_alphas },
          texture_origin: { type: "v2", value: offset },
          texture_scale_alpha: { type: "v2", value: texture_scale_alpha },
          texture_origin_alpha: { type: "v2", value: offset_alpha },
          texture_scale: { type: "v2", value: texture_scale },
          homographyMatrix: { type: "m3", value: homography }
        };

        if (i < 4) {
          uniforms.texture_rgbs = { type: "t", value: texture_l };
        } else {
          uniforms.texture_rgbs = { type: "t", value: texture_r };
        }

        {   // add left eye
          let material_mpi = new THREE.RawShaderMaterial({
            uniforms: uniforms,
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

          this.materials_left_.push(material_mpi);
          const geometry = new THREE.PlaneGeometry(width, height);
          const mesh = new THREE.Mesh( geometry, material_mpi );
          mesh.layers.set( 1 );
          mesh.position.set(0, 0, 0 - depth_offset);
          this.mesh_group_.add(mesh);
        }
        {   // add right eye
          let material_mpi = new THREE.RawShaderMaterial({
            uniforms: uniforms,
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

          this.materials_right_.push(material_mpi);
          const geometry = new THREE.PlaneGeometry(width, height);
          const mesh = new THREE.Mesh( geometry, material_mpi );
          mesh.layers.set( 2 );
          mesh.position.set(0, 0, 0 - depth_offset);
          this.mesh_group_.add(mesh);
        }
        cnt++;
      }
    }
    this.scene_.add(this.mesh_group_);
    console.log(this.tag_, "loaded MPI image", cnt);
  }
};
