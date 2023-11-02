import * as THREE from 'three';
import {CreateWorker} from './gaussian_splatting/backend_work.js';
import * as SHADER from './gaussian_splatting/shader.js';

function RotateAndScale(rot_mats, scales, id, x, y, z, basic_scale = 2.0) {
  let id_3 = id * 3;
  let sx = scales[id_3] * basic_scale * x;
  let sy = scales[id_3 + 1] * basic_scale * y;
  let sz = scales[id_3 + 2] * basic_scale * z;
  let id_9 = id * 9;
  return [
    rot_mats[id_9 + 0] * sx + rot_mats[id_9 + 3] * sy + rot_mats[id_9 + 6] * sz,
    rot_mats[id_9 + 1] * sx + rot_mats[id_9 + 4] * sy + rot_mats[id_9 + 7] * sz,
    rot_mats[id_9 + 2] * sx + rot_mats[id_9 + 5] * sz + rot_mats[id_9 + 8] * sz
  ];
}

export class GaussianSplattingRender {
  tag_ = '[GaussianSplattingRender]';
  worker_ = null;

  scene_ = null;
  renderer_ = null;
  camera_ = null;

  constructor(scene, renderer, camera) {
    this.scene_ = scene;
    this.renderer_ = renderer;
    this.camera_ = camera;
    this.worker_ = new Worker(
      URL.createObjectURL(
        new Blob(["(", CreateWorker.toString(), ")(self)"], {
          type: "application/javascript",
        }),
      ),
    );

    let draw_points_only = true;
    this.worker_.onmessage = (e) => {
      if (e.data.buffer) {
        console.log(this.tag_, "[onmessage] receive buffer.");

        let view_matrix = this.camera_.matrixWorld;
        let projection_matrix = this.camera_.projectionMatrix.clone();
        const viewProj = projection_matrix.multiply(view_matrix);

        this.worker_.postMessage({ view: viewProj });

      } else {
        let { covA, covB, center, color, rot_mats, scales, viewProj } = e.data;

        if (draw_points_only) {
          // https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
          var geometry = new THREE.BufferGeometry();
          let material =  new THREE.RawShaderMaterial({
            uniforms: {},
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            fragmentShader: SHADER.fragmentShader(),
            vertexShader: SHADER.vertexShader()
          });

          geometry.setAttribute( 'position', new THREE.BufferAttribute( center, 3 ) );
          geometry.setAttribute( 'color', new THREE.BufferAttribute( color, 4 ) );
          // pointcloud.geometry.attributes.displacement.needsUpdate = true;

          var pointcloud = new THREE.Points(geometry, material);
          pointcloud.rotateX(Math.PI);
          this.scene_.add(pointcloud);
        } else {
          let num_pts = covA.length / 3;
          console.log(this.tag_, "process each point as a mesh", num_pts);

          // each point to 5 new points, 6 faces
          const positions = new Float32Array(num_pts * 3 * 5);
          const colors = new Float32Array(num_pts * 4 * 5);
          const covAs = new Float32Array(num_pts * 3 * 5);
          const covBs = new Float32Array(num_pts * 3 * 5);
          const offsets = new Float32Array(num_pts * 3 * 5);

          // const indices = new Int32Array(num_pts * 6 * 3);
          const indices = [];

          for (let i = 0; i < num_pts; i++) {
            let pt_id = i * 5;
            for (let k = 0; k < 5; k++) {
              for (let t = 0; t < 3; t++) {
                positions[(pt_id + k) * 3 + t] = center[3 * i + t];
                colors[(pt_id + k) * 4 + t] = color[4 * i + t];
                covAs[(pt_id + k) * 3 + t] = covA[3 * i + t];
                covBs[(pt_id + k) * 3 + t] = covB[3 * i + t];
              }
              colors[(pt_id + k) * 4 + 3] = color[4 * i + 3];
            }

            // add the offsets
            let tmp = RotateAndScale(rot_mats, scales, i, 0.0, -1.0, 0.0);
            offsets[pt_id * 3 + 0] = tmp[0];
            offsets[pt_id * 3 + 1] = tmp[1];
            offsets[pt_id * 3 + 2] = tmp[2];

            tmp = RotateAndScale(rot_mats, scales, i, 0.5, -0.5, 0.0);
            offsets[pt_id * 3 + 3] = tmp[0];
            offsets[pt_id * 3 + 4] = tmp[1];
            offsets[pt_id * 3 + 5] = tmp[2];

            tmp = RotateAndScale(rot_mats, scales, i, -0.5, 0.5, 0.0);
            offsets[pt_id * 3 + 6] = tmp[0];
            offsets[pt_id * 3 + 7] = tmp[1];
            offsets[pt_id * 3 + 8] = tmp[2];

            tmp = RotateAndScale(rot_mats, scales, i, 0.0, 0.0, 1.0);
            offsets[pt_id * 3 + 9] = tmp[0];
            offsets[pt_id * 3 + 10] = tmp[1];
            offsets[pt_id * 3 + 11] = tmp[2];

            tmp = RotateAndScale(rot_mats, scales, i, 0.0, 0.0, -1.0);
            offsets[pt_id * 3 + 12] = tmp[0];
            offsets[pt_id * 3 + 13] = tmp[1];
            offsets[pt_id * 3 + 14] = tmp[2];

            // each point 6 faces
            indices.push(pt_id + 0);
            indices.push(pt_id + 1);
            indices.push(pt_id + 3);

            indices.push(pt_id + 0);
            indices.push(pt_id + 4);
            indices.push(pt_id + 1);

            indices.push(pt_id + 1);
            indices.push(pt_id + 2);
            indices.push(pt_id + 3);

            indices.push(pt_id + 1);
            indices.push(pt_id + 4);
            indices.push(pt_id + 2);

            indices.push(pt_id + 2);
            indices.push(pt_id + 0);
            indices.push(pt_id + 3);

            indices.push(pt_id + 2);
            indices.push(pt_id + 4);
            indices.push(pt_id + 0);
          }

          var geometry = new THREE.BufferGeometry();
          geometry.setIndex( indices );
          geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
          geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 4 ) );
          geometry.setAttribute( 'covA', new THREE.BufferAttribute( covAs, 3 ) );
          geometry.setAttribute( 'covB', new THREE.BufferAttribute( covBs, 3 ) );
          geometry.setAttribute( 'offset_from_position', new THREE.BufferAttribute( offsets, 3 ) );

          const material =  new THREE.RawShaderMaterial({
            uniforms: {},

            // TODO: fix the blending
            // blending: THREE.CustomBlending,
            // blendEquation: THREE.AddEquation,
            // blendSrc: THREE.SrcAlphaFactor,
            // blendSrcAlpha: THREE.OneFactor,
            // blendDst: THREE.OneMinusSrcAlphaFactor,

            depthWrite: false,
            transparent: true,
            // wireframe: true,
            fragmentShader: SHADER.fragmentShaderGs3d(),
            vertexShader: SHADER.vertexShaderGs3d()
          });

          // https://github.com/antimatter15/splat/blob/main/main.js#L784
          // blendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha)
          // gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ONE);
          // blendEquationSeparate(modeRGB, modeAlpha)
          // gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);


          const mesh = new THREE.Mesh( geometry, material );
          mesh.rotateX(Math.PI);
          this.scene_.add(mesh);
        }


        console.log(this.tag_, "[onmessage] Pointcloud Loaded.");
      }
    };
    console.log(this.tag_, "worker initialize done.");
  }

  LoadPlyFromUrl(url) {
    // Load a file, set the bytes to firmware_byte_array
    console.log(this.tag_, 'load', url);
    var fileReader = new FileReader();
    fileReader.onload = (e) =>
    {
      this.worker_.postMessage({ ply: e.target.result });
    }

    // fetch the ply file
    fetch(url)
      .then(resp => resp.blob())
      .then(blob => fileReader.readAsArrayBuffer(blob));
  }
};
