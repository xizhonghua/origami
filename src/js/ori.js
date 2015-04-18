// requires:
//  jQuery
//  Three.js
//  js/extension.js
//  js/svg/jquery.svg.min.js

// namespace
var Origami = Origami || {};

// crease class
Origami.Crease = function(vid1, vid2, folding_angle, fid, pid) {

    // vetex indices
    this.vid1 = vid1;
    this.vid2 = vid2;

    // folding angle
    this.folding_angle = folding_angle;

    // face id
    this.fid = fid;

    // parent face id
    this.pid = pid;
}

// face class
Origami.Face = function(vid1, vid2, vid3, pid, cid) {

    // verter indices
    this.vids = [vid1, vid2, vid3];
    
    // parent face id
    this.pid = pid;
    
    // crease id
    this.cid = cid;
}

// model class
Origami.Model = function() {

    // flat vertices, array of THREE.vector3
    this.flat_vertices = [];

    // folded vertices, array of THREE.vector3
    this.vertices = [];

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
}

Origami.JSONLoader = function() {}

Origami.JSONLoader.prototype.load = function(file, callback) {
    var reader = new FileReader();

    reader.onload = function(e) {
        var text = reader.result;
        var obj = $.parseJSON(text);
        
        if(callback) callback(obj);
    }

    reader.readAsText(file, 'UTF-8');
}


Origami.ORILoader = function() {}

// requires io.js
Origami.ORILoader.prototype.load = function(file, callback) {
    var reader = new FileReader();

    reader.onload = function(e) {
        var text = reader.result;

        var lines = text.split('\n');

        var sr = new Origami.StreamReader(lines);

        var obj = {
            vertices : [],
            creases : [],
            faces : [],
            base_face_id : -1,
            ordered_face_ids : []
        }

        var vsize = sr.readlineInt();        

        for(var i=0;i<vsize;++i)            
            obj.vertices.push(sr.readlineFloatArray());        

        var csize = sr.readlineInt();

        for(var i=0;i<csize;++i)
            obj.creases.push(sr.readlineFloatArray());

        var fsize = sr.readlineInt();
        for(var i=0;i<fsize;++i)
            obj.faces.push(sr.readlineIntArray());

        obj.base_face_id = sr.readlineInt();

        obj.ordered_face_ids = sr.readlineIntArray();
        
        if(callback) callback(obj);
    }

    reader.readAsText(file, 'UTF-8');
}


Origami.Model.prototype.load = function(model_url, traj_url, callback) {
    var me = this;

    this.loaded = false;

    var my_callback = function() {
        me.loaded = true;
        if(callback) callback(me);
    }

    var load_traj = function() {
        // check trajectory file
        if(traj_url==null || traj_url.length == 0) {
            my_callback(me);
        }
        else {
            $.getJSON(traj_url, function(data, textStatus) {

                console.log("traj = " + traj_url + " loaded!");

                me.setFoldingPath(data.trajs);
                my_callback(me);
            });
        }
    }

    if(model_url.endsWith('.json')) {
        // json version
        $.getJSON(model_url, function(model, textStatus) {

            console.log("model = " + model_url + " loaded!");
        
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
    for(var i=0;i<model.vertices.length;++i)
    {
        var v = model.vertices[i];

        var vertex = new THREE.Vector3(v[0], v[1], v[2]);        

        this.vertices.push(vertex);

        // this.flat_vertices is a deep copy of this.vertices
        this.flat_vertices.push(vertex.clone());
    }

    this.faces = [];

    // building faces
    for(var i=0;i<model.faces.length;++i)
    {
        var f = model.faces[i];

        var face = new Origami.Face(f[1],f[2],f[3],f[4],f[5]);

        this.faces.push(face);
    }

    this.creases = [];

    //building creases
    for(var i=0;i<model.creases.length;++i)
    {
        var c = model.creases[i];

        var crease = new Origami.Crease(c[0], c[1], c[2], c[3], c[4]);

        this.creases.push(crease);
    }

    this.ordered_face_ids = model.ordered_face_ids;

    // set start and goal status

    this.start_cfg = [];
    this.goal_cfg = [];

    for(var i=0;i<this.creases.length;++i)
    {
        this.start_cfg.push(0);
        this.goal_cfg.push(this.creases[i].folding_angle);
    }

    this.cur_cfg = this.start_cfg.clone();

    this.buildThreeGeometry();

    
    console.log('built!');
};

Origami.Model.prototype.buildThreeGeometry = function() {

    // build Threejs geometry object

    this.geometry = new THREE.Geometry();
    
    // same pointer
    this.geometry.vertices = this.vertices;

    this.geometry.faces = [];


    for(var i=0;i<this.faces.length;++i)
    {
        var f = this.faces[i];
        this.geometry.faces.push(new THREE.Face3(f.vids[0], f.vids[1], f.vids[2]));
    }

    this.geometry.computeBoundingBox();

    this.updateGeometry();
}

// set folding path
Origami.Model.prototype.setFoldingPath = function(path) {    
    this.folding_path = path;
};

// fold the origami to certen percentage
Origami.Model.prototype.foldToPercentage = function(percentage) {    
    if(!this.loaded) return;

    if(percentage<0) percentage=0;
    if(percentage>1) percentage=1;

    var cfg = [];
    
    if(this.folding_path && this.folding_path.length > 0) {
        if(percentage<=0) {
            return this.foldTo(this.start_cfg); 
        } else if(percentage >=1 ) {
            return this.foldTo(this.goal_cfg);
        }

        // percentage per cfg
        var ppc = 1.0 / (this.folding_path.length-1);
        var index = Math.floor(percentage / ppc);
        // percentage in between two cfgs
        var pib = (percentage - index * ppc) / ppc;        

        cfg.linearBlend(this.folding_path[index], this.folding_path[index+1], pib);

    } else {
        cfg.linearBlend(this.start_cfg, this.goal_cfg, percentage);
    }

    this.foldTo(cfg);
};

Origami.Model.prototype.getCrease = function(vid1, vid2) {
    for(var i=0;i<this.creases.length;++i)
    {
        var c = this.creases[i];
        if((c.vid1 == vid1 && c.vid2 == vid2) || (c.vid1 == vid2 && c.vid2 == vid1))
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
    ms = [];

    // base face's rotation matrix is an identity matrix
    ms[this.base_face_id] = new THREE.Matrix4();

    // folding each face by computing folding matrix on the fly
    for(var i=0;i<this.ordered_face_ids.length;++i)
    {
        var fid = this.ordered_face_ids[i];

        // do not fold base face
        if(fid == this.base_face_id) continue;

        var face = this.faces[fid];    
        var crease = this.creases[face.cid];
        var folding_angle = cfg[face.cid];
        var p1 = this.vertices[crease.vid1];
        var p2 = this.vertices[crease.vid2];
        var pid = face.pid;

        // computing folding matrix
        var transform_matrix = new THREE.Matrix4();
        ms[fid] = transform_matrix.makeTransform(p1, p2, folding_angle).multiply(ms[pid]);

        // fold each vertex
        for(var j=0;j<3;j++)
        {
            var vid = face.vids[j];

            // don't fold already folded vertices along the edge itself, this causes unstable folded shape
            if(vid == crease.vid1 || vid == crease.vid2) continue;

            // fold the vertex
            this.vertices[vid].copy(this.flat_vertices[vid]).applyMatrix4(ms[fid]);
        }

    }

    this.updateGeometry();
};

// update the threejs geometry once folded
Origami.Model.prototype.updateGeometry = function() {

    if(!this.geometry) return;

    this.geometry.computeBoundingSphere();

    this.geometry.computeFaceNormals();

    this.geometry.computeVertexNormals();

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
    for(var i=0;i<this.faces.length;++i)
    {
        for(var j=1;j<=3;++j)
        {
            var vid1 = this.faces[i].vids[j-1];
            var vid2 = this.faces[i].vids[j%3];
            var v1 = this.flat_vertices[vid1];
            var v2 = this.flat_vertices[vid2];

            if(this.isCrease(vid1, vid2)) continue;

            v1 = v1.clone().sub(T).multiplyScalar(S);
            v2 = v2.clone().sub(T).multiplyScalar(S);

            path.move(v1.x, v1.z).line(v2.x, v2.z);
        }
    }

    svg.path(path, {fill: 'none', stroke: '#000000', strokeWidth: W*1.5});

    path = svg.createPath();

    // crease lines
    for(var i=0;i<this.creases.length;++i)
    {
        var c = this.creases[i];
        var v1 = this.flat_vertices[c.vid1];
        var v2 = this.flat_vertices[c.vid2];

        v1 = v1.clone().sub(T).multiplyScalar(S);
        v2 = v2.clone().sub(T).multiplyScalar(S);

        path.move(v1.x, v1.z).line(v2.x, v2.z);
    }

    var strokeDashArray = '' + W*3 + ',' + W*3;

    svg.path(path, {
        fill: 'none', 
        stroke: '#999', 
        'stroke-dasharray' : strokeDashArray,
        strokeWidth: W
    });    
    
    this.svg_cfg = {
        shift : T,
        scale : S,
        strokeWidth: W,
        strokeDashArray : strokeDashArray
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

    for(var i=0;i<fids.length;++i)
    {
        for(var j=0;j<3;++j)
        {
            var v = this.flat_vertices[this.faces[fids[i]].vids[j]];
            vs.push(v);
        }
    }

    var box = new THREE.Box3(min, max);

    box.setFromPoints(vs);

    return box;
}

// draw svg for given fids and cids indexing the original net
Origami.Model.prototype.drawSVGImpl = function(svg, fids, cids){
    
    svg.clear();

    console.log('drawSVGImpl faces = ' + fids.length + ' creases = ' + cids.length );

    // compute bounding box from faces
    var box = this.computeBoundingBox(fids);

    var size = box.size();
    var width = size.x;
    var height = size.z;

    var isSubnet = this.faces.length !== fids.length;

    var max_width = $(window).width() * 0.98;
    var max_height = $(window).height() * 0.98 - 80;    

    var max_scale = Math.min(max_width/width, max_height/height);

    // sub nets should have the same scale factor
    if(isSubnet) {
        var max_dim = Math.max(this.svg_cfg.raw_width, this.svg_cfg.raw_height);
        // long edge size = 720 px (10 in @ 72dpi)
        max_scale = 720 / max_dim;
    }

    var svg_width = width*max_scale;
    var svg_height = height*max_scale;
    
    var strokeWidth = Math.max(svg_width, svg_height)*0.0015;

    // create a new path
    var path = svg.createPath();

    // boundary
    for(var i=0;i<fids.length;++i)
    {
        for(var j=1;j<=3;++j)
        {
            var vid1 = this.faces[fids[i]].vids[j-1];
            var vid2 = this.faces[fids[i]].vids[j%3];
            var v1 = this.flat_vertices[vid1];
            var v2 = this.flat_vertices[vid2];

            if(this.isCrease(cids, vid1, vid2)) continue;

            v1 = v1.clone().sub(box.min).multiplyScalar(max_scale);
            v2 = v2.clone().sub(box.min).multiplyScalar(max_scale);

            path.move(v1.x, v1.z).line(v2.x, v2.z);
        }
    }

    svg.path(path, {fill: 'none', stroke: '#000000', strokeWidth: strokeWidth*1.5});

    path = svg.createPath();

    // crease lines
    for(var i=0;i<cids.length;++i)
    {
        var c = this.creases[cids[i]];
        var v1 = this.flat_vertices[c.vid1];
        var v2 = this.flat_vertices[c.vid2];

        v1 = v1.clone().sub(box.min).multiplyScalar(max_scale);
        v2 = v2.clone().sub(box.min).multiplyScalar(max_scale);

        path.move(v1.x, v1.z).line(v2.x, v2.z);
    }

    var strokeDashArray = '' + strokeWidth*3 + ',' + strokeWidth*3;

    svg.path(path, {
        fill: 'none', 
        stroke: '#999', 
        'stroke-dasharray' : strokeDashArray,
        strokeWidth: strokeWidth
    });    
    
    var svg_cfg = {
        shift : box.min,
        scale : max_scale,
        width : svg_width,
        height : svg_width,
        raw_width : width,
        raw_height : height,
        strokeWidth : strokeWidth,
        strokeDashArray : strokeDashArray
    };

    svg.configure({
        //viewBox: viewBox, 
        width:svg_width,
        height:svg_height,
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
        strokeWidth: this.svg_cfg.strokeWidth*2
    };

    if(!selected)
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

    for(var i=0;i<this.creases.length;++i)
    {
        var c = this.creases[i];
        var v1 = this.flat_vertices[c.vid1];
        var v2 = this.flat_vertices[c.vid2];

        v1 = v1.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);
        v2 = v2.clone().sub(this.svg_cfg.shift).multiplyScalar(this.svg_cfg.scale);
        
        var v = { x: v1.x, y : v1.z };
        var w = { x: v2.x, y : v2.z };
        

        var dist = distToSegment(p, v, w)

        if(dist < min_dist)
        {
            min_dist = dist;
            cid = i;
        }
    }

    if(min_dist > threshold) return -1;

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
    var vid_mapping1 = {};  // old vid to new vid
    var vid_mapping2 = {};  // new vid to old vid
    var cid_mapping = {};  // old cid to new cid    
    var fid_mapping = {};  // old fid to new fid

    ////////////////////////////////////////////////////////
    // creating mapping
    ////////////////////////////////////////////////////////

    for(var i=0;i<fids.length;++i)
    {
        for(var j=0;j<3;++j)
        {
            var old_vid = this.faces[fids[i]].vids[j];
            if (old_vid in vid_mapping1) continue;
            vid_mapping1[old_vid] = vid;
            vid_mapping2[vid] = old_vid;
            ++vid;
        }
    }

    for(var i=0;i<cids.length;++i)    
        cid_mapping[cids[i]] = cid++;

    for(var i=0;i<fids.length;++i)
        fid_mapping[fids[i]] = fid++;

    ////////////////////////////////////////////////////////

    // identify base face / ordered face ids
    if(this.base_face_id in fid_mapping)
    {
        // base face is in this side, keep using it
        obj.base_face_id = this.base_face_id;        
    }
    else
    {
        // find the first one in order
        for(var i=0;i<this.ordered_face_ids.length;++i)
        {
            var ordered_fid = this.ordered_face_ids[i];
            if(fids.indexOf(ordered_fid)>=0)
            {
                obj.base_face_id = fid_mapping[ordered_fid];
            }
        }
    }

    for(var i=0;i<this.ordered_face_ids.length;++i)
    {
        var ordered_fid = this.ordered_face_ids[i];
        if(fids.indexOf(ordered_fid)>=0)
            obj.ordered_face_ids.push(fid_mapping[ordered_fid]);
    }

    // build vertices
    for(var i=0;i<vid;++i)
    {
        var old_v = this.flat_vertices[vid_mapping2[i]];
        var coord = [old_v.x, old_v.y, old_v.z];
        obj.vertices.push(coord);
    }

    // build faces
    for(var i=0;i<fids.length;++i)
    {
        var old_f = this.faces[fids[i]];

        var new_pid = (old_f.pid in fid_mapping) ? fid_mapping[old_f.pid] : -1;
        var new_cid = (old_f.cid in cid_mapping) ? cid_mapping[old_f.cid] : -1;

        var new_f = [
            3,                              // # of vertices
            vid_mapping1[old_f.vids[0]],    //vid1
            vid_mapping1[old_f.vids[1]],    //vid2
            vid_mapping1[old_f.vids[2]],    //vid3
            new_pid,
            new_cid
        ];

        obj.faces.push(new_f);
    }

    // build creases
    for(var i=0;i<cids.length;++i)
    {
        var old_c = this.creases[cids[i]];

        var new_fid = (old_c.fid in fid_mapping) ? fid_mapping[old_c.fid] : -1;
        var new_pid = (old_c.pid in fid_mapping) ? fid_mapping[old_c.pid] : -1;    

        var new_c = [
            vid_mapping1[old_c.vid1],   // vid1
            vid_mapping1[old_c.vid2],   // vid2
            old_c.folding_angle,        // folding_angle
            new_fid,                    // fid
            new_pid                     // pid
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
Origami.Model.prototype.split = function(cid, svg1, svg2) {

    // the splitting crease
    var crease = this.creases[cid];

    var fids1 = [];
    var fids2 = [];
    var cids1 = [];
    var cids2 = [];

    var q = [crease.fid];
    var visited = [];
    visited[crease.fid] = true;

    while(q.length) {
        var head_fid = q.shift();
        fids1.push(head_fid);        
        for(var i=1;i<=3;++i)
        {
            var vid1 = this.faces[head_fid].vids[i-1];
            var vid2 = this.faces[head_fid].vids[i%3];
            var c = this.getCrease(vid1, vid2);
            if(!c) continue;
            if(visited[c.fid]) continue;

            var _cid = this.creases.indexOf(c);
            if(_cid !== cid) cids1.push(_cid);

            // put that crease's face into queue
            q.push(c.fid);
            visited[c.fid] = true;
        }
    }

    for(var i=0;i<this.faces.length;++i)    
        if(fids1.indexOf(i)==-1) fids2.push(i);
    
    for(var i=0;i<this.creases.length;++i)    
        if(cids1.indexOf(i)==-1 && i!=cid) cids2.push(i);

    var sub1 = this.createSubModel(fids1, cids1);
    var sub2 = this.createSubModel(fids2, cids2);

    return [sub1, sub2];
}