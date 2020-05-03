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
import {loadOBJ_MTL, loadOBJ, loadFBX, loadGLB} from './loaders';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter';

const enum TYPE {
  OBJ,
  GLB,
  OBJ_MTL,
  FBX,
}

var saveData = (function() {
  var a = document.createElement('a');
  document.body.appendChild(a);
  a.setAttribute('style', 'display: none');
  return function(data, fileName) {
    const blob = new Blob([data], {type: 'application/octet-stream'});
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };
})();

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
    this.fitCameraToObject(model);
  }

  public export(): Promise<void> {
    return new Promise<void>((resolve, error) => {
      new GLTFExporter().parse(
        this.scene,
        (gltf: ArrayBuffer) => {
          saveData(gltf, 'export.glb');
          resolve();
        },
        {binary: true}
      );
    });
  }

  private fitCameraToObject(object: Object3D) {
    const offset = 1.25;

    const boundingBox = new Box3();

    // get bounding box of object - this will be used to setup controls and camera
    boundingBox.setFromObject(object);

    const size = new Vector3();
    boundingBox.getSize(size);

    const center = new Vector3();
    boundingBox.getCenter(center);

    // get the max side of the bounding box (fits to width OR height as needed )
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs((maxDim / 4) * Math.tan(fov * 2));

    cameraZ *= offset; // zoom out a little so that objects don't fill the screen

    this.camera.position.z = cameraZ;

    const minZ = boundingBox.min.z;
    const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

    this.camera.far = cameraToFarEdge * 3;
    this.camera.updateProjectionMatrix();

    if (this.controls) {
      // set camera to rotate around center of loaded object
      this.controls.target = center;

      // prevent camera from zooming out far enough to create far plane cutoff
      this.controls.maxDistance = cameraToFarEdge * 2;

      this.controls.autoRotate = true;

      this.controls.saveState();
    } else {
      this.camera.lookAt(center);
    }
  }

  private getLoader(urls: Array<[string, File]>): null | TYPE {
    const exts = urls.map(([name]) => getFileExtension(name));
    // ugly confusing ifs because i'm feeling lazy

    if (exts.includes('.obj') && exts.includes('.mtl')) {
      return TYPE.OBJ_MTL;
    }

    if (exts.includes('.obj')) return TYPE.OBJ;

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
