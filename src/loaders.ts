import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader';
import {KMZLoader} from 'three/examples/jsm/loaders/KMZLoader';
import {TGALoader} from 'three/examples/jsm/loaders/TGALoader';
import {DDSLoader} from 'three/examples/jsm/loaders/DDSLoader';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {Object3D, LoadingManager} from 'three';

export function loadFBX(url: string): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    new FBXLoader().load(
      url,
      item => resolve(item),
      () => {},
      err => reject(err)
    );
  });
}

export function loadGLB(url: string): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(
      url,
      item => resolve(item.scene),
      () => {},
      err => reject(err)
    );
  });
}

export function loadOBJ(url: string): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    new OBJLoader().load(
      url,
      item => resolve(item),
      () => {},
      err => reject(err)
    );
  });
}

export function loadKMZ(url: string): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    new KMZLoader().load(
      url,
      item => resolve(item.scene),
      () => {},
      err => reject(err)
    );
  });
}

export function loadOBJ_MTL(obj: string, mtl: string): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    const manager = new LoadingManager();
    manager.addHandler(/\.dds$/i, new DDSLoader());
    manager.addHandler(/\.tga$/i, new TGALoader());

    new MTLLoader(manager).load(
      mtl,
      materials => {
        materials.preload();
        new OBJLoader(manager).setMaterials(materials).load(
          obj,
          object => resolve(object),
          () => {},
          err => reject(err)
        );
      },
      () => {},
      err => reject(err)
    );
  });
}
