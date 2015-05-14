// inflate the current geometry
// org : original mesh
// cur : current mesh
// p : pressure
// E : Young's modulus
// step : step for apply the force

function inflate(org, cur, p, E, step) {
	// forces vector
	var forces = [];
	
	// init forces
	for(var i=0;i<cur.vertices.length;++i) {
		forces.push(new THREE.Vector3(0,0,0));
	}

	// compute forces by pressure
	for(var i=0;i<cur.faces.length;++i) {
		var face = cur.faces[i];
		var force = face.normal.clone().multiplyScalar(face.area(cur)*p);
		forces[face.a].add(force);
		forces[face.b].add(force);
		forces[face.c].add(force);
	}

	// compute forces by elastic deformation
	for(var i=0;i<cur.faces.length;++i) {
		var cur_face = cur.faces[i];				
		var org_face = org.faces[i];
		var es = [org_face.a, org_face.b, org_face.c];

		for(var j=1;j<=3;++j) {
			var cur_e = cur.vertices[es[j%3]].clone().sub(cur.vertices[es[j-1]]);
			var org_e = org.vertices[es[j%3]].clone().sub(org.vertices[es[j-1]]);
			var delta_l = cur_e.length() - org_e.length();
			// only consider streched...
			if(delta_l<0) continue;

			var force = cur_e.clone().setLength(delta_l*E);

			// add forces on the vertices
			forces[es[j-1]].add(force);
			forces[es[j%3]].sub(force);
		}
	}

	// apply forces
	var out = cur.clone();
	var sum_moved = 0;

	for(var i=0;i<forces.length;++i) {
		var v = out.vertices[i];
		var force = forces[i].clone();
		var displacement = force.multiplyScalar(step);
		sum_moved += displacement.length();
		v.add(displacement);
	}

	console.log('total displacement = ' + sum_moved);

	return out;
}

// measure the number of hyperbolic vertices in the mesh
function measure_hyperbolic(g)  {
	//TODO
	console.log('haha');
}