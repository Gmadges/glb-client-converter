import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import THREE, {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Color,
  AmbientLight,
  HemisphereLight,
  Object3D,
  Vector3,
  Quaternion,
  Matrix4,
  Box3,
  Group,
  Mesh,
  BufferGeometry,
} from 'three';
import {loadOBJ_MTL, loadOBJ, loadKMZ, loadFBX, loadGLB} from './loaders';

const enum TYPE {
  OBJ,
  GLB,
  OBJ_MTL,
  KMZ,
  FBX,
}

function getFileExtension(filename: string): string {
  const matches = /\.[0-9a-z]+$/i.exec(filename);
  if (matches) {
    return matches[0].toLowerCase();
  }
  return '';
}

export class Viewer {
  private camera: PerspectiveCamera;
  private controls: OrbitControls;
  private scene: Scene;
  private renderer: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new Scene();
    this.scene.background = new Color(0x000000);

    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.set(400, 200, 0);

    // controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.reset();

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public reset(): void {
    this.scene.remove(...this.scene.children);
    const ambient = new AmbientLight(0x404040); // soft white light
    const hemisphere = new HemisphereLight(0xffffbb, 0x454580, 1);
    this.scene.add(ambient, hemisphere);
  }

  public async load(urls: Array<[string, File]>): Promise<void> {
    const type = this.getLoader(urls);
    if (type === null) throw 'not valid files';
    const model = await this.loadModel(type, urls);
    this.scene.add(model);

    model.traverse(item => {
      if (item instanceof Mesh) {
        if (!(item.geometry as BufferGeometry).attributes.normal) {
          item.geometry.computeVertexNormals();
        }
      }
    });

    // move camera to model
    const box = new Box3();
    box.setFromObject(model);

    const boxDimensions = new Vector3();
    box.getSize(boxDimensions);

    const boxCenter = new Vector3();
    box.getCenter(boxCenter);

    const cameraOffset = Math.min(
      this.camera.far,
      (Math.sqrt(
        boxDimensions.x * boxDimensions.x + boxDimensions.y * boxDimensions.y
      ) *
        0.5) /
        Math.tan(this.camera.fov * 0.5)
    );

    const tiltFactor = 0.8;
    this.camera.position.set(
      boxCenter.x,
      boxCenter.y - tiltFactor * cameraOffset,
      boxCenter.z + cameraOffset
    );

    this.cameraLookAtVector(boxCenter);
  }

  private getLoader(urls: Array<[string, File]>): null | TYPE {
    const exts = urls.map(([name]) => getFileExtension(name));
    // ugly confusing ifs because i'm feeling lazy

    if (exts.includes('.obj') && exts.includes('.mtl')) {
      return TYPE.OBJ_MTL;
    }

    if (exts.includes('.obj')) return TYPE.OBJ;

    if (exts.includes('.kmz')) return TYPE.KMZ;

    if (exts.includes('.glb')) return TYPE.GLB;

    if (exts.includes('.fbx')) return TYPE.FBX;

    return null;
  }

  private async loadModel(
    loaderType: TYPE,
    urls: Array<[string, File]>
  ): Promise<Object3D> {
    const [obj1, obj2] = urls;

    switch (loaderType) {
      case TYPE.OBJ_MTL: {
        const [name1, file1] = obj1;
        const [name2, file2] = obj2;

        const [obj, mtl] = (getFileExtension(name1) === '.obj'
          ? [file1, file2]
          : [file2, file1]
        ).map(i => URL.createObjectURL(i));

        return await loadOBJ_MTL(obj, mtl);
      }
      case TYPE.OBJ: {
        const [name, file] = obj1;
        return await loadOBJ(URL.createObjectURL(file));
      }
      case TYPE.GLB: {
        const [name, file] = obj1;
        return await loadGLB(URL.createObjectURL(file));
      }
      case TYPE.KMZ: {
        const [name, file] = obj1;
        return await loadKMZ(URL.createObjectURL(file));
      }
      case TYPE.FBX: {
        const [name, file] = obj1;
        return await loadFBX(URL.createObjectURL(file));
      }
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private lookAtVector(
    sourcePoint: Vector3,
    destPoint: Vector3
  ): THREE.Quaternion {
    return new Quaternion().setFromRotationMatrix(
      new Matrix4().lookAt(sourcePoint, destPoint, new Vector3(0, 0, 1))
    );
  }

  public cameraLookAtVector(focalPoint: Vector3): void {
    const lookAtQuaternion = this.lookAtVector(
      this.camera.position,
      focalPoint
    );
    this.camera.quaternion.copy(lookAtQuaternion);
    this.camera.updateMatrix();
  }
}
