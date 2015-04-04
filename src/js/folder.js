var scene, camera, renderer, origami, mesh, materials, controls, percentage, dir;

function init()
{
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.01, 1000 );

    controls = new THREE.OrbitControls( camera );

    // hack the keys...
    controls.keys = { LEFT: 39, UP: 40, RIGHT: 37, BOTTOM: 38 };

    controls.rotateSpeed = 5.0;
    controls.zoomSpeed = 5;

    controls.noZoom = false;
    controls.noPan = false;

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( 0xffffff, 0.5 );

    document.body.appendChild( renderer.domElement );

    var ambientLight = new THREE.AmbientLight( 0x000000 );
    scene.add( ambientLight );

    var lights = [];
    lights[0] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[1] = new THREE.PointLight( 0xffffff, 1, 0 );
    lights[2] = new THREE.PointLight( 0xffffff, 1, 0 );
    
    lights[0].position.set( 0, 200, 0 );
    lights[1].position.set( 100, 200, 100 );
    lights[2].position.set( -100, -200, -100 );

    scene.add( lights[0] );
    scene.add( lights[1] );
    scene.add( lights[2] );

    materials = [ 
        new THREE.MeshPhongMaterial( { 
            color: 0x996633, 
            specular: 0x050505,
            shininess: 100
        }),
        new THREE.MeshBasicMaterial({
            color: 0x000000, 
            wireframe: true, 
            wireframeLinewidth: 0.1
        })
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




