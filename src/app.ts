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

function hideModal() {
  const modal = document.querySelector<HTMLElement>('.modal');
  modal.setAttribute('style', 'display: none');
}

const dropEl = document.querySelector('.dropzone');
const inputEl = document.querySelector('#file-input');
const dropCtrl = new SimpleDropzone(dropEl, inputEl);

dropCtrl.on('drop', ({files}) => {
  hideModal();
  viewer.load(Array.from(files)).then(() => {
    viewer.export();
  });
});

dropCtrl.on('dropstart', () => console.log('start load'));
dropCtrl.on('droperror', () => console.log('stop load'));

function render() {
  viewer.render();
  stats.update();
  requestAnimationFrame(render);
}
render();
