// requires:
//  jQuery
//  Three.js
//  js/extension.js
//  js/svg/jquery.svg.min.js

// namespace
var Origami = Origami || {};
Origami.Id = 0;

// crease class
Origami.Crease = function(model, cid, vid1, vid2, folding_angle, fid, pid) {

  // parent model
  this.model = model;

  // crease id
  this.cid = cid;

  // vetex indices
  this.vid1 = vid1;
  this.vid2 = vid2;

  // folding angle
  this.folding_angle = folding_angle;

  // face id
  this.fid = fid;

  // parent face id
  this.pid = pid;

  // PI - init dihergal angle
  this.init_angle = 0;
}

// Compute the folding angle
Origami.Crease.prototype.computeFoldingAngle = function() {
  var v1 = this.model.i_vertices[this.vid1];
  var v2 = this.model.i_vertices[this.vid2];

  var f1 = this.model.faces[this.pid];
  var f2 = this.model.faces[this.fid];

  var n1 = f1.computeNormal();
  var n2 = f2.computeNormal();

  var dot = n1.dot(n2);
  dot = Math.max(-1, Math.min(1, dot));
  var alpha = Math.acos(dot);

  var c1 = f1.computeCOM();
  var c2 = f2.computeCOM();
  var w = c1.clone().sub(c2);

  var dot2 = w.dot(n2);

  var SMALL_NUMBER = 0.01;

  if (Math.abs(alpha) < SMALL_NUMBER) {
    alpha = 0.0;
  } else if (dot2 > 0) {
    alpha = -alpha;
  }

  // we can tell it's mountain or valley when rotated 180 around a crease
  if (Math.abs(Math.abs(alpha) - Math.PI) < SMALL_NUMBER) {
    alpha = Math.PI;
    if (dot2 > 0)
      alpha = -Math.PI;
  }

  return alpha;
}

// face class
Origami.Face = function(model, fid, vid1, vid2, vid3, pid, cid) {

  // parent model
  this.model = model;

  // face id
  this.fid = fid;

  // verter indices
  this.vids = [vid1, vid2, vid3];

  // parent face id
  this.pid = pid;

  // crease id
  this.cid = cid;
}

// index = 0, 1, 2
Origami.Face.prototype.getVertexByIndex = function(index) {
  return this.model.i_vertices[this.fid*3 + index];
}

// i_vertices
Origami.Face.prototype.getVertex = function(vid) {
  for(var i=0;i<3;++i)
    if(vid === this.vids[i]) return this.getVertexByIndex(i);
  return null;
}

// Compute the normal using i_vertices
Origami.Face.prototype.computeNormal = function() {
  var e1 = this.getVertexByIndex(1).clone().sub(this.getVertexByIndex(0));
  var e2 = this.getVertexByIndex(2).clone().sub(this.getVertexByIndex(0));
  var n = e1.clone().cross(e2).normalize();
  return n;
}

// Get center of the face, return THREE.vector3
Origami.Face.prototype.computeCOM = function() {
  var v0 = this.getVertexByIndex(0);
  var v1 = this.getVertexByIndex(1);
  var v2 = this.getVertexByIndex(2);

  var c = v0.clone().add(v1).add(v2);
  return c.divideScalar(3);
}

// model class
Origami.Model = function() {
  this.name = 'Origami_' + (++Origami.Id);

  // flat vertices, array of THREE.vector3
  this.flat_vertices = [];

  // folded vertices, array of THREE.vector3
  this.vertices = [];

  // folded vertices, array of THREE.vertor3.
  // each face has tree vertices.
  this.i_vertices = [];

  // faces, array of Origami.Face
  this.faces = [];

  //  creases, array of Origami.Crease
  this.creases = [];

  // array of array of folding angles
  this.folding_path = [];

  // the parent face ids
  this.parent_face_ids = [];

  // base face id
  this.base_face_id = 0;

  // ordered face list
  this.ordered_face_ids = [];

  // rotation matrix
  this.rotation_axis = new THREE.Vector3(0, 1, 0);

  // rotation angle
  this.rotation_angle = 0.0;

  // translation
  this.translation = new THREE.Vector3(0, 0, 0);

  // start and goal cfg
  this.start_cfg = [];
  this.goal_cfg = [];

  // three js geometry
  this.geometry = null;

  // whether the model is loaded or not
  this.loaded = false;

  // current cfg
  this.cur_cfg = [];

  // svg_cfg
  this.svg_cfg = {};

  // thickness of the model
  this.thickness = 0.0;
}

Origami.JSONLoader = function() {}

Origami.JSONLoader.prototype.load = function(file, callback) {
  var reader = new FileReader();

  reader.onload = function(e) {
    var text = reader.result;
    var obj = $.parseJSON(text);

    if (callback) callback(obj);
  }

  reader.readAsText(file, 'UTF-8');
}

Origami.ORILoader = function() {}

// requires io.js
// parse string to obj
Origami.ORILoader.prototype.parse = function(ori_str) {
  var lines = ori_str.split('\n');

  var sr = new Origami.StreamReader(lines);

  var obj = {
    vertices: [],
    creases: [],
    faces: [],
    base_face_id: -1,
    ordered_face_ids: []
  }

  var vsize = sr.readlineInt();

  for (var i = 0; i < vsize; ++i)
    obj.vertices.push(sr.readlineFloatArray());

  var csize = sr.readlineInt();

  for (var i = 0; i < csize; ++i)
    obj.creases.push(sr.readlineFloatArray());

  var fsize = sr.readlineInt();
  for (var i = 0; i < fsize; ++i)
    obj.faces.push(sr.readlineIntArray());

  obj.base_face_id = sr.readlineInt();

  obj.ordered_face_ids = sr.readIntArray(fsize);

  if (!sr.eof()) {
    var rotation = sr.readlineFloatArray();
    if (rotation.length >= 4) {
      var translation = sr.readlineFloatArray();
      if (translation.length >= 3) {
        //both rotation and translation exists
        obj.rotation = rotation
        obj.translation = translation;
      }
    }
  }

  return obj;
}

Origami.ORILoader.prototype.load = function(file, callback) {
  var reader = new FileReader();
  var self = this;

  reader.onload = function(e) {
    var text = reader.result;
    var obj = self.parse(text);
    callback(obj);
  }

  reader.readAsText(file, 'UTF-8');
}

Origami.TRJLoader = function() {}

Origami.TRJLoader.prototype.parse = function(trj_str) {
    var lines = trj_str.split('\n');

    var sr = new Origami.StreamReader(lines);

    var obj = {
      trajs: []
    };

    while (!sr.eof()) {
      // read a line as a state
      var traj = sr.readlineFloatArray();
      traj = traj.map(function(x) {
        return x * Math.PI / 180.0; });
      // check dof of the trajectoy
      if (obj.trajs.length > 0 && traj.length != obj.trajs[obj.trajs.length - 1].length) continue;
      obj.trajs.push(traj);
    }

    return obj;
  }
  // requires io.js
Origami.TRJLoader.prototype.load = function(file, callback) {
  var reader = new FileReader();
  var self = this;

  reader.onload = function(e) {
    var text = reader.result;

    var obj = self.parse(text);

    if (callback) callback(obj);
  }

  reader.readAsText(file, 'UTF-8');
}


Origami.Model.prototype.load = function(model_url, traj_url, callback) {
  var me = this;

  this.loaded = false;

  var my_callback = function() {
    me.loaded = true;
    if (callback) callback(me);
  }

  var load_traj = function() {
    // check trajectory file
    if (traj_url == null || traj_url.length == 0) {
      my_callback(me);
    } else {
      if (traj_url.endsWith('.json')) {
        $.getJSON(traj_url, function(data, textStatus) {

          console.log("traj = " + traj_url + " loaded!");

          me.setFoldingPath(data.trajs);
          my_callback(me);
        });
      } else if (traj_url.endsWith('.trj')) {
        $.get(traj_url, function(traj_str, textStatus) {
          var data = new Origami.TRJLoader().parse(traj_str);

          console.log("traj = " + traj_url + " loaded!");

          me.setFoldingPath(data.trajs);
          my_callback(me);
        });
      }
    }
  }

  console.log('loading origami model from ' + model_url + '...');

  if (model_url.endsWith('.json')) {
    // json version
    $.getJSON(model_url, function(model, textStatus) {

      console.log("model = " + model_url + " loaded!");

      // build the model
      me.build(model);

      load_traj();
    });
  } else if (model_url.endsWith('.ori')) {
    // ori version
    $.get(model_url, function(ori_str, textStatus) {

      console.log("model = " + model_url + " loaded!");

      var ori_loader = new Origami.ORILoader();
      var model = ori_loader.parse(ori_str);

      // build the model
      me.build(model);

      load_traj();
    });
  }
}

// build the origami model from data in string
Origami.Model.prototype.build = function(model) {
  // body...
  console.log('building origami model...');

  // bace face
  this.base_face_id = model.base_face_id;

  this.vertices = [];
  this.flat_vertices = [];

  // building vertices
  for (var i = 0; i < model.vertices.length; ++i) {
    var v = model.vertices[i];

    var vertex = new THREE.Vector3(v[0], v[1], v[2]);

    this.vertices.push(vertex);

    // this.flat_vertices is a deep copy of this.vertices
    this.flat_vertices.push(vertex.clone());
  }

  this.faces = [];

  // building faces
  for (var i = 0; i < model.faces.length; ++i) {
    var f = model.faces[i];

    var face = new Origami.Face(this, i, f[1], f[2], f[3], f[4], f[5]);

    this.faces.push(face);
  }

  this.creases = [];

  //building creases
  for (var i = 0; i < model.creases.length; ++i) {
    var c = model.creases[i];

    var crease = new Origami.Crease(this, i, c[0], c[1], c[2], c[3], c[4]);

    this.creases.push(crease);
  }

  this.ordered_face_ids = model.ordered_face_ids;

  // rotation and translation
  if (model.rotation && model.rotation.length >= 4) {
    this.rotation_axis = new THREE.Vector3(model.rotation[0], model.rotation[1], model.rotation[2]);
    this.rotation_axis.normalize();
    this.rotation_angle = model.rotation[3];
  }

  if (model.translation && model.translation.length >= 3) {
    this.translation = new THREE.Vector3(model.translation[0], model.translation[1], model.translation[2]);
  }

  // translate the model first
  this.translate(this.translation);

  // set start and goal status

  this.start_cfg = [];
  this.goal_cfg = [];

  for (var i = 0; i < this.creases.length; ++i) {
    this.start_cfg.push(0);
    this.goal_cfg.push(this.creases[i].folding_angle);
  }


  // create idependent vertices, font-faces
  for(var i=0;i<this.faces.length; ++i) {
    var face = this.faces[i];
    for(var j=0;j<3;++j) {
      this.i_vertices.push(this.vertices[face.vids[j]].clone());
    }
  }

  // create idependent vertices, back-faces
  for(var i=0;i<this.faces.length; ++i) {
    var face = this.faces[i];
    for(var j=0;j<3;++j) {
      this.i_vertices.push(this.vertices[face.vids[j]].clone());
    }
  }

  this.cur_cfg = this.start_cfg.clone();

  this.buildThreeGeometry();

  console.log('built!');

  this.foldToPercentage(0);

  console.log('fold to start');

  for(var i=0;i<this.creases.length;++i) {
    var c = this.creases[i];
    c.init_angle = c.computeFoldingAngle();
    console.log("init folding angle c" + i + " " + c.init_angle)
  }
};

Origami.Model.prototype.buildThreeGeometry = function() {

  // build Threejs geometry object

  this.geometry = new THREE.Geometry();

  // same pointer
  this.geometry.vertices = this.i_vertices;
  // this.vertices;
  // this.geometry.vertices = this.vertices;

  this.geometry.faces = [];


  // front faces
  for (var i = 0; i < this.faces.length; ++i) {
    this.geometry.faces.push(new THREE.Face3(i*3, i*3+1, i*3+2));
  }

  // back faces
  for (var i = 0; i < this.faces.length; ++i) {
    var index_offset = (this.faces.length + i) * 3;
    this.geometry.faces.push(new THREE.Face3(index_offset+2, index_offset+1, index_offset));
  }

  // 6 side faces  
  for (var i = 0; i < this.faces.length; ++i) {
    // top face index
    var o1 = i*3; 
    // bottom face index
    var o2 = (this.faces.length + i) * 3;

    this.geometry.faces.push(new THREE.Face3(o1, o2, o2+1));
    this.geometry.faces.push(new THREE.Face3(o1, o2+1, o1+1));

    this.geometry.faces.push(new THREE.Face3(o1+1, o2+1, o2+2));
    this.geometry.faces.push(new THREE.Face3(o1+1, o2+2, o1+2));

    this.geometry.faces.push(new THREE.Face3(o1+2, o2+2, o2));
    this.geometry.faces.push(new THREE.Face3(o1+2, o2, o1));
  }  



  this.geometry.computeBoundingBox();

  this.updateGeometry();
}

Origami.Model.prototype.translate = function(v) {
  for (var i = 0; i < this.vertices.length; ++i) {
    this.vertices[i].add(v);
    this.flat_vertices[i].add(v);
  }

  for(var i=0;i<this.i_vertices.length; ++i) {
    this.i_vertices[i].add(v);
  }

  this.updateGeometry();

  return this;
}

Origami.Model.prototype.scale = function(scale) {
  for (var i = 0; i < this.vertices.length; ++i) {
    this.vertices[i].multiplyScalar(scale);
    this.flat_vertices[i].multiplyScalar(scale);
  }

  for(var i=0;i<this.i_vertices.length; ++i) {
    this.i_vertices[i].multiplyScalar(scale);
  }

  this.updateGeometry();

  return this;
}


// set folding path
Origami.Model.prototype.setFoldingPath = function(path) {
  this.folding_path = path;
};

// set thickness
Origami.Model.prototype.setThickness = function(thickness) {
  this.thickness = thickness;
}

// fold the origami to certen percentage
Origami.Model.prototype.foldToPercentage = function(percentage) {
  if (!this.loaded) return;

  if (percentage < 0) percentage = 0;
  if (percentage > 1) percentage = 1;

  var cfg = [];

  if (this.folding_path && this.folding_path.length > 0) {
    if (percentage <= 0) {
      return this.foldTo(this.start_cfg);
    } else if (percentage >= 1) {
      return this.foldTo(this.goal_cfg);
    }

    // percentage per cfg
    var ppc = 1.0 / (this.folding_path.length - 1);
    var index = Math.floor(percentage / ppc);
    // percentage in between two cfgs
    var pib = (percentage - index * ppc) / ppc;

    cfg.linearBlend(this.folding_path[index], this.folding_path[index + 1], pib);

  } else {
    cfg.linearBlend(this.start_cfg, this.goal_cfg, percentage);
  }

  this.foldTo(cfg);
};

Origami.Model.prototype.getCrease = function(vid1, vid2) {
  for (var i = 0; i < this.creases.length; ++i) {
    var c = this.creases[i];
    if ((c.vid1 == vid1 && c.vid2 == vid2) || (c.vid1 == vid2 && c.vid2 == vid1))
      return c;
  }
  return null;
}

Origami.Model.prototype.isCrease = function(vid1, vid2) {
  return (this.getCrease(vid1, vid2) != null);
}

// fold the origami to given configuration
Origami.Model.prototype.foldTo = function(cfg) {

  // update cur cfg
  this.cur_cfg = cfg.clone();

  // folding matrices
  var ms = new Array(this.ordered_face_ids.length);

  // base face's rotation matrix is an identity matrix
  ms[this.base_face_id] = new THREE.Matrix4();

  // folding each face by computing folding matrix on the fly
  for (var i = 0; i < this.ordered_face_ids.length; ++i) {
    var fid = this.ordered_face_ids[i];

    var face = this.faces[fid];

    var pid = face.pid;

    var crease = null;

    var folding_angle = 0;

    if(fid != this.base_face_id) {
      var parent_face = this.faces[pid];

      crease = this.creases[face.cid];
      folding_angle = cfg[face.cid];

      var offset = parent_face.computeNormal().multiplyScalar(this.thickness/2);

      // i_vertices
      // center of the penel
      var p1 = parent_face.getVertex(crease.vid1).clone().sub(offset); 
      var p2 = parent_face.getVertex(crease.vid2).clone().sub(offset);

      // computing folding matrix
      var transform_matrix = new THREE.Matrix4();
      ms[fid] = transform_matrix.makeTransform(p1, p2, folding_angle).multiply(ms[pid]);
    }

    // Compute the folded position for front face.
    for (var j = 0; j < 3; j++) {
      // compute the coordinates for each vertex on front face
      var vid = face.vids[j];
      this.i_vertices[fid*3 + j].copy(this.flat_vertices[vid]).applyMatrix4(ms[fid]);
    }
    
    var shift = new THREE.Vector3(0,0,0);
    var cur_angle = 0;

    if(crease) {
      cur_angle = folding_angle + crease.init_angle;
      if (Math.abs(cur_angle) > 1.1 * Math.PI / 2) {

        // need shift
        // smooth the shift by cur_angle / Math.PI * basic_shift
        shift = face.computeNormal().multiplyScalar(this.thickness * Math.abs(cur_angle) / Math.PI);

        if(cur_angle < 0) {
          shift.negate();
        }

        // Update matrix
        var e = ms[fid].elements;

        e[12] += shift.x;
        e[13] += shift.y;
        e[14] += shift.z;
      }
    }

    var offset = face.computeNormal().multiplyScalar(this.thickness/2.0);

    // Update the front face
    for (var j = 0; j < 3; j++) {
      // compute the coordinates for each vertex on front face
      this.i_vertices[fid*3 + j].add(shift).add(offset);
    }

    // Compute the folded position for bottom face.
    for (var j = 0; j < 3; j++) {
      // compute the coordinates for each vertex on bottom face
      this.i_vertices[fid*3 + this.faces.length*3 + j].copy(this.i_vertices[fid*3+j]).sub(offset).sub(offset);
    }
  }

  // thrink the panels
  this.shrinkPanels();

  this.updateGeometry();
};

Origami.Model.prototype.shrinkPanels = function() {
  if(this.thickness <=0) return;

  for (var i = 0; i < this.ordered_face_ids.length; ++i) {
    var fid = this.ordered_face_ids[i];

    var p0 = this.i_vertices[fid*3 + 0].clone();
    var p1 = this.i_vertices[fid*3 + 1].clone();
    var p2 = this.i_vertices[fid*3 + 2].clone();

    var e0 = p1.clone().sub(p0);
    var e1 = p2.clone().sub(p1);
    var e2 = p0.clone().sub(p2);

    var l0 = e0.length();
    var l1 = e1.length();
    var l2 = e2.length();

    var ps = [p0, p1, p2];
    var es = [e0, e1, e2];

    // l2 > l1 = l0
    var index = [0,1,2];

    if(l0 > l1 && l0 > l2) index = [1, 2, 0];
    if(l1 > l2 && l1 > l0) index = [2, 0, 1];

    // (p0' + p2') / 2
    var diagnoal_center = ps[index[0]].clone().add(ps[index[2]]).divideScalar(2.0);

    for (var j = 0; j < 3; j++) {
      var idx = fid*3 + index[j];
      var movement = this.thickness * Math.sqrt(2);

      var offset = this.i_vertices[idx].clone().sub(diagnoal_center).normalize().multiplyScalar(movement);

      this.i_vertices[idx].sub(offset);
      this.i_vertices[idx + this.faces.length*3].sub(offset);
    }
  }
}

// update the threejs geometry once folded
Origami.Model.prototype.updateGeometry = function() {

  if (!this.geometry) return;

  this.geometry.computeBoundingSphere();

  this.geometry.computeFaceNormals();

  // this.geometry.computeVertexNormals();

  this.geometry.verticesNeedUpdate = true;
  this.geometry.normalsNeedUpdate = true;
}

// draw model on the svg object
// requires: js/svg/jquery.svg.min.js
// svg: canvas to draw
// T: translation
// S: scale
// W: strokeWidth
Origami.Model.prototype.drawSVG = function(svg, T, S, W) {

  // create a new path
  var path = svg.createPath();

  // boundary
  for (var i = 0; i < this.faces.length; ++i) {
    for (var j = 1; j <= 3; ++j) {
      var vid1 = this.faces[i].vids[j - 1];
      var vid2 = this.faces[i].vids[j % 3];
      var v1 = this.flat_vertices[vid1];
      var v2 = this.flat_vertices[vid2];

      if (this.isCrease(vid1, vid2)) continue;

      v1 = v1.clone().sub(T).multiplyScalar(S);
      v2 = v2.clone().sub(T).multiplyScalar(S);

      path.move(v1.x, v1.z).line(v2.x, v2.z);
    }
  }

  svg.path(path, { fill: 'none', stroke: '#000000', strokeWidth: W * 1.5 });

  path = svg.createPath();

  // crease lines
  for (var i = 0; i < this.creases.length; ++i) {
    var c = this.creases[i];
    var v1 = this.flat_vertices[c.vid1];
    var v2 = this.flat_vertices[c.vid2];

    v1 = v1.clone().sub(T).multiplyScalar(S);
    v2 = v2.clone().sub(T).multiplyScalar(S);

    path.move(v1.x, v1.z).line(v2.x, v2.z);
  }

  var strokeDashArray = '' + W * 3 + ',' + W * 3;

  svg.path(path, {
    fill: 'none',
    stroke: '#999',
    'stroke-dasharray': strokeDashArray,
    strokeWidth: W
  });

  this.svg_cfg = {
    shift: T,
    scale: S,
    strokeWidth: W,
    strokeDashArray: strokeDashArray
  };

  // svg.configure({
  //     //viewBox: viewBox, 
  //     width:svg_width,
  //     height:svg_height,
  //     'raw-width': width,
  //     'raw-height': height
  //     }, true);
}

// compute bounding box based on faces (array of face ids)
Origami.Model.prototype.computeBoundingBox = function(fids) {
  var min = THREE.Vector3(1e10, 1e10, 1e10);
  var max = THREE.Vector3(-1e10, -1e10, -1e10);

  var vs = [];

  for (var i = 0; i < fids.length; ++i) {
    for (var j = 0; j < 3; ++j) {
      var v = this.flat_vertices[this.faces[fids[i]].vids[j]];
      vs.push(v);
    }
  }

  var box = new THREE.Box3(min, max);

  box.setFromPoints(vs);

  return box;
}

// draw svg for given fids and cids indexing the original net
Origami.Model.prototype.drawSVGImpl = function(svg, fids, cids) {

  svg.clear();

  console.log('drawSVGImpl faces = ' + fids.length + ' creases = ' + cids.length);

  // compute bounding box from faces
  var box = this.computeBoundingBox(fids);

  var size = box.size();
  var width = size.x;
  var height = size.z;

  var isSubnet = this.faces.length !== fids.length;

  var max_width = $(window).width() * 0.98;
  var max_height = $(window).height() * 0.98 - 80;

  var max_scale = Math.min(max_width / width, max_height / height);

  // sub nets should have the same scale factor
  if (isSubnet) {
    var max_dim = Math.max(this.svg_cfg.raw_width, this.svg_cfg.raw_height);
    // long edge size = 720 px (10 in @ 72dpi)
    max_scale = 720 / max_dim;
  }

  var svg_width = width * max_scale;
  var svg_height = height * max_scale;

  var strokeWidth = Math.max(svg_width, svg_height) * 0.0015;

  // create a new path
  var path = svg.createPath();

  // boundary
  for (var i = 0; i < fids.length; ++i) {
    for (var j = 1; j <= 3; ++j) {
      var vid1 = this.faces[fids[i]].vids[j - 1];
      var vid2 = this.faces[fids[i]].vids[j % 3];
      var v1 = this.flat_vertices[vid1];
      var v2 = this.flat_vertices[vid2];

      if (this.isCrease(cids, vid1, vid2)) continue;

      v1 = v1.clone().sub(box.min).multiplyScalar(max_scale);
      v2 = v2.clone().sub(box.min).multiplyScalar(max_scale);

      path.move(v1.x, v1.z).line(v2.x, v2.z);
    }
  }

  svg.path(path, { fill: 'none', stroke: '#000000', strokeWidth: strokeWidth * 1.5 });

  path = svg.createPath();

  // crease lines
  for (var i = 0; i < cids.length; ++i) {
    var c = this.creases[cids[i]];
    var v1 = this.flat_vertices[c.vid1];
    var v2 = this.flat_vertices[c.vid2];

    v1 = v1.clone().sub(box.min).multiplyScalar(max_scale);
    v2 = v2.clone().sub(box.min).multiplyScalar(max_scale);

    path.move(v1.x, v1.z).line(v2.x, v2.z);
  }

  var strokeDashArray = '' + strokeWidth * 3 + ',' + strokeWidth * 3;

  svg.path(path, {
    fill: 'none',
    stroke: '#999',
    'stroke-dasharray': strokeDashArray,
    strokeWidth: strokeWidth
  });

  var svg_cfg = {
    shift: box.min,
    scale: max_scale,
    width: svg_width,
    height: svg_width,
    raw_width: width,
    raw_height: height,
    strokeWidth: strokeWidth,
    strokeDashArray: strokeDashArray
  };

  svg.configure({
    //viewBox: viewBox, 
    width: svg_width,
    height: svg_height,
    'raw-width': width,
    'raw-height': height
  }, true);

  return svg_cfg;
}

/// create a highlighted crease in svg
/// return the new node
Origami.Model.prototype.highLightCrease = function(svg, cid, selected) {

  var c = this.creases[cid];
  var v1 = this.flat_vertices[c.vid1];
  var v2 = this.flat_vertices[c.vid2];

  v1 = v1.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);
  v2 = v2.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);

  var node_cfg = {
    stroke: selected ? '#0000ff' : '#ff0000',
    strokeWidth: this.svg_cfg.strokeWidth * 2
  };

  if (!selected)
    node_cfg['stroke-dasharray'] = this.svg_cfg.strokeDashArray;

  var node = svg.line(v1.x, v1.z, v2.x, v2.z, node_cfg);

  return node;
}

// get a crease line that close p {x, y}
// requires geometry.js
Origami.Model.prototype.getClosestCrease = function(p) {

  var min_dist = 1e10;
  var threshold = 10 * this.svg_cfg.strokeWidth;
  var cid = -1;

  for (var i = 0; i < this.creases.length; ++i) {
    var c = this.creases[i];
    var v1 = this.flat_vertices[c.vid1];
    var v2 = this.flat_vertices[c.vid2];

    v1 = v1.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);
    v2 = v2.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);

    var v = { x: v1.x, y: v1.z };
    var w = { x: v2.x, y: v2.z };


    var dist = distToSegment(p, v, w)

    if (dist < min_dist) {
      min_dist = dist;
      cid = i;
    }
  }

  if (min_dist > threshold) return -1;

  return cid;
}

/// create a sub model/net/ori from the given face ids and crease ids
/// it will not scale/translate the sub model
Origami.Model.prototype.createSubModel = function(fids, cids) {
  // create an object
  var obj = {
    vertices: [],
    creases: [],
    faces: [],
    base_face_id: -1,
    ordered_face_ids: []
  };

  var vid = 0;
  var cid = 0;
  var fid = 0;
  var vid_mapping1 = {}; // old vid to new vid
  var vid_mapping2 = {}; // new vid to old vid
  var cid_mapping = {}; // old cid to new cid    
  var fid_mapping = {}; // old fid to new fid

  ////////////////////////////////////////////////////////
  // creating mapping
  ////////////////////////////////////////////////////////

  for (var i = 0; i < fids.length; ++i) {
    for (var j = 0; j < 3; ++j) {
      var old_vid = this.faces[fids[i]].vids[j];
      if (old_vid in vid_mapping1) continue;
      vid_mapping1[old_vid] = vid;
      vid_mapping2[vid] = old_vid;
      ++vid;
    }
  }

  for (var i = 0; i < cids.length; ++i)
    cid_mapping[cids[i]] = cid++;

  for (var i = 0; i < fids.length; ++i)
    fid_mapping[fids[i]] = fid++;

  ////////////////////////////////////////////////////////

  // identify base face / ordered face ids
  if (this.base_face_id in fid_mapping) {
    // base face is in this side, keep using it
    obj.base_face_id = this.base_face_id;
  } else {
    // find the first one in order
    for (var i = 0; i < this.ordered_face_ids.length; ++i) {
      var ordered_fid = this.ordered_face_ids[i];
      if (fids.indexOf(ordered_fid) >= 0) {
        obj.base_face_id = fid_mapping[ordered_fid];
      }
    }
  }

  for (var i = 0; i < this.ordered_face_ids.length; ++i) {
    var ordered_fid = this.ordered_face_ids[i];
    if (fids.indexOf(ordered_fid) >= 0)
      obj.ordered_face_ids.push(fid_mapping[ordered_fid]);
  }

  // build vertices
  for (var i = 0; i < vid; ++i) {
    var old_v = this.flat_vertices[vid_mapping2[i]];
    var coord = [old_v.x, old_v.y, old_v.z];
    obj.vertices.push(coord);
  }

  // build faces
  for (var i = 0; i < fids.length; ++i) {
    var old_f = this.faces[fids[i]];

    var new_pid = (old_f.pid in fid_mapping) ? fid_mapping[old_f.pid] : -1;
    var new_cid = (old_f.cid in cid_mapping) ? cid_mapping[old_f.cid] : -1;

    var new_f = [
      3, // # of vertices
      vid_mapping1[old_f.vids[0]], //vid1
      vid_mapping1[old_f.vids[1]], //vid2
      vid_mapping1[old_f.vids[2]], //vid3
      new_pid,
      new_cid
    ];

    obj.faces.push(new_f);
  }

  // build creases
  for (var i = 0; i < cids.length; ++i) {
    var old_c = this.creases[cids[i]];

    var new_fid = (old_c.fid in fid_mapping) ? fid_mapping[old_c.fid] : -1;
    var new_pid = (old_c.pid in fid_mapping) ? fid_mapping[old_c.pid] : -1;

    var new_c = [
      vid_mapping1[old_c.vid1], // vid1
      vid_mapping1[old_c.vid2], // vid2
      old_c.folding_angle, // folding_angle
      new_fid, // fid
      new_pid // pid
    ];

    obj.creases.push(new_c);
  }

  console.log(obj);


  // create a new model
  var model = new Origami.Model();

  // build the model
  model.build(obj);

  // retun the model
  return model;
};

/// split the model into two by cutting along the given crease line
Origami.Model.prototype.split = function(cid) {

  // the splitting crease
  var crease = this.creases[cid];

  var fids1 = [];
  var fids2 = [];
  var cids1 = [];
  var cids2 = [];

  var q = [crease.fid];
  var visited = [];
  visited[crease.fid] = true;

  while (q.length) {
    var head_fid = q.shift();
    fids1.push(head_fid);
    for (var i = 1; i <= 3; ++i) {
      var vid1 = this.faces[head_fid].vids[i - 1];
      var vid2 = this.faces[head_fid].vids[i % 3];
      var c = this.getCrease(vid1, vid2);
      if (!c) continue;
      if (visited[c.fid]) continue;

      var _cid = this.creases.indexOf(c);
      if (_cid !== cid) cids1.push(_cid);

      // put that crease's face into queue
      q.push(c.fid);
      visited[c.fid] = true;
    }
  }

  for (var i = 0; i < this.faces.length; ++i)
    if (fids1.indexOf(i) == -1) fids2.push(i);

  for (var i = 0; i < this.creases.length; ++i)
    if (cids1.indexOf(i) == -1 && i != cid) cids2.push(i);

  var sub1 = this.createSubModel(fids1, cids1);
  var sub2 = this.createSubModel(fids2, cids2);

  return [sub1, sub2];
}
