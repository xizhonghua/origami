var scene, camera, renderer, mesh, controls, percentage, animation_step, dir, animation, rendered;

var origamis = [];

// for animation
var max_p = 400;
var delay_p = 0.1 * max_p;

// init scene, camera, controls, lights, etc
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 1e6);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1.0);

  document.body.appendChild(renderer.domElement);


  var ambientLight = new THREE.AmbientLight(0xcccccc);
  scene.add(ambientLight);

  var lights = [];
  lights[0] = new THREE.PointLight(0xffffff, 0.5, 0);
  lights[1] = new THREE.PointLight(0xffffff, 0.5, 0);
  lights[2] = new THREE.PointLight(0xffffff, 0.5, 0);

  lights[0].position.set(0, 200, 100);
  lights[1].position.set(100, 100, 100);
  lights[2].position.set(-100, -100, -100);

  scene.add(lights[0]);
  scene.add(lights[1]);
  scene.add(lights[2]);
}

// create 3d obj for the given origami and add it the senece 
function addModel(origami) {

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
      emssion: 0x333333,
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

function resetAnimation() {
  animation_step = 1;

  dir = 1;

  percentage = 0.0;

  animation = true;
}

function resetScene() {
  // compute COM and R on entire model...
  var all_vertices = [];

  $.each(origamis, function(index, origami) {
    all_vertices.push.apply(all_vertices, origami.vertices);
  });

  var bounding_sphere = new THREE.Sphere();
  bounding_sphere.setFromPoints(all_vertices);

  console.log(bounding_sphere);

  // scale the model to have R = 1.0
  $.each(origamis, function(index, origami) {
    origami.scale(1.0 / bounding_sphere.radius);
  });

  resetCamera();
  resetAnimation();

  if (!rendered) render();
}

function getThickness() {
  return parseFloat($("#input-thickness").val()) || 0.0
}

function loadModel(model_url, traj_url, callback) {
  var origami = new Origami.Model();

  origami.setThickness(getThickness());

  // put in the array
  origamis.push(origami);

  origami.load(model_url, traj_url, function() {

    origami.loaded = true;
    origami.foldTo(origami.goal_cfg);

    addModel(origami);

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

function resetCamera() {
  camera.position.z = 3;
  camera.position.x = 0;
  camera.position.y = 0;
  camera.rotation.set(0, 0, 0);

  if (controls) controls.removeEventListener('change', render);

  // control
  controls = new THREE.TrackballControls(camera, renderer.domElement);

  controls.rotateSpeed = 5.0;
  controls.zoomSpeed = 1.5;
  controls.panSpeed = 0.8;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  controls.keys = [65, 83, 68];

  controls.addEventListener('change', render);
}

function removeModel() {
  // remove each origami model from scene
  $.each(origamis, function(index, ori) {
    var mesh = scene.getObjectByName(ori.name + '_mesh');
    var edges = scene.getObjectByName(ori.name + '_edges');

    // prevent memory leak
    if (mesh) mesh.geometry.dispose();
    if (edges) edges.geometry.dispose();

    scene.remove(mesh);
    scene.remove(edges);

    ori.mesh = null;
    ori.edges = null;
  });

  // clear the array
  origamis = [];
}

function animate() {

  requestAnimationFrame(animate);

  if (controls) controls.update();

  if (animation) {
    percentage += dir * animation_step;

    if (percentage > max_p + delay_p) {
      dir = -1;
    } else if (percentage < -delay_p) {
      dir = 1;
    }
  }

  $.each(origamis, function(index, ori) {
    ori.foldToPercentage(percentage / max_p);
  });

  render();
}

function render() {
  rendered = true;

  renderer.render(scene, camera);
}

$(window).resize(function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

$(document).keypress(function(event) {

  console.log(event.charCode);

  switch (event.charCode) {

    //space
    case 32:
      animation = !animation;
      break;
      // ','    
    case 44:
      percentage = Math.min(max_p, percentage + 3 * animation_step);
      animation = false;
      break;
      // '.'
    case 46:
      percentage = Math.max(0, percentage - 3 * animation_step);
      animation = false;
      break;
      // '[' : faster
    case 91:
      animation_step = animation_step * 1.4;
      animation_step = Math.min(animation_step, 30);
      break;
      // ']' : slower
    case 93:
      animation_step = animation_step / 1.4;
      animation_step = Math.max(animation_step, 0.1);
      break;
      // 'c': random colors
    case 99:
      $.each(origamis, function(index, origami) {
        var m = origami.mesh.material;
        if (m.color.getHex() == 0x996633)
          m.color.setRGB(Math.random(), Math.random(), Math.random());
        else
          m.color.setHex(0x996633);
      });
      break;
      // 'e'
    case 101:
      $.each(origamis, function(index, origami) {
        origami.edges.visible = !origami.edges.visible;
      });
      break;
      // 't'
    case 116:
      $.each(origamis, function(index, origami) {
        var m = origami.mesh.material;
        m.opacity = m.opacity == 1.0 ? 0.5 : 1.0;
        m.transparent = m.opacity == 1.0 ? false : true;
      })

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
animate();


var app_name = 'Origami Folder';
$('div[source]').each(function(index) {
  $(this).load($(this).attr('source'));
});

// by default use github as CDN
var use_cdn = (getParameterByName("cdn") == "0") ? false : true;
var cdn_prefix = 'https://cdn.rawgit.com/xizhonghua/origami/master/src/';
var init_thickness = parseFloat(getParameterByName("thickness")) || 0.0;

$("#input-thickness").val(init_thickness);

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

$("#input-thickness").keypress(function(e){
  if(e.charCode == 13) {
    var thickness = parseFloat($(this).val());
    $.each(origamis, function(index, origami) {
      origami.setThickness(thickness);
    });
    $(this).blur();
  }
})

// drag and drop
$("html").on("dragover", function(event) {
  event.preventDefault();
  event.stopPropagation();
});

$("html").on("dragleave", function(event) {
  event.preventDefault();
  event.stopPropagation();
});

$("html").on("drop", function(event) {
  event.preventDefault();
  event.stopPropagation();
  var files = event.originalEvent.dataTransfer.files;
  if (!files) return;
  // only read the first file
  var file = files[0];
  var loader = null;
  var is_model_file = false;
  var is_traj_file = false
  if (file.name.endsWith('.json')) {
    loader = new Origami.JSONLoader();
    is_model_file = true;
    //TODO check file type...
  } else if (file.name.endsWith('.ori')) {
    loader = new Origami.ORILoader();
    is_model_file = true;
  } else if (file.name.endsWith('.trj')) {
    loader = new Origami.TRJLoader();
    is_traj_file = true;
  } else {
    return;
  }
  if (is_model_file) {
    loader.load(file, function(obj) {
      removeModel();
      var origami = new Origami.Model();
      origami.setThickness(getThickness());
      origami.build(obj);
      origami.loaded = true;
      origami.foldTo(origami.goal_cfg);
      // put in the array
      origamis.push(origami);

      addModel(origami);
      console.log(origami.name + ' loaded!');
      // reset scene, rescale
      resetScene();
      $("#title").html(app_name + " - " + file.name)
        .css("left", ($(document).width() - $("#title").width()) / 2);
    });
  }
  if (is_traj_file) {
    loader.load(file, function(obj) {
      // set path ...
      origami.setFoldingPath(obj.trajs);
    });
  }

});