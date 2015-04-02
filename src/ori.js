var Origami = function() {
    this.vertices = [];
    this.faces = [];
    this.creases = [];
    this.folding_path = [];

    // the parent face ids
    this.parents = [];
}

// build the origami model from data in string
Origami.prototype.build = function(data) {
    // body...
};

// add folding path data
Origami.prototype.addFoldingPath = function(path) {
    // todo
    // clear
    this.folding_path = [];
};

// fold the origami to certen percentage
Origami.prototype.foldTo = function(percentage) {
    // body...
};