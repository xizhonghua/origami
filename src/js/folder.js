var scene, camera, renderer, origami, mesh, materials, controls, percentage, dir;

function init()
{
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 1000 );

    controls = new THREE.OrbitControls( camera );

    controls.rotateSpeed = 5.0;
    controls.zoomSpeed = 5;

    controls.noZoom = false;
    controls.noPan = false;

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    materials = [ 
        new THREE.MeshBasicMaterial( { color: 0x00ff00}), 
        new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true, wireframeLinewidth: 0.1})
    ];

    materials[0].side = THREE.DoubleSide;

    origami = new Origami.Model();

    origami.load('models/star-024.json', function(){

        origami.foldTo(origami.goal_cfg);

        console.log('origami loaded!');
        
        
        mesh = new THREE.Mesh( origami.geometry, materials[0] );
        edges = new THREE.Mesh( origami.geometry, materials[1] );
        scene.add( mesh );
        scene.add( edges );
        
        //camera.lookAt(new THREE.vector3(0,1,0));
        //camera.up = new THREE.vector(0,0,1);
        camera.position.z = origami.geometry.boundingSphere.radius * 3;

        render();
    });

    dir = 1;

    percentage = 0.0;
}

function render()
{
    requestAnimationFrame( render );

    percentage += dir;

    if(percentage > 400)
    {
        percentage = 400;
        dir = -1;
    }
    else if(percentage < 0)
    {
        percentage = 0;
        dir = 1;
    }

    origami.foldToPercentage(percentage/400.0);

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}


init();




