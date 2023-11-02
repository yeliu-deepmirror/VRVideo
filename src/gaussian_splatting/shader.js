
export function vertexShader() {
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

      // gl_PointSize = 10.0;
      gl_PointSize = 0.2 * ( 300.0 / -modelViewPosition.z );
    }
  `
}

export function fragmentShader() {
return `
    precision mediump float;
    precision mediump int;

    varying vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }
`
}

export function vertexShaderGs3d() {
return `
  precision mediump float;

  uniform mat4 modelViewMatrix; // optional
  uniform mat4 projectionMatrix; // optional

  attribute vec3 position;
  attribute vec4 color;

  attribute vec3 offset_from_position;
  attribute vec3 covA;
  attribute vec3 covB;

  varying vec4 vColor;

  void main () {
    vec4 modelViewPosition = modelViewMatrix * vec4(position + offset_from_position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;

    mat3 covariance = mat3(
        covA.x, covA.y, covA.z,
        covA.y, covB.x, covB.y,
        covA.z, covB.y, covB.z
    );
    float A = -dot(offset_from_position, covariance * offset_from_position);
    float B = exp(A) * color.a;
    vColor = vec4(B * color.rgb, B);
  }
`;
};

export function fragmentShaderGs3d() {
return `
  precision mediump float;
  varying vec4 vColor;
  void main () {
    gl_FragColor = vColor;
  }
`;
};

export function vertexShaderGs2d() {
return `
  precision mediump float;
  attribute vec2 position;

  attribute vec4 color;
  attribute vec3 center;
  attribute vec3 covA;
  attribute vec3 covB;

  uniform mat4 projection, view;
  uniform vec2 focal;
  uniform vec2 viewport;

  varying vec4 vColor;
  varying vec2 vPosition;

  mat3 transpose(mat3 m) {
    return mat3(
        m[0][0], m[1][0], m[2][0],
        m[0][1], m[1][1], m[2][1],
        m[0][2], m[1][2], m[2][2]
    );
  }

  void main () {
    vec4 camspace = view * vec4(center, 1);
    vec4 pos2d = projection * camspace;

    float bounds = 1.2 * pos2d.w;
    if (pos2d.z < -pos2d.w || pos2d.x < -bounds || pos2d.x > bounds
		 || pos2d.y < -bounds || pos2d.y > bounds) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    mat3 Vrk = mat3(
        covA.x, covA.y, covA.z,
        covA.y, covB.x, covB.y,
        covA.z, covB.y, covB.z
    );

    mat3 J = mat3(
        focal.x / camspace.z, 0., -(focal.x * camspace.x) / (camspace.z * camspace.z),
        0., -focal.y / camspace.z, (focal.y * camspace.y) / (camspace.z * camspace.z),
        0., 0., 0.
    );

    mat3 W = transpose(mat3(view));
    mat3 T = W * J;
    mat3 cov = transpose(T) * Vrk * T;

    vec2 vCenter = vec2(pos2d) / pos2d.w;

    float diagonal1 = cov[0][0] + 0.3;
    float offDiagonal = cov[0][1];
    float diagonal2 = cov[1][1] + 0.3;

	float mid = 0.5 * (diagonal1 + diagonal2);
	float radius = length(vec2((diagonal1 - diagonal2) / 2.0, offDiagonal));
	float lambda1 = mid + radius;
	float lambda2 = max(mid - radius, 0.1);
	vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));
	vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
	vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);


    vColor = color;
    vPosition = position;

    gl_Position = vec4(
        vCenter
            + position.x * v1 / viewport * 2.0
            + position.y * v2 / viewport * 2.0, 0.0, 1.0);

  }
`;
};

export function fragmentShaderGs2d() {
return `
precision mediump float;

  varying vec4 vColor;
  varying vec2 vPosition;

  void main () {
	  float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    gl_FragColor = vec4(B * vColor.rgb, B);
  }
`;
};
