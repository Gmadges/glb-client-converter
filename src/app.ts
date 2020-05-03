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

document.getElementById('export').onclick = () => {
  showSpinner();
  viewer.export().then(() => hideSpinner());
};

function hideModal() {
  const modal = document.querySelector<HTMLElement>('.modal');
  modal.setAttribute('style', 'display: none');
}

function showModal() {
  const modal = document.querySelector<HTMLElement>('.modal');
  modal.removeAttribute('style');
}

function showExport() {
  const modal = document.querySelector<HTMLElement>('.export-container');
  modal.removeAttribute('style');
}

function hideExport() {
  const modal = document.querySelector<HTMLElement>('.export-container');
  modal.setAttribute('style', 'display: none');
}

function showSpinner() {
  const modal = document.querySelector<HTMLElement>('.spinner');
  modal.removeAttribute('style');
}

function hideSpinner() {
  const modal = document.querySelector<HTMLElement>('.spinner');
  modal.setAttribute('style', 'display: none');
}

const dropEl = document.querySelector('.dropzone');
const inputEl = document.querySelector('#file-input');
const dropCtrl = new SimpleDropzone(dropEl, inputEl);

dropCtrl.on('drop', ({files}) => {
  hideModal();
  showSpinner();
  viewer.load(Array.from(files)).then(() => {
    hideSpinner();
    showExport();
  });
});

dropCtrl.on('dropstart', () => console.log('start load'));
dropCtrl.on('droperror', () => console.log('stop load'));

function render() {
  viewer.render();
  stats.update();
  requestAnimationFrame(render);
}

showModal();
hideExport();
hideSpinner();
render();
