import * as THREE from 'three';


function vertexShader() {
  return `
    varying vec3 vUv;

    void main() {
      vUv = position;

      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }
  `
}

function fragmentShader() {
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
    fragmentShader: fragmentShader(),
    vertexShader: vertexShader(),
  })

  let mesh = new THREE.Mesh(geometry, material)
  return mesh;
}
