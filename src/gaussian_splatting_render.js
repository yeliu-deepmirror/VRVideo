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

export class GaussianSplattingRender {
  tag_ = '[GaussianSplattingRender]';
  worker_ = null;

  scene_ = null;
  render_ = null;
  camera_ = null;

  constructor(scene, render, camera) {
    this.scene_ = scene;
    this.render_ = render;
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
          fragmentShader: fragmentShader(),
          vertexShader: vertexShader()
        });

        geometry.setAttribute( 'position', new THREE.BufferAttribute( center, 3 ) );
        geometry.setAttribute( 'rgba', new THREE.BufferAttribute( color, 4 ) );
        // pointcloud.geometry.attributes.displacement.needsUpdate = true;

        var pointcloud = new THREE.Points(geometry, material);
        this.scene_.add(pointcloud);
        console.log(this.tag_, "[onmessage] Pointcloud Loaded.");
      }
    };
    console.log(this.tag_, "initialize done.");
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
