

/*
 * Create 3D scene
 */

var view3dobj = new View3D("3d-scene");
new ResizeSensor( $("#3d-scene"), function() {
    view3dobj.onWindowResize();
});


// view3dobj.addJSON( data );


var nodesCallback = $.getJSON("data/tpam.json");
var edgesCallback = $.getJSON("data/edge.json");
$.when( nodesCallback, edgesCallback).done(function(nodes, edges){
    view3dobj.addJSON(nodes[0], edges[0]);
});

function switchScene() {
    $("#3d-scene").toggleClass("scene-sm scene-lg");
}
$("#3d-scene").click( function() {
    $("#3d-scene").toggleClass("scene-sm scene-lg");

});
