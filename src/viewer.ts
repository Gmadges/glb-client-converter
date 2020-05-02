import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Color,
  AmbientLight,
  HemisphereLight,
  MeshLambertMaterial,
  DoubleSide,
  FontLoader,
  ShapeBufferGeometry,
  Mesh,
  Group,
} from 'three';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader';

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

    this.controls.minDistance = 100;
    this.controls.maxDistance = 500;

    this.controls.maxPolarAngle = Math.PI / 2;

    const ambient = new AmbientLight(0x404040); // soft white light
    const hemisphere = new HemisphereLight(0xffffbb, 0x454580, 1);
    this.scene.add(ambient, hemisphere);

    window.addEventListener('resize', () => this.onWindowResize(), false);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
