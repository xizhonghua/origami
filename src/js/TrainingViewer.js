if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var canvas;
var scenes = [], renderer;

var origamis = [];

function init() {
	canvas = document.getElementById( "c" );

    resetScene();

	renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
	renderer.setClearColor( 0xffffff, 1 );
	renderer.setPixelRatio( window.devicePixelRatio );
}


// create 3d obj for the given origami and add it the sence
function addModel(scene, origami) {

    //var texture = THREE.ImageUtils.loadTexture('textures/paper.png');

    // instantiate a loader
    // var loader = new THREE.TextureLoader();
    // loader.load('textures/paper.png', function(texture){


    // });

    var materials = [
        new THREE.MeshPhongMaterial({
            color: 0x996633,
            specular: 0x050505,
            shininess: 10,
            emssion: 0x666666,
            // map: texture,
            side: THREE.DoubleSide
        }),
        new THREE.MeshBasicMaterial({
            color: 0x000000,
            wireframe: true,
            wireframeLinewidth: 0.4
        })
    ];

    origami.mesh = new THREE.Mesh(origami.geometry, materials[0]);
    origami.edges = new THREE.Mesh(origami.geometry, materials[1]);
    origami.mesh.name = origami.name + '_mesh';
    origami.edges.name = origami.name + '_edges';

    // model view matrix
    var mvm = new THREE.Matrix4();

    //mvm.setPosition(origami.translation);
    mvm.makeRotationAxis(origami.rotation_axis, origami.rotation_angle);
    //mvm.setPosition(origami.translation);

    origami.mesh.matrix = mvm.clone();
    origami.edges.matrix = mvm.clone();
    origami.mesh.matrixAutoUpdate = false;
    origami.edges.matrixAutoUpdate = false;
    // origami.mesh.position = origami.translation.clone();
    // origami.edges.position = origami.translation.clone();

    scene.add(origami.mesh);
    scene.add(origami.edges);
}

function resetScene() {

	var template = document.getElementById( "template" ).text;
	var content = document.getElementById( "content" );
    // compute COM and R on entire model...
    $.each(origamis, function(index, origami) {

        origami.foldToPercentage(1.0);
        var bounding_sphere = new THREE.Sphere();
        bounding_sphere.setFromPoints(origami.i_vertices);

        console.log(bounding_sphere);

        var rad = bounding_sphere.radius;
        var center = bounding_sphere.center;

        // scale the model to have R = 1.0

        origami.translate(center.negate());
        origami.scale(0.3 / rad);

		var scene = new THREE.Scene();
		// make a list item
		var element = document.createElement( "div" );
		element.className = "list-item";
		element.innerHTML = template.replace( '$', index + 1 );
		// Look up the element that represents the area
		// we want to render the scene
		scene.userData.element = element.querySelector( ".scene" );
		content.appendChild( element );
		var camera = new THREE.PerspectiveCamera( 50, 1, 1, 10 );
		camera.position.z = 2;
		scene.userData.camera = camera;
		var controls = new THREE.OrbitControls( scene.userData.camera, scene.userData.element );
		controls.minDistance = 2;
		controls.maxDistance = 5;
		controls.enablePan = false;
		controls.enableZoom = false;
		scene.userData.controls = controls;
		// add one random mesh to each scene

		//scene.add( new THREE.Mesh( geometry, material ) );
        addModel(scene, origami);

        var ambientLight = new THREE.AmbientLight(0xeeeeee);
        scene.add(ambientLight);

        var lights = [];
        lights[0] = new THREE.PointLight(0xffffff, 0.5, 0);
        lights[1] = new THREE.PointLight(0xffffff, 0.5, 0);
        lights[2] = new THREE.PointLight(0xffffff, 0.5, 0);

        lights[0].position.set(100, 100, 100);
        lights[1].position.set(-100, 100, 100);
        lights[2].position.set(0, 100, -100);

        scene.add(lights[0]);
        scene.add(lights[1]);
        scene.add(lights[2]);

		scenes.push( scene );
    });
    resetAnimation();
    //render();
}

function removeModel() {
    // remove each origami model from scene
    scenes = [];
    // clear the array
    origamis = [];

    $(".list-item").remove();
}

function loadModel(model_url, traj_url, callback) {
    var origami = new Origami.Model();

    //origami.setThickness(getThickness());

    // put in the array
    origamis.push(origami);

    origami.load(model_url, traj_url, function() {

        origami.loaded = true;
        origami.foldTo(origami.goal_cfg);

        console.log(origami.name + ' loaded!');

        if (callback) callback();
    });
}

// clear scene
// read all given models
function loadModels(models, callback) {
    // first remove existing model
    removeModel();

    var count = 0;

    var loaded_handler = function() {
        // all loaded
        if (++count == models.length) {

            // reset scene
            resetScene();

            if (callback) callback();
        }
    };

    // load each model
    $.each(models, function(index, model) {
        loadModel(model.model_url, model.traj_url, loaded_handler)
    });
}

// for animation
var max_p = 400;
var delay_p = 0.1 * max_p;

var percentage, animation_step, dir, animation, rendered;

function resetAnimation() {
    animation_step = 1;

    dir = 1;

    percentage = 0.0;

    animation = true;
}

function animate() {

	render();
	requestAnimationFrame( animate );

}

function render() {
	updateSize();
	renderer.setClearColor( 0xffffff );
	renderer.setScissorTest( false );
	renderer.clear();
	renderer.setClearColor( 0xe0e0e0 );
	renderer.setScissorTest( true );
	scenes.forEach( function( scene, index ) {
		// so something moves
		// get the element that is a place holder for where we want to
		// draw the scene
		var element = scene.userData.element;
		// get its position relative to the page's viewport
		var rect = element.getBoundingClientRect();
		// check if it's offscreen. If so skip it
		if ( rect.bottom < 0 || rect.top  > renderer.domElement.clientHeight ||
			 rect.right  < 0 || rect.left > renderer.domElement.clientWidth ) {
			return;  // it's off screen
		}


        var ori = origamis[index];

        if (animation) {
            var p_count = ((Date.now()/10) % (max_p*2));

            if (p_count > max_p) {
                percentage = max_p*2 - p_count;
            } else {
                percentage = p_count;
            }
        }

        percentage = percentage / (max_p) * 1.2 - 0.1;

        ori.foldToPercentage(percentage);

		// set the viewport
		var width  = rect.right - rect.left;
		var height = rect.bottom - rect.top;
		var left   = rect.left;
		var bottom = renderer.domElement.clientHeight - rect.bottom;
		renderer.setViewport( left, bottom, width, height );
		renderer.setScissor( left, bottom, width, height );
		var camera = scene.userData.camera;
		//camera.aspect = width / height; // not changing in this example
		//camera.updateProjectionMatrix();
		//scene.userData.controls.update();
		renderer.render( scene, camera );
	} );
}



var app_name = 'Origami Folder';
$('div[source]').each(function(index) {
    $(this).load($(this).attr('source'));
});

// by default use github as CDN
var use_cdn = (getParameterByName("cdn") == "0") ? false : true;
var cdn_prefix = 'https://cdn.rawgit.com/xizhonghua/origami/master/src/';
//var init_thickness = parseFloat(getParameterByName("thickness")) || 0.0;

//$("#input-thickness").val(init_thickness);

function updateSize() {
	var width = canvas.clientWidth;
	var height = canvas.clientHeight;
	if ( canvas.width !== width || canvas.height != height ) {
		renderer.setSize( width, height, false );
	}
}

// drag and drop
$("html").on("dragover", function(event) {
    event.preventDefault();
    event.stopPropagation();
});

$("html").on("dragleave", function(event) {
    event.preventDefault();
    event.stopPropagation();
});

var oriFiles = {};
var valueFiles = {};

$("html").on("drop", function(event) {
    event.preventDefault();
    event.stopPropagation();
    var items = event.originalEvent.dataTransfer.items;
    //var files = event.originalEvent.dataTransfer.files;

    var item = items[0];
    var entry = item.webkitGetAsEntry();
    if (entry.isDirectory) {

        readDirectory(entry, function() {
            //console.log("ori files == "+ oriFiles["1"].length);
            //console.log("value files == "+ valueFiles["1"].length);
            //loadOris(entries);
            $("#generation-selector").empty();
            var gen_selector = document.getElementById("generation-selector");
            for (var key in oriFiles) {
                var option = document.createElement("option");
                option.text = key;
                gen_selector.add(option);
            }
            $('#generation-selector option:first-child').attr("selected", "selected").change();
        });

    }

});

$('#generation-selector').on('change', function (e) {
    var optionSelected = $("option:selected", this);
    var oriFilesSelected = oriFiles[this.value];
    loadOris(oriFilesSelected);
});


function readDirectory(dirEntry, callback) {
    var dirReader = dirEntry.createReader();
    var entries = [];

    oriFiles = {};
    valueFiles = {};

  // Call the reader.readEntries() until no more results are returned.
    var readEntries = function() {
        dirReader.readEntries (function(results) {
            if (!results.length) {
                callback();
            } else {
                var count = 0;
                results.forEach(function(file_entry) {
                    file_entry.file(function(file) {
                        var filename = file.name;
                        if(filename.endsWith('.ori')){
                            var gen = filename.replace(/params_(\d+)_i_\d+.ori/,"$1");
                            if(gen !== filename) {
                                if(!oriFiles[gen]) {
                                    oriFiles[gen] = [];
                                    //console.log("gen = "+gen);
                                }
                                oriFiles[gen].push(file);
                            }
                            //entries.push(file);
                        } else if(filename.endsWith('.txt')){
                            var gen = filename.replace(/value_(\d+)_i_\d+.txt/,"$1");
                            if(gen !== filename) {
                                if(!valueFiles[gen]) {
                                    valueFiles[gen] = [];
                                }
                                valueFiles[gen].push(file);
                            }
                        }
                        //entries ///= entries.concat(toArray(results));
                        if(++count == results.length) {
                            readEntries();
                        }
                    });
                });
            }
        });
    };

    readEntries(); // Start reading dirs.
}

function loadOris(files) {
    removeModel();
    var count = 0;

    var loaded_handler = function() {
        if(++count == files.length) {
            resetScene();
        }
    };

    $.each(files, function(index, file) {
        //console.log(file.prototype.toString);
        loadOri(file, loaded_handler)
    });
}

function loadOri(file, callback) {
    var loader = new Origami.ORILoader();
    console.log(file.name);
    loader.load(file, function(obj) {

        var origami = new Origami.Model();
        //origami.setThickness(getThickness());
        origami.build(obj);
        origami.loaded = true;
        origami.foldTo(origami.goal_cfg);
        // put in the array
        origamis.push(origami);

        console.log(origami.name + ' loaded!');
        if (callback) callback();
    });
}

$.getJSON("models/model-list.json", function(data, textStatus) {

    for (var i = 0; i < data.models.length; ++i) {
        var model = data.models[i];
        if (use_cdn) {
            model.model_url = cdn_prefix + model.model_url;
            if (model.traj_url)
                model.traj_url = cdn_prefix + model.traj_url;
        }
        var selector_id = model.type == 'rigid' ? '#model-selector-cp' : "#model-selector-net";
        $("<option></option>").attr({
            "components": JSON.stringify(model.components),
            "model-name": model.name,
            "value": model.name
        }).html(model.name).appendTo(selector_id);
    }
    $(".model-selector").change(function() {
        var $option = $(this).find("option:selected");
        model_name = $option.attr("model-name");
        components = JSON.parse($option.attr("components"));
        loadModels(components, function() {
            $("#title").html(app_name + " - " + model_name)
                .css("left", ($(document).width() - $("#title").width()) / 2);
        });
        $("#title").html(app_name + " - loading...");
        $(this).blur();
    });
    var model_name = getParameterByName("name");
    if (model_name) {
        $('.model-selector option[value="' + model_name + '"]').attr("selected", "selected").change();
    } else {
        // // load the first model
        $('#model-selector-net option:first-child').attr("selected", "selected").change();
    }
});


init();
animate();

