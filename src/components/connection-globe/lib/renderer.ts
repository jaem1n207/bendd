import { COLOR_CYCLE_MS } from '@/components/connection-globe/consts/playback';
import {
  GLOBE_RADIUS,
  type GlobeScene,
  type Vector,
} from '@/components/connection-globe/lib/geometry';
import { createLandParticles } from '@/components/connection-globe/lib/particles';

export type Color = [number, number, number];
export interface GlobePalette {
  base: Color;
  rim: Color;
  land: Color[];
  route: Color[];
}

// Shared by points and ribbons, matching geometry.project exactly.
const projection = `
uniform vec2 uSize;
uniform vec2 uAngles;
uniform float uScale;
vec3 view(vec3 p) {
  float cy=cos(uAngles.x), sy=sin(uAngles.x), cx=cos(uAngles.y), sx=sin(uAngles.y);
  return vec3(cy*p.x+sy*p.z, sy*sx*p.x+cx*p.y-cy*sx*p.z, -sy*cx*p.x+sx*p.y+cy*cx*p.z);
}
vec2 clip(vec3 p) { return p.xy*uScale*${GLOBE_RADIUS}*vec2(uSize.y/uSize.x,1.); }
`;
const occlusion = `
varying vec3 vView;
void occlude() {
  float r=dot(vView.xy,vView.xy);
  if(r<1. && vView.z < sqrt(1.-r)-.008) discard;
}
`;
const sphereVertex = `attribute vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const sphereFragment = `
precision highp float;
uniform vec2 uSize;
uniform float uScale;
uniform vec3 uBase, uRim;
void main(){
  vec2 p=(gl_FragCoord.xy*2.-uSize)/uSize.y/(uScale*${GLOBE_RADIUS});
  float r=length(p), edge=2.5/uSize.y/(uScale*${GLOBE_RADIUS});
  if(r>1.+edge) discard;
  float z=sqrt(max(0.,1.-r*r));
  vec3 color=mix(uRim,uBase,pow(z,.55));
  gl_FragColor=vec4(color,1.-smoothstep(1.-edge,1.+edge,r));
}`;
const particleVertex = `
attribute vec3 aPosition;
attribute float aRegion, aSeed;
uniform float uFormation, uPixelRatio, uPointSize;
uniform vec3 uLand[7];
varying vec3 vView, vColor;
${projection}
void main(){
  float p=clamp((uFormation-aSeed*.1)/(1.-aSeed*.1),0.,1.);
  float spin=(1.-p)*(aSeed-.5)*4.;
  vec3 pos=vec3(cos(spin)*aPosition.x+sin(spin)*aPosition.z,aPosition.y,-sin(spin)*aPosition.x+cos(spin)*aPosition.z);
  float tilt=(1.-p)*sin(aSeed*71.)*1.4;
  pos=vec3(pos.x,cos(tilt)*pos.y-sin(tilt)*pos.z,sin(tilt)*pos.y+cos(tilt)*pos.z);
  pos*=1.+(1.-p)*(.25+aSeed*.85);
  vView=view(pos);
  vColor=aRegion<.5?uLand[0]:aRegion<1.5?uLand[1]:aRegion<2.5?uLand[2]:aRegion<3.5?uLand[3]:aRegion<4.5?uLand[4]:aRegion<5.5?uLand[5]:uLand[6];
  gl_Position=vec4(clip(vView),0.,1.);
  gl_PointSize=uPointSize*uPixelRatio*pow(uScale,.45)*mix(.85,1.,p);
}`;
const particleFragment = `
precision highp float;
varying vec3 vColor;
${occlusion}
void main(){
  occlude();
  float d=length(gl_PointCoord-.5)*2.;
  float alpha=(1.-smoothstep(.55,1.,d))*(.67+.33*clamp(vView.z,0.,1.));
  gl_FragColor=vec4(vColor,alpha);
}`;
const routeVertex = `
attribute vec3 aPosition, aPrevious, aNext;
attribute vec2 aPath;
uniform float uWidth;
varying vec3 vView;
varying float vProgress, vSide;
${projection}
void main(){
  vView=view(aPosition);
  vec2 tangent=(clip(view(aNext))-clip(view(aPrevious)))*uSize;
  tangent=normalize(tangent+vec2(.00001,0.));
  vec2 normal=vec2(-tangent.y,tangent.x);
  gl_Position=vec4(clip(vView)+normal*aPath.x*uWidth/uSize,0.,1.);
  vProgress=aPath.y;
  vSide=aPath.x;
}`;
const routeFragment = `
precision highp float;
uniform float uProgress, uColorTime;
uniform vec3 uRoute[3];
varying float vProgress, vSide;
${occlusion}
void main(){
  if(vProgress>uProgress) discard;
  occlude();
  float phase=fract(vProgress*.68-uColorTime)*3.;
  float blend=smoothstep(0.,1.,fract(phase));
  vec3 color=phase<1.?mix(uRoute[0],uRoute[1],blend):phase<2.?mix(uRoute[1],uRoute[2],blend):mix(uRoute[2],uRoute[0],blend);
  float alpha=1.-smoothstep(.5,1.,abs(vSide));
  gl_FragColor=vec4(color,alpha);
}`;

function createProgram(
  gl: WebGLRenderingContext,
  vertex: string,
  fragment: string
) {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Unable to allocate globe shader');
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Globe shader: ${log}`);
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  let fs: WebGLShader;
  try {
    fs = compile(gl.FRAGMENT_SHADER, fragment);
  } catch (error) {
    gl.deleteShader(vs);
    throw error;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error('Unable to allocate globe program');
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Globe program: ${log}`);
  }
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  return {
    program,
    uniform(name: string) {
      if (!uniforms.has(name)) {
        uniforms.set(name, gl.getUniformLocation(program, name));
      }
      return uniforms.get(name) ?? null;
    },
  };
}

function routeBuffer(routes: Vector[][]) {
  const values: number[] = [];
  const ranges: { first: number; count: number }[] = [];
  for (const points of routes) {
    const first = values.length / 11;
    points.forEach((point, index) => {
      const previous = points[Math.max(0, index - 1)];
      const next = points[Math.min(points.length - 1, index + 1)];
      for (const side of [-1, 1]) {
        values.push(
          point.x,
          point.y,
          point.z,
          previous.x,
          previous.y,
          previous.z,
          next.x,
          next.y,
          next.z,
          side,
          index / (points.length - 1)
        );
      }
    });
    ranges.push({ first, count: values.length / 11 - first });
  }
  return { data: new Float32Array(values), ranges };
}

export async function createParticleGlobe(
  canvas: HTMLCanvasElement,
  width: number,
  signal: AbortSignal
) {
  const response = await fetch('/globe/land-mask.png', { signal });
  if (!response.ok) {
    throw new Error('Globe land mask unavailable');
  }
  const bitmap = await createImageBitmap(await response.blob());
  const mask = document.createElement('canvas');
  mask.width = bitmap.width;
  mask.height = bitmap.height;
  const context = mask.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error('Globe map decoder unavailable');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const particles = createLandParticles(
    context.getImageData(0, 0, mask.width, mask.height),
    width < 500 ? 12000 : 22000
  );
  signal.throwIfAborted();
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) {
    throw new Error('WebGL unavailable');
  }
  const programs: ReturnType<typeof createProgram>[] = [];
  const buffers: WebGLBuffer[] = [];
  const destroy = () => {
    programs.forEach(item => gl.deleteProgram(item.program));
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
  };
  try {
    const program = (vs: string, fs: string) => {
      const value = createProgram(gl, vs, fs);
      programs.push(value);
      return value;
    };
    const sphere = program(sphereVertex, sphereFragment);
    const points = program(particleVertex, particleFragment);
    const arc = program(routeVertex, routeFragment);
    const buffer = (data: Float32Array) => {
      const value = gl.createBuffer();
      if (!value) {
        throw new Error('Unable to allocate globe buffer');
      }
      buffers.push(value);
      gl.bindBuffer(gl.ARRAY_BUFFER, value);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return value;
    };
    const quad = buffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    const dots = buffer(particles);
    const ribbon = buffer(new Float32Array());
    let previousRoutes: Vector[][] | undefined;
    let ranges: { first: number; count: number }[] = [];
    const bind = (
      program: WebGLProgram,
      name: string,
      count: number,
      stride: number,
      offset: number
    ) => {
      const attribute = gl.getAttribLocation(program, name);
      if (attribute < 0) {
        return;
      }
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(
        attribute,
        count,
        gl.FLOAT,
        false,
        stride * 4,
        offset * 4
      );
    };
    canvas.dataset.landPoints = String(particles.length / 5);
    canvas.dataset.renderer = 'particles-3d';
    return {
      destroy,
      render(
        scene: GlobeScene,
        palette: GlobePalette,
        colorTime: number,
        width: number,
        height: number
      ) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.round(width * dpr),
          pixelHeight = Math.round(height * dpr);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        gl.viewport(0, 0, pixelWidth, pixelHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
          gl.SRC_ALPHA,
          gl.ONE_MINUS_SRC_ALPHA,
          gl.ONE,
          gl.ONE_MINUS_SRC_ALPHA
        );
        const activateProgram = (program: ReturnType<typeof createProgram>) => {
          for (let index = 0; index < 4; index++) {
            gl.disableVertexAttribArray(index);
          }
          gl.useProgram(program.program);
          gl.uniform2f(program.uniform('uSize'), pixelWidth, pixelHeight);
          gl.uniform1f(program.uniform('uScale'), scene.camera.scale);
          gl.uniform2f(
            program.uniform('uAngles'),
            scene.camera.phi,
            scene.camera.theta
          );
        };
        activateProgram(sphere);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        bind(sphere.program, 'aPosition', 2, 2, 0);
        gl.uniform3fv(sphere.uniform('uBase'), palette.base);
        gl.uniform3fv(sphere.uniform('uRim'), palette.rim);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        activateProgram(points);
        gl.bindBuffer(gl.ARRAY_BUFFER, dots);
        bind(points.program, 'aPosition', 3, 5, 0);
        bind(points.program, 'aRegion', 1, 5, 3);
        bind(points.program, 'aSeed', 1, 5, 4);
        gl.uniform1f(points.uniform('uFormation'), scene.formationProgress);
        gl.uniform1f(points.uniform('uPixelRatio'), dpr);
        gl.uniform1f(points.uniform('uPointSize'), 2.5);
        gl.uniform3fv(points.uniform('uLand[0]'), palette.land.flat());
        gl.drawArrays(gl.POINTS, 0, particles.length / 5);
        if (scene.routes !== previousRoutes) {
          const geometry = routeBuffer(scene.routes);
          ranges = geometry.ranges;
          previousRoutes = scene.routes;
          gl.bindBuffer(gl.ARRAY_BUFFER, ribbon);
          gl.bufferData(gl.ARRAY_BUFFER, geometry.data, gl.STATIC_DRAW);
        }
        if (scene.routeProgress > 0 && ranges.length) {
          activateProgram(arc);
          gl.bindBuffer(gl.ARRAY_BUFFER, ribbon);
          bind(arc.program, 'aPosition', 3, 11, 0);
          bind(arc.program, 'aPrevious', 3, 11, 3);
          bind(arc.program, 'aNext', 3, 11, 6);
          bind(arc.program, 'aPath', 2, 11, 9);
          gl.uniform1f(arc.uniform('uWidth'), 3.8 * dpr);
          gl.uniform1f(arc.uniform('uProgress'), scene.routeProgress);
          gl.uniform1f(arc.uniform('uColorTime'), colorTime / COLOR_CYCLE_MS);
          gl.uniform3fv(arc.uniform('uRoute[0]'), palette.route.flat());
          ranges.forEach(range =>
            gl.drawArrays(gl.TRIANGLE_STRIP, range.first, range.count)
          );
        }
      },
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
export type ParticleGlobe = Awaited<ReturnType<typeof createParticleGlobe>>;
