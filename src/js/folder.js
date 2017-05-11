var scene, camera, renderer, mesh, controls, percentage, animation_step, dir, animation, rendered;
var rotation_angles = new THREE.Vector3(0,0,0);


var origami_group;

// Array of Origami
var origamis = [];

// for animation
var max_p = 400;
var delay_p = 0.1 * max_p;

// radius of bounding sphere
var radius = 1.0;

var materials = [
  new THREE.MeshPhongMaterial({
    color: 0xB4C4C9,
    specular: 0x050505,
    shininess: 10,
    emssion: 0x666666,
    // map: texture,
    side: THREE.DoubleSide
  }),
  new THREE.MeshBasicMaterial({
    color: 0x333333,
    wireframe: true,
    wireframeLinewidth: 0.1
  }),
  new THREE.MeshPhongMaterial({
    color: 0xaa8fad,
    specular: 0x000000,
    shininess: 0,
    emssion: 0x000000,
    // map: texture,
    side: THREE.DoubleSide
  }),
  new THREE.MeshPhongMaterial({
    color: 0xe8bc84,
    specular: 0x000000,
    shininess: 0,
    emssion: 0x000000,
    // map: texture,
    side: THREE.DoubleSide
  })
];



// init scene, camera, controls, lights, etc
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1e4);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1.0);

  document.body.appendChild(renderer.domElement);


  var ambientLight = new THREE.AmbientLight(0xeeeeee);
  scene.add(ambientLight);

  var lights = [];
  lights[0] = new THREE.DirectionalLight( 0xffffff, 0.2 )
  lights[1] = new THREE.DirectionalLight( 0xffffff, 0.2 )
  lights[2] = new THREE.DirectionalLight( 0xffffff, 0.1 )

  lights[0].position.set(100, 100, 100);
  lights[1].position.set(-100, 100, 100);
  lights[2].position.set(0, 100, -100);

  scene.add(lights[0]);
  scene.add(lights[1]);
  scene.add(lights[2]);

  origami_group = new THREE.Group();
  scene.add(origami_group);


  $( "#help-dialog" ).dialog({ autoOpen: false })
}

// create 3d obj for the given origami and add it the senece 
function addModel(origami) {



  //var texture = THREE.ImageUtils.loadTexture('textures/paper.png'); 

  // instantiate a loader
  // var loader = new THREE.TextureLoader();
  // loader.load('textures/paper.png', function(texture){


  // });  

 

  origami.mesh = new THREE.Mesh(origami.geometry, materials[0].clone());
  origami.edges = new THREE.Mesh(origami.geometry, materials[1].clone());
  // dont' show edges by default
  origami.edges.visible = false;

  if(use_random_color) {
    origami.edges.visible = true;
    var m = origami.mesh.material;
    m.vertexColors = THREE.NoColors;
    m.needsUpdate = true;
    m.color.setRGB(Math.random(), Math.random(), Math.random());
  }

  origami.panels = new THREE.Mesh(origami.geometry_panels, materials[2].clone());
  origami.hinges = new THREE.Mesh(origami.geometry_hinges, materials[3].clone());

  origami.mesh.name = origami.name + '_mesh';
  origami.edges.name = origami.name + '_edges';
  origami.panels.name = origami.name + '_panels';
  origami.hinges.name = origami.name + '_hinges';

  var meshes = [origami.mesh, 
                origami.edges, 
                origami.panels, 
                origami.hinges];

  // model view matrix
  var mvm = new THREE.Matrix4();

  mvm.makeRotationAxis(origami.rotation_axis, origami.rotation_angle);

  for(var i=0;i<meshes.length;++i) {
    var mesh = meshes[i];
    mesh.matrix = mvm.clone();
    mesh.matrixAutoUpdate = false;
    origami_group.add(mesh);
  }

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

  radius = bounding_sphere.radius;

  // scale the model to have R = 1.0
  $.each(origamis, function(index, origami) {
    origami.scale(1.0 / radius);
  });

  updateModels();

  resetCamera();
  resetAnimation();

  if (!rendered) render();
}

function getThickness() {
  return parseFloat($("#input-thickness").val()) / radius || 0.0
}

function loadModel(model_url, traj_url, callback) {
  var origami = new Origami.Model();

  // put in the array
  origamis.push(origami);

  origami.load(model_url, traj_url, function() {

    origami.loaded = true;
    origami.foldTo(origami.goal_cfg);

    addModel(origami);

    origami.setThickness(getThickness());

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
  camera.position.z = 5;
  camera.position.x = 5;
  camera.position.y = 2;
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
  if(!origami_group) return;

  origami_group.traverse(function(obj){
    if(obj.geometry) obj.geometry.dispose();
  });

  scene.remove(origami_group);

  // clear the array
  origamis = [];

  origami_group = new THREE.Group();
  scene.add(origami_group);
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

function onKey(event){
  var y = String.fromCharCode(event.charCode);

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
      config.randomColor = !config.randomColor;
      config.pathColor = false;
      updateColor();
      break;
    case 67: // color for the path, red to blue
      config.pathColor = true;
      config.randomColor = false;
      updateColor();
      break;

    case 112:
      config.showPanel = !config.showPanel;
      updatePanels();
      break;
    case 104:
      config.showHinge = !config.showHinge;
      updateHinges();
      break;
      // 'e'
    case 101:
      config.showEdge = !config.showEdge;
      updateEdges();
      break;
      // 't'
    case 116:
      config.transparent = !config.transparent;
      updateTransparency();
      break;
      // 'X' or 'x'
    case 88:
    case 120:
      rotateModels(new THREE.Vector3(1,0,0), event.charCode==88?0.05:-0.05);
      break;
      // 'y'
    case 89:
    case 121:
      rotateModels(new THREE.Vector3(0,1,0), event.charCode==89?0.05:-0.05);
      break;
      // 'z'
    case 90:
    case 122:
      rotateModels(new THREE.Vector3(0,0,1), event.charCode==90?0.05:-0.05);
      break;

    // ? or /
    case 63:
    case 47:
      showHelp();
      break;


    default:
      break;
  }
}

function showHelp() {
  $( "#help-dialog" ).dialog( "open" );
}

function updateColor() {
  if(config.pathColor) {
    $.each(origamis, function(index, origami) {
      var m = origami.mesh.material;
      m.color.setHex(0xffffff);
      m.vertexColors = THREE.FaceColors;
      m.needsUpdate = true;
      var geo = origami.mesh.geometry;
      var faces = geo.faces;
      var l = origami.ordered_face_ids.length;
      for(var i = 0; i<l; i+=2) {
        for(var p=0;p<=1;++p) {
          var fid = origami.ordered_face_ids[i+p];
          var c = _interpolateColor(i*1.0 / l);
          var r = c[0] / 255.0;
          var g = c[1] / 255.0;
          var b = c[2] / 255.0;
          faces[fid].color.setRGB(r,g,b); // front face
          faces[fid+l].color.setRGB(r,g,b); // back face
          for(var j=0;j<6;++j)
            faces[fid*6+2*l+j].color.setRGB(r,g,b); // side faces
        }
      }
      geo.colorsNeedUpdate = true;
      console.log(geo);
    });
  } else {
    $.each(origamis, function(index, origami) {
        var m = origami.mesh.material;
        m.vertexColors = THREE.NoColors;
        m.needsUpdate = true;
        if (config.randomColor)
          m.color.setRGB(Math.random(), Math.random(), Math.random());
        else
          m.color.setHex(0xB4C4C9);
    });
  }
}

function updateHinges() {
  $.each(origamis, function(index, origami) {
    origami.hinges.visible = config.showHinge;
  });
}

function updatePanels() {
  $.each(origamis, function(index, origami) {
    origami.panels.visible = config.showPanel;
  });
}

function updateEdges() {
  $.each(origamis, function(index, origami) {
    origami.edges.visible = config.showEdge;
  });
}

function updateTransparency() {
  $.each(origamis, function(index, origami) {
    var m = origami.mesh.material;
    m.opacity = config.transparent ? 0.5 : 1.0;
    m.transparent = config.transparent;
  });
}

function updateModels() {
  updateColor();
  updateHinges();
  updateEdges();
  updateTransparency();  
}

// axis is a unit vector, e.g. [0, 1, 0]
function rotateModels(axis, rad) {
  if(!origami_group) return;
  origami_group.rotateOnAxis(axis, rad).updateMatrix();
}


$(document).keypress(onKey);


// States
var config = {
  showEdge : true,
  showHinge : false,
  showPanel : false,
  randomColor: true,
  pathColor: false,
  transparent: false
};

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
var use_random_color = getParameterByName("rc") || false;

// override default settings for thick origamis
if(init_thickness > 0) {
  config.randomColor = false;
  config.showPanel = true;
  config.showHinge = true;
  config.showEdge = false;
}

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
    var t = getThickness();
    $.each(origamis, function(index, origami) {
      origami.setThickness(t);
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

  removeModel();

  // 2/26/2017 Only support ori files
  var ori_files = [];

  for(var i=0;i<files.length;++i) {
    if(files[i].name.endsWith('.ori')) ori_files.push(files[i]);
  }

  console.log(ori_files.length);

  var count = 0;

  for(var i=0;i<ori_files.length;++i) {
    var file = ori_files[i];
    var loader = new Origami.ORILoader()
    loader.load(file, function(obj) {
      
      var origami = new Origami.Model();
      origami.setThickness(getThickness());
      origami.build(obj);
      origami.loaded = true;
      origami.foldTo(origami.goal_cfg);
      
      // put in the array
      origamis.push(origami);

      addModel(origami);
      console.log(origami.name + ' loaded!');

      if(++count == ori_files.length) {
        // reset scene, rescale
        resetScene();
        $("#title").html(app_name + " - " + file.name)
          .css("left", ($(document).width() - $("#title").width()) / 2);
      }
    });
  }



  // // only read the first file
  // var file = files[0];
  // var loader = null;
  // var is_model_file = false;
  // var is_traj_file = false
  // if (file.name.endsWith('.json')) {
  //   loader = new Origami.JSONLoader();
  //   is_model_file = true;
  //   //TODO check file type...
  // } else if (file.name.endsWith('.ori')) {
  //   loader = new Origami.ORILoader();
  //   is_model_file = true;
  // } else if (file.name.endsWith('.trj')) {
  //   loader = new Origami.TRJLoader();
  //   is_traj_file = true;
  // } else {
  //   return;
  // }
  // if (is_model_file) {
  //   loader.load(file, function(obj) {
  //     removeModel();
  //     var origami = new Origami.Model();
  //     origami.setThickness(getThickness());
  //     origami.build(obj);
  //     origami.loaded = true;
  //     origami.foldTo(origami.goal_cfg);
  //     // put in the array
  //     origamis.push(origami);

  //     addModel(origami);
  //     console.log(origami.name + ' loaded!');
  //     // reset scene, rescale
  //     resetScene();
  //     $("#title").html(app_name + " - " + file.name)
  //       .css("left", ($(document).width() - $("#title").width()) / 2);
  //   });
  // }
  // if (is_traj_file) {
  //   loader.load(file, function(obj) {
  //     // assuming the first model
  //     // set path ...
  //     origamis[0].setFoldingPath(obj.trajs);
  //   });
  // }

});