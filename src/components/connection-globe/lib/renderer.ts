import { COLOR_CYCLE_MS } from '@/components/connection-globe/consts/playback';
import type { SettleFrame } from '@/components/connection-globe/lib/choreography';
import { traceCoastlines } from '@/components/connection-globe/lib/coastlines';
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
  landAccent: Color[];
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
  gl_FragColor=vec4(color,(1.-smoothstep(1.-edge,1.+edge,r)));
}`;
const particleVertex = `
attribute vec3 aPosition;
attribute float aRegion, aSeed, aTone;
uniform float uFormation, uPixelRatio, uPointSize, uCloudReveal;
uniform vec3 uLand[7];
uniform vec3 uLandAccent[7];
varying vec3 vView, vColor;
varying float vAlpha, vOcclusion, vSettled, vGrainAngle;
${projection}
float ease(float x) { return 1.-pow(1.-clamp(x,0.,1.),3.); }
vec3 rotateY(vec3 p, float a) {
  return vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);
}
void main(){
  float p=0.;
  vec3 pos=aPosition;
  vAlpha=1.;
  vOcclusion=1.;
  {
    // Grains descend throughout the turn, each with its own launch height,
    // delay and landing time. The northern cloud has the longest tail.
    float scatter=fract(aSeed*37.17);
    float drift=fract(aSeed*73.31);
    // Reuse a quarter of the map grains as a broad upper-left arrival cloud.
    // Its own seed keeps that group independent of geography and landing order.
    float upperLeft=1.-step(.25,fract(aSeed*97.41));
    float entryDelay=fract(aSeed*41.93)*.01;
    float entryEnd=.24+fract(aSeed*59.17)*.06;
    float entry=ease((uFormation-entryDelay)/(entryEnd-entryDelay));
    float delay=.012+drift*.048;
    float lastArrival=aRegion<.5?.99:.86;
    float arrival=.14+(lastArrival-.14)*pow(aSeed,.65);
    arrival=max(arrival,upperLeft*(entryEnd+.06));
    float descent=clamp((uFormation-delay)/(arrival-delay),0.,1.);
    p=smoothstep(0.,1.,descent*descent);
    float q=pow(1.-p,.65);
    pos=rotateY(pos,q*(drift-.5)*.7);
    pos*=1.+q*(.06+pow(scatter,1.6)*.66);
    pos.y+=q*(.04+fract(aSeed*19.73)*.25);
    vView=view(pos);
    float visible=.08+.92*smoothstep(0.,.12+drift*.08,uFormation);
    float nearCloud=mix(smoothstep(-.12,.25,view(aPosition).z),1.,p);
    if(upperLeft>.5) {
      float radius=sqrt(fract(aSeed*23.71));
      float angle=fract(aSeed*61.83)*6.2831853;
      float depth=fract(aSeed*83.29);
      vec3 start=vec3(-1.08+.68*radius*cos(angle),1.12+.38*radius*sin(angle),.35+depth*1.15);
      vec3 bend=vec3(.12+drift*.22,.16+scatter*.28,(depth-.5)*.5);
      // A curved approach blends into the moving cloud with zero residual
      // velocity at the join. Depth still uses the sphere's normal occlusion.
      vView=mix(start,vView,entry)+2.*entry*(1.-entry)*bend;
      visible=mix(.5,visible,entry);
      visible*=mix(1.-.55*smoothstep(.45,1.,radius),1.,entry);
      nearCloud=mix(1.,nearCloud,entry);
    }
    vAlpha=uCloudReveal*visible*mix(.32,1.,p);
    // Distant continents must not form a second cloud around the far limb.
    vAlpha*=nearCloud;
  }
  vSettled=p;
  vGrainAngle=aSeed*6.2831853+(1.-p)*1.2;
  vColor=aRegion<.5?uLand[0]:aRegion<1.5?uLand[1]:aRegion<2.5?uLand[2]:aRegion<3.5?uLand[3]:aRegion<4.5?uLand[4]:aRegion<5.5?uLand[5]:uLand[6];
  {
    vec3 accent=aRegion<.5?uLandAccent[0]:aRegion<1.5?uLandAccent[1]:aRegion<2.5?uLandAccent[2]:aRegion<3.5?uLandAccent[3]:aRegion<4.5?uLandAccent[4]:aRegion<5.5?uLandAccent[5]:uLandAccent[6];
    // A grain owns its color from launch to rest. Only its opacity and size
    // follow the individual landing curve; there is no global recolor beat.
    vColor=mix(vColor,accent,aTone);
  }
  gl_Position=vec4(clip(vView),0.,1.);
  gl_PointSize=uPointSize*uPixelRatio*pow(uScale,.45)*mix(.90,1.,p);
  {
    // Camera-space depth dominates size; random grain variation stays small.
    float depthScale=clamp(3.8/max(.8,3.8-vView.z),.62,2.1);
    float flakeSize=.7+pow(fract(aSeed*13.37),2.)*1.6;
    gl_PointSize*=mix(depthScale*flakeSize,1.,p);
  }
}`;
const particleFragment = `
precision highp float;
uniform vec2 uSize;
uniform float uFormation;
varying vec3 vColor;
varying float vAlpha, vOcclusion, vSettled, vGrainAngle;
${occlusion}
void main(){
  float r=dot(vView.xy,vView.xy);
  float visibility=1.;
  if(r<1. && vView.z<sqrt(1.-r)-.008) {
    visibility=1.-vOcclusion;
    if(visibility<.001) discard;
  }
  vec2 grain=gl_PointCoord-.5;
  float d=length(grain)*2.;
  {
    float c=cos(vGrainAngle), s=sin(vGrainAngle);
    vec2 flake=mat2(c,-s,s,c)*grain;
    float square=max(abs(flake.x),abs(flake.y)*1.15)*2.4;
    d=mix(square,d,vSettled);
  }
  float alpha=(1.-smoothstep(.55,1.,d))*(.67+.33*clamp(vView.z,0.,1.))*vAlpha*visibility;
  {
    vec2 boundary=min(gl_FragCoord.xy,uSize-gl_FragCoord.xy)/uSize;
    float edgeFade=smoothstep(0.,.035,boundary.x)*smoothstep(0.,.09,boundary.y);
    alpha*=mix(edgeFade,1.,uFormation);
  }
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
const coastlineFragment = `
precision highp float;
uniform float uOpacity;
uniform vec3 uColor;
varying float vProgress, vSide;
${occlusion}
void main(){
  occlude();
  float edge=1.-smoothstep(.35,1.,abs(vSide));
  gl_FragColor=vec4(uColor,uOpacity*edge*(.65+.35*clamp(vView.z,0.,1.)));
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
  const map = context.getImageData(0, 0, mask.width, mask.height);
  const particles = createLandParticles(map, width < 500 ? 12000 : 22000);
  const coastGeometry = routeBuffer(traceCoastlines(map));
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
    // A hot refresh reuses this canvas. Release a detached canvas's context,
    // while retaining the live one so its replacement shaders can compile.
    if (!canvas.isConnected) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
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
    const coast = program(routeVertex, coastlineFragment);
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
    const coastRibbon = buffer(coastGeometry.data);
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
    canvas.dataset.landPoints = String(particles.length / 6);
    canvas.dataset.renderer = 'particles-3d';
    canvas.dataset.coastlines = String(coastGeometry.ranges.length);
    delete canvas.dataset.rendererError;
    return {
      destroy,
      render(
        scene: GlobeScene,
        palette: GlobePalette,
        colorTime: number,
        width: number,
        height: number,
        refined: SettleFrame
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
          for (let index = 0; index < 5; index++) {
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
        if (refined.coastOpacity > 0) {
          activateProgram(coast);
          gl.uniform3fv(coast.uniform('uColor'), palette.land[0]);
          gl.bindBuffer(gl.ARRAY_BUFFER, coastRibbon);
          bind(coast.program, 'aPosition', 3, 11, 0);
          bind(coast.program, 'aPrevious', 3, 11, 3);
          bind(coast.program, 'aNext', 3, 11, 6);
          bind(coast.program, 'aPath', 2, 11, 9);
          gl.uniform1f(coast.uniform('uWidth'), 1.0 * dpr);
          gl.uniform1f(coast.uniform('uOpacity'), refined.coastOpacity);
          coastGeometry.ranges.forEach(range =>
            gl.drawArrays(gl.TRIANGLE_STRIP, range.first, range.count)
          );
        }
        canvas.dataset.coastProgress = String(refined.coastProgress);
        canvas.dataset.coastOpacity = String(refined.coastOpacity);
        canvas.dataset.cloudReveal = String(refined.cloudReveal);
        canvas.dataset.routeColorTime = colorTime.toFixed(2);
        activateProgram(points);
        gl.bindBuffer(gl.ARRAY_BUFFER, dots);
        bind(points.program, 'aPosition', 3, 6, 0);
        bind(points.program, 'aRegion', 1, 6, 3);
        bind(points.program, 'aSeed', 1, 6, 4);
        bind(points.program, 'aTone', 1, 6, 5);
        gl.uniform1f(points.uniform('uFormation'), scene.formationProgress);
        gl.uniform1f(points.uniform('uCloudReveal'), refined.cloudReveal);
        gl.uniform1f(points.uniform('uPixelRatio'), dpr);
        gl.uniform1f(points.uniform('uPointSize'), width < 500 ? 2.0 : 2.25);
        gl.uniform3fv(points.uniform('uLand[0]'), palette.land.flat());
        gl.uniform3fv(
          points.uniform('uLandAccent[0]'),
          palette.landAccent.flat()
        );
        gl.drawArrays(gl.POINTS, 0, particles.length / 6);
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
