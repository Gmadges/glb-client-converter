import Stats from 'three/examples/jsm/libs/stats.module';
import {Viewer} from './viewer';
import {WEBGL} from 'three/examples/jsm/WebGL.js';
import {SimpleDropzone} from 'simple-dropzone';

if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
  console.error('The File APIs are not fully supported in this browser.');
} else if (!WEBGL.isWebGLAvailable()) {
  console.error('WebGL is not supported in this browser.');
}

const stats: Stats = Stats();
document.body.appendChild(stats.dom);

const viewer: Viewer = new Viewer(
  document.getElementById('viewer') as HTMLCanvasElement
);

// document.addEventListener('dragenter', handlerFunction, false);
// document.addEventListener('dragleave', handlerFunction, false);
// document.addEventListener('dragover', handlerFunction, false);
// document.addEventListener('drop', handlerFunction, false);

this.dropEl = document.querySelector('.dropzone');
this.inputEl = document.querySelector('#file-input');

function createDropzone() {
  const dropCtrl = new SimpleDropzone(this.dropEl, this.inputEl);
  dropCtrl.on('drop', ({files}) => this.load(files));
  dropCtrl.on('dropstart', () => this.showSpinner());
  dropCtrl.on('droperror', () => this.hideSpinner());
}

function render() {
  viewer.render();
  stats.update();
  requestAnimationFrame(render);
}
render();
