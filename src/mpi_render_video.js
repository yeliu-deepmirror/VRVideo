import * as THREE from 'three';

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
    uniform sampler2D texture_rgba;
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

      gl_FragColor.rgb = texture2D(texture_rgba, uv_offset).rgb;
      // rgb in alpha images are the same, pick any one
      gl_FragColor.a = texture2D(texture_rgba, uv_offset_alpha).r;

      // bgr to rgb
      float x = gl_FragColor.x;
      gl_FragColor.x = gl_FragColor.z;
      gl_FragColor.z = x;
    }
`
}

export function get_camera_to_group(w2g, w2c) {
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
export class VideoMPI {
  tag_ = '[VideoMPI]';
  scene_ = null;
  camera_ = null;
  mesh_group_ = null;
  homo_scale_ = 0.2;

  depths_ = [];
  materials_left_ = [];
  materials_right_ = [];

  left_to_group_ = null;
  right_to_group_ = null;
  update(world_to_left, world_to_right) {
    // update material homography by camera
    let w2g = this.mesh_group_.matrixWorld.invert();
    let left_to_group = get_camera_to_group(w2g, world_to_left);
    this.left_to_group_ = left_to_group;
    let right_to_group = null;
    if (world_to_right != null) {
      this.right_to_group_ = right_to_group;
      right_to_group = get_camera_to_group(w2g, world_to_right);
    }

    for (let i = 0; i < this.materials_left_.length; i++) {
      let homography_left = this.compute_homograph(left_to_group, 1.0 / this.depths_[i]);
      this.materials_left_[i].uniforms.homographyMatrix.value = homography_left;
      if (right_to_group != null) {
        let homography_right = this.compute_homograph(right_to_group, 1.0 / this.depths_[i]);
        this.materials_right_[i].uniforms.homographyMatrix.value = homography_right;
      }
    }
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

    var video_lra = document.createElement('video');
    {
      video_lra.id = "video_lra";
      video_lra.src = './assets/video/mpi_video_h264.mp4';
      video_lra.type = "video/mp4";
      video_lra.muted = "muted";
      video_lra.loop = true;
      // video_lra.autoplay = false;
    }
    video_lra.play();

    let texture_lra = new THREE.VideoTexture(video_lra);
    texture_lra.colorSpace = THREE.SRGBColorSpace;

    let texture_scale = new THREE.Vector2( 1.0/8.0, 1.0/8.0 );
    let texture_scale_alpha = new THREE.Vector2( 1.0/8.0, 1.0/8.0 );

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
        let offset_alpha = new THREE.Vector2( i/8, j/8 );
        let offset_rgb = new THREE.Vector2( i/8, (j + 4)/8 );

        let uniforms = {
          texture_rgba: { type: "t", value: texture_lra },
          texture_origin: { type: "v2", value: offset_rgb },
          texture_scale_alpha: { type: "v2", value: texture_scale_alpha },
          texture_origin_alpha: { type: "v2", value: offset_alpha },
          texture_scale: { type: "v2", value: texture_scale },
          homographyMatrix: { type: "m3", value: homography }
        };

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
