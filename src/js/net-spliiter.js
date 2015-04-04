$(document).ready(function($) {

var origami = new Origami.Model();

origami.load('models/star-024.json', function(){
    origami.foldTo(origami.goal_cfg);
    console.log('origami loaded!');
});


});