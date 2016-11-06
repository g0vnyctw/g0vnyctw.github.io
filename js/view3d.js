function getRandomIntInclusive(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

function View3D(div_id, data) {

	this.div_id = div_id;

	this.container = document.getElementById( div_id );
	var height = this.container.clientHeight;
	var width = this.container.clientWidth;

	this.fov = 20;

	this.camera = new THREE.PerspectiveCamera( this.fov, width / height, 0.1, 10000 );
	this.camera.position.z = 0;

	this.renderer = new THREE.WebGLRenderer();
	this.renderer.setPixelRatio( window.devicePixelRatio );
	this.renderer.setSize( width, height );

	this.container.appendChild(this.renderer.domElement);

	this.scene = new THREE.Scene();
	this.scene.add( this.camera );

	this.meshGroup = new THREE.Object3D(); // for raycaster detection

	this.currentIntersected;

	this.mouse = new THREE.Vector2(-100000,-100000);

	this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
	//this.controls.rotateSpeed = 2.0;
	//this.controls.zoomSpeed = 1.0;
	//this.controls.panSpeed = 2.0;
	//this.controls.staticMoving = true;
	//this.controls.dynamicDampingFactor = 0.3;

	this.controls.addEventListener('change', this.render.bind(this));

/*
	this.frontlight = new THREE.DirectionalLight();
	this.frontlight.position.set( 0, 0, 10 );
	this.scene.add( this.frontlight );

	this.backlight = new THREE.DirectionalLight();
	this.backlight.position.set( 0, 0, -10 );
	this.scene.add( this.backlight );

*/
	this.frontlight = new THREE.PointLight( 0x555555, 1, 0 );
	this.scene.add( this.frontlight );
	this.backlight = new THREE.PointLight( 0xffffff, 1, 0 );
	this.scene.add( this.backlight );
/*
	this.toplight = new THREE.PointLight( 0xffffff, 1, 0 );
	this.scene.add( this.toplight );
	this.bottomlight = new THREE.PointLight( 0xffffff, 1, 0 );
	this.scene.add( this.bottomlight );
	this.leftlight = new THREE.PointLight( 0xffffff, 1, 0 );
	this.scene.add( this.leftlight );
	this.rightlight = new THREE.PointLight( 0xffffff, 1, 0 );
	this.scene.add( this.rightlight );
*/
	this.bbox = {'x_min':10000, 'x_max':-10000, 'y_min':10000, 'y_max':-10000, 'z_min':10000, 'z_max':-10000};
	/*
	 * create color map
	 */
	this.maxColorNum = 1747591;
	this.lut = new THREE.Lut( 'rainbow', this.maxColorNum );
	this.lut.setMax( 1 );
	this.lut.setMin( 0 );

	this.loadingManager = new THREE.LoadingManager();
	this.scene.add( this.meshGroup );

	this.raycaster = new THREE.Raycaster();
	this.raycaster.linePrecision = 3;

	this.container.addEventListener( 'click', this.onDocumentMouseClick.bind(this), false );

	this.container.addEventListener( 'dblclick', this.onDocumentMouseDBLClick.bind(this), false );

	this.container.addEventListener( 'mousemove', this.onDocumentMouseMove.bind(this), false );

	this.container.addEventListener( 'mouseleave', this.onDocumentMouseLeave.bind(this), false );

	this.container.addEventListener( 'resize', this.onWindowResize.bind(this), false );

	this.meshDict = {};
	this.meshNum = 0;
	this.globalCenter = {'x':0.0, 'y':0.0, 'z':0.0};
	if ( data != undefined && Object.keys(data).length > 0)
		this.addJSON( data );

	this.toolTipPos = new THREE.Vector2();
	this.createToolTip();

	this.isHighlight = false;
	this.highlightedObj = null;

	//this.initTimeliner();
	this.animate();
	this.pinned = new Set();

	this.dispatch = {
		'click': undefined,
		'dblclick': undefined
	}

};
View3D.prototype.reset = function() {
	for (var key in this.meshDict) {
		var meshobj = this.meshDict[key].object3D;
		for (var i = 0; i < meshobj.children.length; i++ ) {
			meshobj.children[i].geometry.dispose();
			meshobj.children[i].material.dispose();
		}
	}
	this.scene.remove( this.meshGroup );
	this.meshGroup = new THREE.Object3D();
	this.scene.add( this.meshGroup );
	this.meshDict = {};
	this.meshNum = 0;
	this.isHighlight = false;
	this.highlightedObj = null;
	this.pinned.clear()
	this.globalCenter = {'x':0.0, 'y':0.0, 'z':0.0};
	this.bbox = {'x_min':10000, 'x_max':-10000, 'y_min':10000, 'y_max':-10000, 'z_min':10000, 'z_max':-10000};
}
View3D.prototype.setLight = function() {

	var a = 6, b = 5;
	this.frontlight.position.set( this.globalCenter.x, this.globalCenter.y, a*this.bbox.z_min - b*this.globalCenter.z );
	this.backlight.position.set( this.globalCenter.x, this.globalCenter.y, a*this.bbox.z_max - b*this.globalCenter.z );
/*
	this.toplight.position.set( this.globalCenter.x, a*this.bbox.y_min - b*this.globalCenter.y, this.globalCenter.z );
	this.bottomlight.position.set( this.globalCenter.x, a*this.bbox.y_max - b*this.globalCenter.y, this.globalCenter.z );
	this.leftlight.position.set( a*this.bbox.x_min - b*this.globalCenter.x, this.globalCenter.y, this.globalCenter.z );
	this.rightlight.position.set( a*this.bbox.x_max - b*this.globalCenter.x, this.globalCenter.y, this.globalCenter.z );
*/
}
View3D.prototype.addJSON = function( node, edge ) {

	for ( var key in node ) {
		this.meshDict[key] = {'highlight':true, 'amount':node[key].amount, 'position': new THREE.Vector3(10*node[key].pos[0], 10*node[key].pos[1], 10*node[key].pos[2])};
	}
/*
	for ( var i=0; i < edge.length; ++i ) {
		var x = edge[i][0];
		var y = edge[i][1];
		if ( !( x in this.meshDict ) ||  !( y in this.meshDict ))
			continue;
		++this.meshDict[x].edgeCount;
		++this.meshDict[y].edgeCount;
	}
	edgeCount = [];
	for (var key in node)
		edgeCount.push( [key, this.meshDict[key].edgeCount] );
	edgeCount.sort(function (x,y) {return y[1] - x[1];})
	console.log( edgeCount );
*/
	for ( var key in node ) {//= edgeCount[i][0];

		this.updateBoundingBox( key );

		this.meshNum += 1;
		if (node[key].type === "company")
			this.meshDict[key]['color'] = this.lut.getColor( 0.2*getRandomIntInclusive(1, this.maxColorNum) / this.maxColorNum );
		else
			this.meshDict[key]['color'] = this.lut.getColor( 0.8 + 0.2*getRandomIntInclusive(1, this.maxColorNum)/this.maxColorNum );

		var r = Math.log(this.meshDict[key].amount )/ Math.log(12)/4;
		this.meshDict[key]['label'] = key;

		var sphereGeometry = new THREE.SphereGeometry( r, 10, 10 );
		sphereGeometry.translate( this.meshDict[key].position.x, this.meshDict[key].position.y, this.meshDict[key].position.z);
		var sphereMaterial = new THREE.MeshLambertMaterial( {color: this.meshDict[key].color, transparent: true} );

		var group = new THREE.Object3D();
		group.add(new THREE.Mesh( sphereGeometry, sphereMaterial));

		this.meshDict[key]['object']  = group;
		this.meshDict[key]['pinned']  = false;

		/* create label for tooltip if not provided */
		group.name = this.meshDict[key].label;
		group.amount = this.meshDict[key].amount;
		group.uid = key;

		this.meshGroup.add( group );
	}

	var min_amount = 10000000;
	var max_amount = 0;
	for ( var i=0; i < edge.length; ++i ) {
		var n = edge[i];
		if (n[2] < min_amount)
			min_amount = n[2];
		if (n[2] > max_amount)
			max_amount = n[2];
	}
	var max_amount = 20000000;
	for ( var i=0; i < edge.length; ++i ) {
		var n = edge[i];
		var geometry = new THREE.Geometry();
		geometry.vertices.push( this.meshDict[n[0]].position );
		geometry.vertices.push( this.meshDict[n[1]].position );
		var x;
		if (node[n[0]].type === "company")
			x = n[0];
		else
			x = n[1];
		var material = new THREE.LineBasicMaterial({ transparent: true, color: this.meshDict[x].color });
		//material.opacity = 0.55 + 0.45*Math.tanh((n[2]-(max_amount+min_amount)/2)*4/((max_amount-min_amount)/2));
		material.opacity = 0.3 + 0.3*(n[2]-min_amount)/((max_amount-min_amount));
		//material.opacity = 0.35;
		var line = new THREE.Line(geometry, material);
		this.scene.add( line );
		if (n[2] < min_amount)
			min_amount = n[2];
		if (n[2] > max_amount)
			max_amount = n[2];
	}

	this.centerCameraAtScene();
	var dx = 0.5*(this.bbox.x_max - this.bbox.x_min);
	var dy = 0.5*(this.bbox.y_max - this.bbox.y_min);
	var dz = 0.5*(this.bbox.z_max - this.bbox.z_min);
	var rr = Math.sqrt( dx*dx + dy*dy + dz*dz );

	var center = new THREE.Vector3( this.globalCenter.x, this.globalCenter.y, this.globalCenter.z);

	for (var key in this.meshDict) {
		var dist = this.meshDict[key].position.distanceTo( center );
		var val = 0.5 + 0.5*dist/rr;
		this.meshDict[key].object.children[0].material.opacity = val;
	}
	this.setLight();

}
View3D.prototype.centerCameraAtScene = function() {
	this.globalCenter.x = 0.5 * ( this.bbox.x_min + this.bbox.x_max );
	this.globalCenter.y = 0.5 * ( this.bbox.y_min + this.bbox.y_max );
	this.globalCenter.z = 0.5 * ( this.bbox.z_min + this.bbox.z_max );
	this.camera.position.x = this.globalCenter.x;
	this.camera.position.y = this.globalCenter.y;
	this.camera.position.z = this.globalCenter.z;
}
View3D.prototype.updateBoundingBox = function(key) {

	var pos = this.meshDict[key].position;
	if ( this.bbox.x_min > pos.x ) this.bbox.x_min = pos.x;
	if ( this.bbox.x_max < pos.x ) this.bbox.x_max = pos.x;
	if ( this.bbox.y_min > pos.y ) this.bbox.y_min = pos.y;
	if ( this.bbox.y_max < pos.y ) this.bbox.y_max = pos.y;
	if ( this.bbox.z_min > pos.z ) this.bbox.z_min = pos.z;
	if ( this.bbox.z_max < pos.z ) this.bbox.z_max = pos.z;
}
View3D.prototype.animate = function() {

	requestAnimationFrame( this.animate.bind(this) );

	this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true

	this.render();
}

View3D.prototype._registerGroup = function(key, group, center) {

	/* create label for tooltip if not provided */
	group.name = this.meshDict[key].label;
	group.uid = key;

	this.meshDict[key]['object']  = group;
	this.meshDict[key]['pinned']  = false;

	/* reset the position of the entire scene */
	this.meshGroup.translateX(this.globalCenter.x/this.meshNum);
	this.meshGroup.translateY(this.globalCenter.y/this.meshNum);
	this.meshGroup.translateZ(this.globalCenter.z/this.meshNum);

	this.meshGroup.add( group );

	/* compute the new global center, and tcenter the the entire scene */
	this.globalCenter.x = this.globalCenter.x*(this.meshNum-1)/this.meshNum + center.x/this.meshNum;
	this.globalCenter.y = this.globalCenter.y*(this.meshNum-1)/this.meshNum + center.y/this.meshNum;
	this.globalCenter.z = this.globalCenter.z*(this.meshNum-1)/this.meshNum + center.z/this.meshNum;
	this.meshGroup.translateX(-this.globalCenter.x/this.meshNum);
	this.meshGroup.translateY(-this.globalCenter.y/this.meshNum);
	this.meshGroup.translateZ(-this.globalCenter.z/this.meshNum);
}

View3D.prototype.onDocumentMouseClick = function( event ) {
	if (event !== undefined)
		event.preventDefault();

	this.raycaster.setFromCamera( this.mouse, this.camera );

	var intersects = this.raycaster.intersectObjects( this.meshGroup.children, true);
	if ( intersects.length > 0 ) {
		this.currentIntersected = intersects[0].object.parent;
		/* find first object that can be highlighted (skip  mesh) */
		for (var i = 1; i < intersects.length; i++ ) {
			var x = intersects[i].object.parent;
			if (this.meshDict[x.uid]['highlight']) {
				this.currentIntersected = x;
				break;
			}
		}
	}
	if (this.dispatch['click'] != undefined && this.currentIntersected != undefined ) {
		var x = this.currentIntersected;
		if (this.meshDict[x.uid]['highlight'])
			this.dispatch['click']([x.name, x.uid]);
	}
}

View3D.prototype.onDocumentMouseDBLClick = function( event ) {
	if (event !== undefined)
		event.preventDefault();

	if (this.currentIntersected != undefined ) {
		var x = this.currentIntersected;
		if (!this.meshDict[x.uid]['highlight'])
			return;
		this.togglePin(x.uid);
		if (this.dispatch['dblclick'] !== undefined )
			this.dispatch['dblclick'](x.uid, x.name, this.meshDict[x.uid]['pinned']);
	}
}

View3D.prototype.onDocumentMouseMove = function( event ) {
	event.preventDefault();

	var rect = this.container.getBoundingClientRect();

	this.toolTipPos.x = event.clientX + 10;
	this.toolTipPos.y = event.clientY + 10;

	this.mouse.x = ( (event.clientX - rect.left) / this.container.clientWidth ) * 2 - 1;
	this.mouse.y = - ( (event.clientY - rect.top) / this.container.clientHeight ) * 2 + 1;

}

View3D.prototype.onDocumentMouseLeave = function( event ) {
	event.preventDefault();

	this.hide3dToolTip();
	this.resume();

}
//
View3D.prototype.onWindowResize = function() {

	var height = this.container.clientHeight;
	var width = this.container.clientWidth;

	this.camera.aspect = width / height;
	this.camera.updateProjectionMatrix();

	this.renderer.setSize( width, height );

	this.controls.handleResize();

	this.render();
}


View3D.prototype.render = function() {

	/*
	 * show label of mesh object when it intersects with cursor
	 */
	this.raycaster.setFromCamera( this.mouse, this.camera );

	var intersects = this.raycaster.intersectObjects( this.meshGroup.children, true);
	if ( intersects.length > 0 ) {
		this.currentIntersected = intersects[0].object.parent;
		/* find first object that can be highlighted (skip  mesh) */
		for (var i = 1; i < intersects.length; i++ ) {
			var x = intersects[i].object.parent;
			if (this.meshDict[x.uid]['highlight']) {
				this.currentIntersected = x;
				break;
			}
		}
		if ( this.currentIntersected !== undefined ) {
			this.show3dToolTip("<h5>" + this.currentIntersected.name + "</h5><h5>" + this.currentIntersected.amount + "</h5>");
			this.highlight(this.currentIntersected.uid);
		}
	} else {
		if ( this.currentIntersected !== undefined ) {
			this.hide3dToolTip();
			this.resume();
		}
		this.currentIntersected = undefined;
	}

	this.renderer.render( this.scene, this.camera );
}

View3D.prototype.showAll = function() {
	for (var key in this.meshDict)
		this.meshDict[key].object.visible = true;
};

View3D.prototype.hideAll = function() {
	for (var key in this.meshDict)
		if (!this.meshDict[key]['pinned'])
			this.meshDict[key].object.visible = false;
};

View3D.prototype.show = function(key) {
	if (key in this.meshDict)
		this.meshDict[key].object.visible = true;
	if (this.highlightedObj !== null && this.highlightedObj[0] == key)
		this.highlightedObj[1] = true;
}

View3D.prototype.hide = function(key) {
	if (key in this.meshDict)
		this.meshDict[key].object.visible = false;
	if (this.highlightedObj !== null && this.highlightedObj[0] == key)
		this.highlightedObj[1] = false;
}

View3D.prototype.toggleVis = function(key) {
	if (key in this.meshDict)
		this.meshDict[key].object.visible = !this.meshDict[key].object.visible;
}


View3D.prototype.highlight = function(d) {

	if (!(d in this.meshDict) || !(this.meshDict[d]['highlight']))
		return;
	if (this.highlightedObj !== null  && d !== this.highlightedObj[0])
		this.resume();

	this.highlightedObj = [d, this.meshDict[d].object.visible];
	for (var key in this.meshDict) {
		if (this.meshDict[key]['pinned'])
			continue;
		// TODO:
		var val = (this.meshDict[key]['highlight']) ? 0.2 : 0.05;
		if (this.meshDict[key]['pinned'])
			val = 0.4;
		for (i in this.meshDict[key].object.children)
			this.meshDict[key].object.children[i].material.opacity = val;
	}
	for (i in this.meshDict[d].object.children)
		this.meshDict[d].object.children[i].material.opacity = 1;
	this.meshDict[d].object.visible = true;
	this.isHighlight = true;
}

View3D.prototype.resume = function() {

	if (this.highlightedObj === null)
		return;
	var d = this.highlightedObj[0];
	var x = this.meshDict[d].object.children;
	var val;
	if (!this.meshDict[d]['pinned']) {
		this.meshDict[d].object.visible = this.highlightedObj[1];
		this.highlightedObj = null;
		val = 0.2;
	} else
		val = 0.6;
	for (i in x)
		x[i].material.opacity = val;
	if (this.pinned.size === 0)
		this.resetOpacity();
	this.isHighlight = false;
}


View3D.prototype.resetOpacity = function() {
	var val = 0.8;
	//if (this.pinnedNum > 0)
	//	val = 0.2;
	//reset
	for (var key in this.meshDict) {
		if (!this.meshDict[key]['highlight'])
			continue;
		//var op = (this.meshDict[key]['pinned']) ? 0.6 : val;

		for (i in this.meshDict[key].object.children)
			this.meshDict[key].object.children[i].material.opacity = val;
	}
}

View3D.prototype.togglePin = function( id ) {

	this.meshDict[id]['pinned'] = !this.meshDict[id]['pinned'];
	if (this.meshDict[id]['pinned']) {
		this.pinned.add(id)
	} else {
		this.pinned.delete(id)
	}

	if (this.pinned.size == 0)
		this.resetOpacity();
	else {
		var val = (this.meshDict[id]['pinned']) ? 0.8 : 0.2;
		for (i in this.meshDict[id].object.children)
			this.meshDict[id].object.children[i].material.opacity = val;
	}
}

View3D.prototype.unpinAll = function() {

	for (let key of this.pinned.values())
		this.meshDict[key]['pinned'] = false;
	this.pinned.clear();
	this.resetOpacity();
}


View3D.prototype.createToolTip = function() {
	this.toolTipDiv = document.createElement('div');
	this.toolTipDiv.id = 'toolTip';
	this.toolTipDiv.style.cssText = 'position: fixed; text-align: center; width: auto; height: 80px; padding: 2px; font: 12px arial; z-index: 999; background: lightgreen; border: 0px; border-radius: 8px; pointer-events: none; opacity: 0.0;';
	this.toolTipDiv.style.transition = "opacity 0.5s";
	document.body.appendChild(this.toolTipDiv);
}

View3D.prototype.show3dToolTip = function (d) {
	this.toolTipDiv.style.opacity = .9;
	this.toolTipDiv.style.left = this.toolTipPos.x + "px";
	this.toolTipDiv.style.top = this.toolTipPos.y + "px";
	this.toolTipDiv.innerHTML = d;
}

View3D.prototype.hide3dToolTip = function () {
	this.toolTipDiv.style.opacity = 0.0;
}
