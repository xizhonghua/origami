var Origami = function() {

    // flat vertices
    this.flat_vertices = [];

    // folded vertices
    this.vertices = [];

    // faces, each face is ab array of 3 vertices id
    this.faces = [];

    //  
    this.creases = [];

    // array of array of folding angles
    this.folding_path = [];

    // the parent face ids
    this.parent_face_ids = [];

    // ordered face list
    this.ordered_face_ids = [];
}

// build the origami model from data in string
Origami.prototype.build = function(data) {
    // body...
};

// add folding path data
Origami.prototype.addFoldingPath = function(path) {    
    this.folding_path = path;
};

// fold the origami to certen percentage
Origami.prototype.foldTo = function(percentage) {
    // body...
};