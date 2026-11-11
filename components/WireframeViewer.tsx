import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ObjectType, SonarTarget } from '../types';

interface WireframeViewerProps {
  target: SonarTarget | null;
}

const COLORS: Record<ObjectType, number> = {
  plastic_bottle: 0x22d3ee,
  plastic_bag: 0xa78bfa,
  aluminum_can: 0xfbbf24,
  fishing_net: 0xf87171,
  tire: 0xfb923c,
  metal_scrap: 0xfbbf24,
  unknown: 0x94a3b8
};

function lineMaterial(color: number, opacity = 0.9): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity });
}

function createModel(type: ObjectType, color: number): THREE.Group {
  const model = new THREE.Group();
  const addWire = (geometry: THREE.BufferGeometry, opacity = 0.9) => {
    const material = lineMaterial(color, opacity);
    model.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), material));
    geometry.dispose();
  };

  switch (type) {
    case 'plastic_bottle': {
      addWire(new THREE.CylinderGeometry(0.35, 0.43, 1.35, 16, 5));
      addWire(new THREE.CylinderGeometry(0.17, 0.2, 0.22, 12, 2), 0.95);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.12, 12), new THREE.MeshBasicMaterial({ color, wireframe: true }));
      cap.position.y = 0.74;
      model.add(cap);
      break;
    }
    case 'plastic_bag': {
      const bag = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 12, 8),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.72 })
      );
      bag.scale.set(1.15, 0.8, 0.55);
      model.add(bag);
      const knot = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(0.15, 0.4, 8)), lineMaterial(color));
      knot.position.set(0, 0.65, 0);
      model.add(knot);
      break;
    }
    case 'aluminum_can':
      addWire(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 18, 5));
      addWire(new THREE.TorusGeometry(0.3, 0.025, 6, 18), 0.7);
      break;
    case 'fishing_net': {
      const net = new THREE.Group();
      for (let x = -1; x <= 1; x += 0.2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, -0.75, 0), new THREE.Vector3(x, 0.75, 0)
        ]);
        net.add(new THREE.Line(geometry, lineMaterial(color, 0.7)));
      }
      for (let y = -0.75; y <= 0.75; y += 0.2) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-1, y, 0), new THREE.Vector3(1, y, 0)
        ]);
        net.add(new THREE.Line(geometry, lineMaterial(color, 0.7)));
      }
      net.rotation.set(0.25, 0.35, -0.15);
      model.add(net);
      break;
    }
    case 'tire':
      addWire(new THREE.TorusGeometry(0.62, 0.22, 12, 24));
      addWire(new THREE.TorusGeometry(0.62, 0.08, 8, 24), 0.45);
      break;
    case 'metal_scrap':
      addWire(new THREE.DodecahedronGeometry(0.7, 1));
      addWire(new THREE.BoxGeometry(1.35, 0.28, 0.45), 0.55);
      break;
    default:
      addWire(new THREE.IcosahedronGeometry(0.68, 2));
  }
  return model;
}

const WireframeViewer: React.FC<WireframeViewerProps> = ({ target }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const rotationRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number>(0);
  const draggingRef = useRef(false);
  const previousPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010810);
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.35, 3.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const stage = new THREE.Group();
    scene.add(stage);
    rotationRef.current = stage;
    const grid = new THREE.GridHelper(4, 16, 0x14566b, 0x0b2637);
    grid.position.y = -0.92;
    grid.rotation.x = 0.12;
    scene.add(grid);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.22, 1.24, 64),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.9;
    scene.add(ring);
    scene.add(new THREE.AmbientLight(0x214461, 2.2));
    const key = new THREE.PointLight(0x22d3ee, 2.4, 8);
    key.position.set(2, 2, 3);
    scene.add(key);
    const fill = new THREE.PointLight(0xa78bfa, 1.2, 7);
    fill.position.set(-2, -1, 2);
    scene.add(fill);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    let autoRotation = 0;
    const render = () => {
      if (!draggingRef.current && rotationRef.current) {
        autoRotation += 0.006;
        rotationRef.current.rotation.y = autoRotation;
      }
      ring.rotation.z += 0.002;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const group = rotationRef.current;
    if (!group) return;
    if (modelRef.current) {
      group.remove(modelRef.current);
      modelRef.current.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
    }
    modelRef.current = null;
    if (!target) return;
    const model = createModel(target.object_type, COLORS[target.object_type]);
    const dimensions = target.estimated_dimensions;
    const maxDimension = Math.max(dimensions.length, dimensions.width, dimensions.height, 0.1);
    model.scale.setScalar(Math.min(1.55, 1.35 / maxDimension));
    model.rotation.x = 0.18;
    group.add(model);
    modelRef.current = model;
  }, [target]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    previousPointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !rotationRef.current) return;
    rotationRef.current.rotation.y += (event.clientX - previousPointer.current.x) * 0.012;
    rotationRef.current.rotation.x = Math.max(-0.9, Math.min(0.9, rotationRef.current.rotation.x + (event.clientY - previousPointer.current.y) * 0.01));
    previousPointer.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.z = Math.max(1.7, Math.min(7, cameraRef.current.position.z + event.deltaY * 0.004));
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => { draggingRef.current = false; }}
      onPointerLeave={() => { draggingRef.current = false; }}
      onWheel={onWheel}
      aria-label={target ? `${target.label} 3D wireframe model` : '3D wireframe viewer'}
    >
      {!target && <div className="flex h-full items-center justify-center text-[9px] text-cyan-100/30">SELECT A TARGET TO VIEW 3D MODEL</div>}
    </div>
  );
};

export default WireframeViewer;
