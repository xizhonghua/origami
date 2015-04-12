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

Origami.Model.prototype.load = function(model_url, traj_url, callback) {
    var me = this;

    this.loaded = false;

    var my_callback = function() {
        me.loaded = true;
        if(callback) callback(me);
    }

    $.getJSON(model_url, function(model, textStatus) {

        console.log("model = " + model_url + " loaded!");
        
        // build the model
        me.build(model);

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
    });
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

Origami.Model.prototype.getCrease = function(cids, vid1, vid2) {
    for(var i=0;i<cids.length;++i)
    {
        var c = this.creases[cids[i]];
        if((c.vid1 == vid1 && c.vid2 == vid2) || (c.vid1 == vid2 && c.vid2 == vid1))
            return c;
    }
    return null;
}

Origami.Model.prototype.isCrease = function(cids, vid1, vid2) {
    return (this.getCrease(cids, vid1, vid2) != null);
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
Origami.Model.prototype.drawSVG = function(svg) {

    var fs = range(this.faces.length);
    var cs = range(this.creases.length);
    this.svg_cfg = this.drawSVGImpl(svg, fs, cs);    

    return this.svg_cfg;
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

    v1 = v1.clone().sub(svg_cfg.shift).multiplyScalar(svg_cfg.scale);
    v2 = v2.clone().sub(svg_cfg.shift).multiplyScalar(svg_cfg.scale);
    
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
    var threshold = 0.01 * Math.max(this.svg_cfg.width, this.svg_cfg.height);
    var cid = -1;

    for(var i=0;i<this.creases.length;++i)
    {
        var c = this.creases[i];
        var v1 = this.flat_vertices[c.vid1];
        var v2 = this.flat_vertices[c.vid2];

        v1 = v1.clone().sub(svg_cfg.shift).multiplyScalar(svg_cfg.scale);
        v2 = v2.clone().sub(svg_cfg.shift).multiplyScalar(svg_cfg.scale);
        
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

    var all_cids = range(this.creases.length);

    while(q.length) {
        var head_fid = q.shift();
        fids1.push(head_fid);        
        for(var i=1;i<=3;++i)
        {
            var vid1 = this.faces[head_fid].vids[i-1];
            var vid2 = this.faces[head_fid].vids[i%3];
            var c = this.getCrease(all_cids, vid1, vid2);
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

    this.drawSVGImpl(svg1, fids1, cids1);
    this.drawSVGImpl(svg2, fids2, cids2);


    // console.log(fids1);
    // console.log(cids1);

    // console.log(fids2);
    // console.log(cids2);



}