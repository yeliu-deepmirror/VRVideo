import * as THREE from 'three';
import {CreateWorker} from './gaussian_splatting/backend_work.js';
import * as SHADER from './gaussian_splatting/shader.js';

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

    this.worker_.onmessage = (e) => {
      if (e.data.buffer) {
        console.log(this.tag_, "[onmessage] receive buffer.");

        let view_matrix = this.camera_.matrixWorld;
        let projection_matrix = this.camera_.projectionMatrix.clone();
        const viewProj = projection_matrix.multiply(view_matrix);

        this.worker_.postMessage({ view: viewProj });

      } else {
        let { covA, covB, center, color, viewProj } = e.data;

        // https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
        var geometry = new THREE.BufferGeometry();
        let material =  new THREE.RawShaderMaterial({
          uniforms: {},
          fragmentShader: SHADER.fragmentShader(),
          vertexShader: SHADER.vertexShader()
        });

        geometry.setAttribute( 'position', new THREE.BufferAttribute( center, 3 ) );
        geometry.setAttribute( 'rgba', new THREE.BufferAttribute( color, 4 ) );
        // pointcloud.geometry.attributes.displacement.needsUpdate = true;

        var pointcloud = new THREE.Points(geometry, material);
        this.scene_.add(pointcloud);
        console.log(this.tag_, "[onmessage] Pointcloud Loaded.");
      }
    };
    console.log(this.tag_, "worker initialize done.");

    // initialize gl things
    // https://github.com/antimatter15/splat/blob/main/main.js#L754
    const gl = this.renderer_.getContext();
  	const ext = gl.getExtension("ANGLE_instanced_arrays");

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  	gl.shaderSource(vertexShader, SHADER.vertexShaderGS());
  	gl.compileShader(vertexShader);
  	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
  		console.error(this.tag_, gl.getShaderInfoLog(vertexShader));

  	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  	gl.shaderSource(fragmentShader, SHADER.fragmentShaderGS());
  	gl.compileShader(fragmentShader);
  	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
  		console.error(this.tag_, gl.getShaderInfoLog(fragmentShader));

  	const program = gl.createProgram();
  	gl.attachShader(program, vertexShader);
  	gl.attachShader(program, fragmentShader);
  	gl.linkProgram(program);
  	gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
  		console.error(gl.getProgramInfoLog(program));

  	gl.disable(gl.DEPTH_TEST); // Disable depth testing

  	// Enable blending
  	// gl.enable(gl.BLEND);
    //
  	// // Set blending function
  	// gl.blendFuncSeparate(
  	// 	gl.ONE_MINUS_DST_ALPHA,
  	// 	gl.ONE,
  	// 	gl.ONE_MINUS_DST_ALPHA,
  	// 	gl.ONE,
  	// );
    //
    // // Set blending equation
  	// gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

  	// projection
  	const u_projection = gl.getUniformLocation(program, "projection");
    let projection_matrix = this.camera_.projectionMatrix.clone();
  	gl.uniformMatrix4fv(u_projection, false, projection_matrix.elements);

    // // viewport
  	// const u_viewport = gl.getUniformLocation(program, "viewport");
  	// gl.uniform2fv(u_viewport, new Float32Array([canvas.width, canvas.height]));
    //
  	// // focal
  	// const u_focal = gl.getUniformLocation(program, "focal");
  	// gl.uniform2fv(
  	// 	u_focal,
  	// 	new Float32Array([camera.fx / downsample, camera.fy / downsample]),
  	// );


    console.log(this.tag_, "webgl initialize done.");
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
