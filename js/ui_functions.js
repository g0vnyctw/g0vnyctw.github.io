

/*
 * Create 3D scene
 */

var view3dobj = new View3D("3d-scene");



// view3dobj.addJSON( data );


var nodesCallback = $.getJSON("data/tpam.json");
var edgesCallback = $.getJSON("data/edge.json");
$.when( nodesCallback, edgesCallback).done(function(nodes, edges){
    view3dobj.addJSON(nodes[0], edges[0]);
});


