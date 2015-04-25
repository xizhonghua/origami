var scene, camera, renderer, mesh, materials, controls, percentage, animation_step, dir, animation, rendered;

var origami;

var origamis = [];

// for animation
var max_p = 400;
var delay_p = 0.1*max_p;

// init scene, camera, controls, lights, materials, etc
function init()
{
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.001, 1e6 );

    controls = new THREE.OrbitControls( camera );

    // hack the keys...
    controls.keys = { LEFT: 39, UP: 40, RIGHT: 37, BOTTOM: 38 };

    controls.rotateSpeed = 2.0;
    controls.zoomSpeed = 1.0;

    controls.noZoom = false;
    controls.noPan = false;

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( 0xffffff, 1.0 );

    document.body.appendChild( renderer.domElement );

    var ambientLight = new THREE.AmbientLight( 0x666666 );
    scene.add( ambientLight );

    var lights = [];
    lights[0] = new THREE.PointLight( 0xffffff, 1.0, 0 );
    lights[1] = new THREE.PointLight( 0xffffff, 1.0, 0 );
    lights[2] = new THREE.PointLight( 0xffffff, 1.0, 0 );
    
    lights[0].position.set( 0, 200, 0 );
    lights[1].position.set( 100, 100, 100 );
    lights[2].position.set( -100, -100, -100 );

    scene.add( lights[0] );
    scene.add( lights[1] );
    scene.add( lights[2] );

    materials = [ 
        new THREE.MeshPhongMaterial( { 
            color: 0x996633, 
            specular: 0x050505,
            shininess: 50
        }),
        // new THREE.MeshLambertMaterial({
        //     color: 0x996633, 
        // }),
        new THREE.MeshBasicMaterial({
            color: 0x000000, 
            wireframe: true, 
            wireframeLinewidth: 0.1
        })
    ];

    materials[0].side = THREE.DoubleSide;

}

// create 3d obj for the given origami and add it the senece 
function addModel(origami) {
    mesh = new THREE.Mesh( origami.geometry, materials[0] );
    edges = new THREE.Mesh( origami.geometry, materials[1] );
    mesh.name = origami.name + '_mesh';
    edges.name = origami.name + '_edges';
    scene.add( mesh );
    scene.add( edges );
}

function resetAnimation()
{
    animation_step = 1;

    dir = 1;

    percentage = 0.0;

    animation = true;
}

function resetScene()
{        
    resetCamera();
    resetAnimation();

    if(!rendered) render();
}

function loadModel(model_url, traj_url, callback)
{
    origami = new Origami.Model();

    // put in the array
    origamis.push(origami);

    origami.load(model_url, traj_url, function() {

        origami.loaded = true;
        origami.foldTo(origami.goal_cfg);

        addModel(origami);

        console.log('origami loaded!');        

        if(callback) callback();
    });
}

// clear scene
// read all given models
function loadModels(models, callback)
{
    // first remove existing model
    removeModel();

    var count = 0;

    var loaded_handler = function() {
        // all loaded
        if(++count == models.length) {

            // reset scene
            resetScene();

            if(callback) callback();
        }
    };

    // load each model
    $.each(models, function(index, model){
        loadModel(model.model_url, model.traj_url, loaded_handler)
    });
}

function resetCamera()
{
    //TODO...

    camera.position.z = origamis[0].geometry.boundingSphere.radius * 3;
    camera.position.x = 0;
    camera.position.y = 0;
    camera.rotation.set(0,0,0);
    controls.rotateUp(0.8);
    controls.update();
}

function removeModel()
{
    // remove each origami model from scene
    $.each(origamis, function(index, ori) {
        var mesh = scene.getObjectByName(ori.name + '_mesh');
        var edges = scene.getObjectByName(ori.name + '_edges');

        // prevent memory leak
        if(mesh) mesh.geometry.dispose();
        if(edges) edges.geometry.dispose();
        
        scene.remove( mesh );
        scene.remove( edges );
    });
    
    // clear the array
    origamis = [];
}

function render()
{
    rendered = true;

    requestAnimationFrame( render );

    if(animation)
    {
        percentage += dir * animation_step;

        if(percentage > max_p + delay_p)
        {            
            dir = -1;
        }
        else if(percentage < -delay_p)
        {            
            dir = 1;
        }
    }

    $.each(origamis, function(index, ori){
        ori.foldToPercentage(percentage/max_p);    
    });

    renderer.render(scene, camera);
}

$( window ).resize(function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
});

$(document).keypress(function(event) {

    console.log(event.charCode);

    switch(event.charCode)
    {

        //space
        case 32: 
            animation = !animation;            
            break;
        // ','    
        case 44:
            percentage = Math.min(max_p, percentage+3*animation_step);
            animation = false;
            break;
        // '.'
        case 46:
            percentage = Math.max(0, percentage-3*animation_step);
            animation = false;
            break;
        // '[' : faster
        case 91:
            animation_step = animation_step*1.4;
            animation_step = Math.min(animation_step, 30);
            break;
        // ']' : slower
        case 93:
            animation_step = animation_step/1.4;
            animation_step = Math.max(animation_step, 0.1);
            break;
        // 'e'
        case 101:
            edges.visible = !edges.visible;
            break;
        // 't'
        case 116:        
            materials[0].opacity = materials[0].opacity == 1.0 ? 0.5 : 1.0;            
            materials[0].transparent = materials[0].opacity == 1.0 ? false : true;
            break;
        // 'x'
        case 120:
            camera.rotation.x += 0.05;
            break;
        // 'y'
        case 121:
            camera.rotation.y += 0.05;
            break;
        // 'z'
        case 122:
            camera.rotation.z += 0.05;
            break;        
        default:
            break;
    }    
});

init();




