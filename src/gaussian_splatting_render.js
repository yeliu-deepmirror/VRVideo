import * as THREE from 'three';
import {CreateWorker} from './gaussian_splatting/backend_work.js';

function vertexShader() {
  return `
    precision mediump float;
    precision mediump int;

    uniform mat4 modelViewMatrix; // optional
    uniform mat4 projectionMatrix; // optional

    attribute vec3 position;
    attribute vec4 rgba;


    varying vec4 vColor;

    void main() {
      vColor = rgba;

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `
}

function fragmentShader() {
return `
    precision mediump float;
    precision mediump int;

    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }
`
}

export async function loadPly(scene, camera, ply_path = './assets/pointcloud/jmw_night.ply') {
  let projectionMatrix = camera.projectionMatrix.clone();

  console.log(projectionMatrix);


  const worker = new Worker(
    URL.createObjectURL(
      new Blob(["(", CreateWorker.toString(), ")(self)"], {
        type: "application/javascript",
      }),
    ),
  );

  worker.onmessage = (e) => {
    if (e.data.buffer) {
      console.log("[onmessage] receive buffer.");

      let viewMatrix = camera.matrixWorld;
      const viewProj = projectionMatrix.multiply(viewMatrix);
      console.log(viewMatrix);

      worker.postMessage({ view: viewProj });

    } else {
      let { covA, covB, center, color, viewProj } = e.data;

      // https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
      var geometry = new THREE.BufferGeometry();
      let material =  new THREE.RawShaderMaterial({
        uniforms: {},
        fragmentShader: fragmentShader(),
        vertexShader: vertexShader()
      });

      geometry.setAttribute( 'position', new THREE.BufferAttribute( center, 3 ) );
      geometry.setAttribute( 'rgba', new THREE.BufferAttribute( color, 4 ) );
      // pointcloud.geometry.attributes.displacement.needsUpdate = true;

      var pointcloud = new THREE.Points(geometry, material);
      scene.add(pointcloud);
      console.log("[onmessage] Pointcloud Loaded.");
    }
  };

  // Load a file, set the bytes to firmware_byte_array
  console.log(ply_path)
  var fileReader = new FileReader();
  fileReader.onload = (e) =>
  {
    worker.postMessage({ ply: e.target.result });
  }

  // fetch the ply file
  fetch(ply_path)
    .then(resp => resp.blob())
    .then(blob => fileReader.readAsArrayBuffer(blob));
}
