import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Pane } from "tweakpane";
var renderer, controls, scene, camera;
var mrbones;


window.onload = function() {

    scene = new THREE.Scene();
  
    // setup the camera
    var fov = 75;
    var ratio = window.innerWidth / window.innerHeight;
    var zNear = 1;
    var zFar = 100;
    camera = new THREE.PerspectiveCamera( fov, ratio, zNear, zFar );
    camera.position.set(0, 0, 25);
  
    // create renderer and setup the canvas
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
  
  
  
    renderer.domElement.onmousedown = function( e ){
        //console.log(scene);
        //console.log('Yay! We clicked!');
  
        var pixel_coords = new THREE.Vector2( e.clientX, e.clientY );
  
        //console.log('Pixel coords', pixel_coords);
  
        var vp_coords = new THREE.Vector2( 
                    ( pixel_coords.x / window.innerWidth ) * 2 - 1,  //X
                    -( pixel_coords.y / window.innerHeight ) * 2 + 1) // Y
  
        //console.log('Viewport coords', vp_coords);
  
        var vp_coords_near = new THREE.Vector3( vp_coords.x, vp_coords.y, 0);
  
  
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vp_coords_near, camera);
        var intersects = raycaster.intersectObject(invisible_plane);
        console.log('Ray to Invisible Plane', intersects[0].point);
        var intersects = raycaster.intersectObject(mrbones);

        if (intersects) {
          console.log('Ray to Mr. Bones', intersects[0].point);
          console.log(intersects[0].object.userData.URL);
          window.open(intersects[0].object.userData.URL);
          
        }
  
        // update torus position
        if (e.shiftKey){
            controls.enabled = false
            // store a reference to the last placed torus in the global variable .
            torus = makeTorus()
            scene.add(torus);
            torus.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z);
        }
    };

    renderer.domElement.onmousemove = (e) => {
        if (e.shiftKey && torus){
            const DELTA = e.movementY * 0.1;
            torus.scale.set(torus.scale.x + DELTA,
                            torus.scale.y + DELTA,
                            torus.scale.z + DELTA);
            if (torus.scale.x < 0) {
                console.log('true');
                torus.material.color.set(COLOR_1);
            } else {
                console.log('false');
                torus.material.color.set(COLOR_2);
            }
        }
    };

    renderer.domElement.onmouseup = function() {
        controls.enabled = true;
    }


  
    // setup lights
    var ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);
  
    var light = new THREE.DirectionalLight( 0xffffff, 5.0 );
    light.position.set( 10, 100, 10 );
    scene.add( light );

    // invisible plane
    const geometry = new THREE.PlaneGeometry( 10000, 10000 );
    const material = new THREE.MeshBasicMaterial( {
        visible: false
    });

    var invisible_plane = new THREE.Mesh( geometry, material );

    scene.add(invisible_plane);

    // LOAD THE ARMADILLO
    /*
    var loader = new PLYLoader();
    loader.load('armadillo/armadillo.ply', function(geometry) {

      geometry.computeVertexNormals();

      var material = new THREE.MeshStandardMaterial({ color: 'white',
        metalness: 1.0,
        roughness: 0.1
      });

      window.material = material;

      var mesh = new THREE.Mesh( geometry, material );

      window.mesh = mesh;

      scene.add( mesh );

    })
    */ 

    // Loading Mr. Bones
    const gltfLoader = new GLTFLoader();
    const url = 'models/mrbones/scene.gltf';
    gltfLoader.load(url, (gltf) => {
      mrbones = gltf.scene;
      mrbones.userData = { URL: "https://stackoverflow.com"};
      scene.add(mrbones);
    });

    // interaction
    controls = new OrbitControls( camera, renderer.domElement );
  
    // call animation/rendering loop
    animate();
};

function animate() {
  
    requestAnimationFrame( animate );

    if (scene.children.length > 4) {
        // change the opacity of each placed torus (4th+ item in the scene)
        scene.children.map((obj, i) => {
            if (i > 3) {
                if (FLICKERING) {
                    obj.material.opacity = Math.random();
                    obj.material.transparent = true;
                    obj.material.needsUpdate = true;
                }
                var T = Math.PI;

                var x = Math.sin(T/2) * 0;
                var y = Math.sin(T/2) * 1;
                var z = Math.sin(T/2) * 0;
                var w = Math.sin(T/2);

                var q = new THREE.Quaternion(x, y, z, w);

                obj.quaternion.slerp(q, -0.1);


                return obj;
            } else {
                return obj;
            }
        });
    }
  
    // and here..
    controls.update();
    renderer.render( scene, camera );

};
