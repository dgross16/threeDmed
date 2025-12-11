import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Pane } from "tweakpane";

var controls, renderer, scene, camera;

window.onload = async function() {
    scene = new THREE.Scene();

    // setup the camera
    const fov = 75;
    const ratio = window.innerWidth / window.innerHeight;
    const zNear = 1;
    const zFar = 100;
    camera = new THREE.PerspectiveCamera( fov, ratio, zNear, zFar );
    camera.position.set(0, 0, 25);
  
    // create renderer and setup the canvas
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
  
    renderer.domElement.onmousedown = function( e ){
        //console.log(scene);
        //console.log('Yay! We clicked!');
  
        const pixel_coords = new THREE.Vector2( e.clientX, e.clientY );
  
        //console.log('Pixel coords', pixel_coords);
  
        const vp_coords = new THREE.Vector2( 
                    ( pixel_coords.x / window.innerWidth ) * 2 - 1,  //X
                    -( pixel_coords.y / window.innerHeight ) * 2 + 1) // Y
  
        //console.log('Viewport coords', vp_coords);
  
        const vp_coords_near = new THREE.Vector3( vp_coords.x, vp_coords.y, 0);
  
  
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(vp_coords_near, camera);
        let intersects = raycaster.intersectObject(invisible_plane);
        console.log('Ray to Invisible Plane', intersects[0].point);
        
        if (mrbones) {
            intersects = raycaster.intersectObject(mrbones, true);
            console.log(intersects);

            if (intersects.length !== 0) {
                controls.enabled = false;
                const hitPoint = intersects[0].point;
                console.log('Click position - X:', hitPoint.x.toFixed(2), 'Y:', hitPoint.y.toFixed(2), 'Z:', hitPoint.z.toFixed(2));
                
                // More precise region detection
                // Stomach region: middle abdomen area (more restrictive)
                // Y: between 0 and 5 (middle section, not too high or low)
                // X: between -2.5 and 2.5 (centered, not on sides)
                // Z: front of body (positive Z, closer to camera)
                const isStomachRegion = hitPoint.y >= 0 && hitPoint.y <= 5 && 
                                       Math.abs(hitPoint.x) < 2.5 && 
                                       hitPoint.z > -2;
                
                // Heart region: upper chest area
                // Y: above 5, below 12
                // X: centered
                const isHeartRegion = hitPoint.y > 5 && hitPoint.y < 12 && 
                                    Math.abs(hitPoint.x) < 2.5 && 
                                    hitPoint.z > -2;
                
                // Brain region: head area
                // Y: above 12
                const isBrainRegion = hitPoint.y >= 12 && Math.abs(hitPoint.x) < 3;
                
                if (isStomachRegion) {
                    console.log('✓ Stomach area detected! Navigating to stomach page...');
                    window.location.href = 'stomach/index.html';
                    return;
                }
                
                if (isHeartRegion) {
                    console.log('✓ Heart area detected! Navigating to heart page...');
                    window.location.href = 'heart/index.html';
                    return;
                }
                
                if (isBrainRegion) {
                    console.log('✓ Brain area detected!');
                    // Navigate to brain page when it's created
                    // window.location.href = 'brain/index.html';
                    return;
                }
                
                // If none of the regions match, just log it
                console.log('Click detected but not in a specific organ region');
            }
        }
  
        // update torus position

        if (e.shiftKey){
            controls.enabled = false
            // store a reference to the last placed torus in the global variable .
            torus = makeTorus()
            scene.add(torus);
            if (intersects.length > 0) {
                torus.position.set(intersects[0].point.x, intersects[0].point.y, intersects[0].point.z);
            }
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
    const ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);
  
    const light = new THREE.DirectionalLight( 0xffffff, 5.0 );
    light.position.set( 10, 100, 10 );
    scene.add( light );

    // invisible plane
    const geometry = new THREE.PlaneGeometry( 10000, 10000 );
    const material = new THREE.MeshBasicMaterial( {
        visible: false
    });

    const invisible_plane = new THREE.Mesh( geometry, material );

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

    var mrbones;
    var url = 'models/mrbones/scene.gltf';
    gltfLoader.load(url, (gltf) => {
        mrbones = gltf.scene.children[0];
        mrbones.userData.URL = "https://www.stackoverflow.com";
        scene.add(mrbones);
    });
    console.log(mrbones);

    // interaction
    controls = new OrbitControls( camera, renderer.domElement );
  
    // call animation/rendering loop
    animate();
};

function animate() {
  
    requestAnimationFrame( animate );
  
    // and here..
    controls.update();
    renderer.render( scene, camera );

};
