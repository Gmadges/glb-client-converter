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
  Mesh,
  BufferGeometry,
} from 'three';
import {loadOBJ_MTL, loadOBJ, loadFBX, loadGLB} from './loaders';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter';
import {Notyf} from 'notyf';
import 'notyf/notyf.min.css';

// Create an instance of Notyf
const notyf = new Notyf({
  position: {x: 'left', y: 'bottom'},
  types: [
    {
      type: 'error',
      duration: 5000,
    },
  ],
});

const enum TYPE {
  OBJ,
  OBJ_MTL,
  FBX,
  GLB,
}

const saveData = (function() {
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
    this.scene.background = new Color(0x616161);

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
    this.camera.up.set(0, 0, 1);
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
    try {
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

      notyf.success('Success!');
    } catch (err) {
      notyf.error(`Error loading file: ${err}`);
    }
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

    console.log(
      `center of model: ${center.x.toFixed(2)}, ${center.y.toFixed(
        2
      )}, ${center.z.toFixed(2)}`,
      `size of model: ${size.x.toFixed(2)}, ${size.y.toFixed(
        2
      )}, ${size.z.toFixed(2)}`
    );

    // get the max side of the bounding box (fits to width OR height as needed )
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs((maxDim / 4) * Math.tan(fov * 2)) * offset;

    const minZ = boundingBox.min.z;
    const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

    this.camera.far = cameraToFarEdge * 4;

    this.camera.position.set(center.x, center.y, center.z + cameraZ);

    this.camera.updateProjectionMatrix();

    console.log(
      `camera pos: ${this.camera.position.x.toFixed(
        2
      )}, ${this.camera.position.y.toFixed(
        2
      )}, ${this.camera.position.z.toFixed(2)}`
    );

    this.controls.target = center;
    this.controls.maxDistance = cameraToFarEdge * 3;
    this.controls.autoRotate = true;
    this.controls.saveState();
  }

  private getLoader(urls: Array<[string, File]>): null | TYPE {
    const exts = urls.map(([name]) => getFileExtension(name));
    // ugly confusing ifs because i'm feeling lazy

    if (exts.includes('.obj') && exts.includes('.mtl')) {
      return TYPE.OBJ_MTL;
    }

    if (exts.includes('.obj')) return TYPE.OBJ;

    if (exts.includes('.fbx')) return TYPE.FBX;

    if (exts.includes('.glb')) return TYPE.GLB;

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
      case TYPE.FBX: {
        const [name, file] = obj1;
        return await loadFBX(URL.createObjectURL(file));
      }
      case TYPE.GLB: {
        const [name, file] = obj1;
        return await loadGLB(URL.createObjectURL(file));
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
