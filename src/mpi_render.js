import * as THREE from 'three';

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

export function createMpiPlane() {
  // https://www.npmjs.com/package/opencv-bindings
  // const cv = require('opencv-bindings');
  // // set a timeout, it takes some time for opencv.js to load since it's just one massive file
  // setTimeout(() => {
  //     console.log(cv.getBuildInformation());
  // }, 1000);

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
