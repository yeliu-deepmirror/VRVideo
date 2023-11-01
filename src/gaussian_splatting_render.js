import * as THREE from 'three';

// https://github.com/antimatter15/splat/blob/main/main.js
function processPlyBuffer(inputBuffer) {
  const ubuf = new Uint8Array(inputBuffer);
  // 10KB ought to be enough for a header...
  const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
  const header_end = "end_header\n";
  const header_end_index = header.indexOf(header_end);
  if (header_end_index < 0)
    throw new Error("Unable to read .ply file header");
  const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
  console.log("Vertex Count", vertexCount);
  let row_offset = 0,
    offsets = {},
    types = {};
  const TYPE_MAP = {
    double: "getFloat64",
    int: "getInt32",
    uint: "getUint32",
    float: "getFloat32",
    short: "getInt16",
    ushort: "getUint16",
    uchar: "getUint8",
  };
  for (let prop of header
    .slice(0, header_end_index)
    .split("\n")
    .filter((k) => k.startsWith("property "))) {
    const [p, type, name] = prop.split(" ");
    const arrayType = TYPE_MAP[type] || "getInt8";
    types[name] = arrayType;
    offsets[name] = row_offset;
    row_offset += parseInt(arrayType.replace(/[^\d]/g, "")) / 8;
  }
  console.log("Bytes per row", row_offset, types, offsets);
  let dataView = new DataView(
    inputBuffer,
    header_end_index + header_end.length,
  );

  let row = 0;
  const attrs = new Proxy(
    {},
    {
      get(target, prop) {
        if (!types[prop]) throw new Error(prop + " not found");
        return dataView[types[prop]](
          row * row_offset + offsets[prop],
          true,
        );
      },
    },
  );

  console.time("calculate importance");
  let sizeList = new Float32Array(vertexCount);
  let sizeIndex = new Uint32Array(vertexCount);
  for (row = 0; row < vertexCount; row++) {
    sizeIndex[row] = row;
    if (!types["scale_0"]) continue;
    const size =
      Math.exp(attrs.scale_0) *
      Math.exp(attrs.scale_1) *
      Math.exp(attrs.scale_2);
    const opacity = 1 / (1 + Math.exp(-attrs.opacity));
    sizeList[row] = size * opacity;
  }
  console.timeEnd("calculate importance");

  console.time("sort");
  sizeIndex.sort((b, a) => sizeList[a] - sizeList[b]);
  console.timeEnd("sort");

  // 6*4 + 4 + 4 = 8*4
  // XYZ - Position (Float32)
  // XYZ - Scale (Float32)
  // RGBA - colors (uint8)
  // IJKL - quaternion/rot (uint8)
  const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
  const buffer = new ArrayBuffer(rowLength * vertexCount);

  console.time("build buffer");
  for (let j = 0; j < vertexCount; j++) {
    row = sizeIndex[j];

    const position = new Float32Array(buffer, j * rowLength, 3);
    const scales = new Float32Array(buffer, j * rowLength + 4 * 3, 3);
    const rgba = new Uint8ClampedArray(
      buffer,
      j * rowLength + 4 * 3 + 4 * 3,
      4,
    );
    const rot = new Uint8ClampedArray(
      buffer,
      j * rowLength + 4 * 3 + 4 * 3 + 4,
      4,
    );

    if (types["scale_0"]) {
      const qlen = Math.sqrt(
        attrs.rot_0 ** 2 +
          attrs.rot_1 ** 2 +
          attrs.rot_2 ** 2 +
          attrs.rot_3 ** 2,
      );

      rot[0] = (attrs.rot_0 / qlen) * 128 + 128;
      rot[1] = (attrs.rot_1 / qlen) * 128 + 128;
      rot[2] = (attrs.rot_2 / qlen) * 128 + 128;
      rot[3] = (attrs.rot_3 / qlen) * 128 + 128;

      scales[0] = Math.exp(attrs.scale_0);
      scales[1] = Math.exp(attrs.scale_1);
      scales[2] = Math.exp(attrs.scale_2);
    } else {
      scales[0] = 0.01;
      scales[1] = 0.01;
      scales[2] = 0.01;

      rot[0] = 255;
      rot[1] = 0;
      rot[2] = 0;
      rot[3] = 0;
    }

    position[0] = attrs.x;
    position[1] = attrs.y;
    position[2] = attrs.z;

    if (types["f_dc_0"]) {
      const SH_C0 = 0.28209479177387814;
      rgba[0] = (0.5 + SH_C0 * attrs.f_dc_0) * 255;
      rgba[1] = (0.5 + SH_C0 * attrs.f_dc_1) * 255;
      rgba[2] = (0.5 + SH_C0 * attrs.f_dc_2) * 255;
    } else {
      rgba[0] = attrs.red;
      rgba[1] = attrs.green;
      rgba[2] = attrs.blue;
    }
    if (types["opacity"]) {
      rgba[3] = (1 / (1 + Math.exp(-attrs.opacity))) * 255;
    } else {
      rgba[3] = 255;
    }
  }
  console.timeEnd("build buffer");
  return buffer;
}


function vertexShader() {
  return `
    precision mediump float;
    precision mediump int;

    uniform mat4 modelViewMatrix; // optional
    uniform mat4 projectionMatrix; // optional

    attribute vec3 position;
    attribute vec4 color;


    varying vec4 vColor;

    void main() {
      vColor = color;

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

function addPointcloudWithThreejs(scene, buffer) {
  const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
  var vertexCount = Math.floor(buffer.byteLength / rowLength);
  var scale = 1.0;

  var positions = new Float32Array(vertexCount * 3);
  var colors = new Float32Array(vertexCount * 4);
  for (let j = 0; j < vertexCount; j++) {
    const position = new Float32Array(buffer, j * rowLength, 3);
    const rgba = new Uint8ClampedArray(
      buffer,
      j * rowLength + 4 * 3 + 4 * 3,
      4,
    );
    positions[j * 3 + 0] = position[0]*scale;
    positions[j * 3 + 1] = position[2]*scale;
    positions[j * 3 + 2] = position[1]*scale;
    colors[j * 4 + 0] = rgba[0] / 255;
    colors[j * 4 + 1] = rgba[1] / 255;
    colors[j * 4 + 2] = rgba[2] / 255;
    colors[j * 4 + 3] = rgba[3] / 255;
  }

  // https://betterprogramming.pub/point-clouds-visualization-with-three-js-5ef2a5e24587
  var geometry = new THREE.BufferGeometry();
  let material =  new THREE.RawShaderMaterial({
    uniforms: {},
    fragmentShader: fragmentShader(),
    vertexShader: vertexShader(),
    side: THREE.DoubleSide,
    transparent: true
  })

  geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
  geometry.setAttribute( 'color', new THREE.BufferAttribute( colors, 4 ) );
  // pointcloud.geometry.attributes.displacement.needsUpdate = true;

  var pointcloud = new THREE.Points(geometry, material);
  pointcloud.rotateX(Math.PI / 2);
  scene.add(pointcloud);
  console.log("Loaded.")
}

export async function loadPly(scene, ply_path = './assets/pointcloud/jmw_night.ply') {
  // Load a file, set the bytes to firmware_byte_array
  console.log(ply_path)
  var fileReader = new FileReader();
  fileReader.onload = (e) =>
  {
    var buffer = processPlyBuffer(e.target.result);
    addPointcloudWithThreejs(scene, buffer);
  }

  // fetch the ply file
  fetch(ply_path)
    .then(resp => resp.blob())
    .then(blob => fileReader.readAsArrayBuffer(blob));
}
