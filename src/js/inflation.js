// inflate the current geometry
// org : original mesh
// cur : current mesh
// p : pressure
// E : Young's modulus
// step : step for apply the force
// stiffRatio: ratio between rigid and flexibale edges...
function inflate(org, cur, p, E, step, stiffRatio) {
	// forces vector
	var forces = [];
	var angles = measure_hyperbolic(cur)[0];
	
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

	//	compute forces by elastic deformation
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

			var factor = 1.0;
			if(angles[es[j%3]] < 2*Math.PI) factor *= stiffRatio;
			if(angles[es[j-1]] < 2*Math.PI) factor *= stiffRatio;


			var force = cur_e.clone().setLength(Math.abs(delta_l)*E*factor);			

			// add forces on the vertices
			forces[es[j-1]].add(force);
			forces[es[j%3]].sub(force);
		}
	}

	// // apply forces by vertex displacement
	// for(var i=0;i<cur.vertices.length;++i) {
	// 	var cur_v = cur.vertices[i];				
	// 	var org_v = org.vertices[i];
	// 	var delta_v = cur_v.clone().sub(org_v);
	// 	var delta_l = delta_v.length();
	// 	// only consider streched...
	// 	if(delta_l<0) continue;

	// 	var factor = 1.0;
	// 	if(angles[i] < 2*Math.PI) factor *= stiffRatio;
	// 	if(angles[i] < 2*Math.PI) factor *= stiffRatio;


	// 	var force = delta_v.clone().negate().setLength(Math.abs(delta_l)*E*factor);			

	// 	// add forces on the vertex
	// 	forces[i].add(force);		
	// }


	// apply forces	
	var sum_moved = 0;

	for(var i=0;i<forces.length;++i) {
		var v = cur.vertices[i];
		var force = forces[i].clone();
		var displacement = force.multiplyScalar(step);
		sum_moved += displacement.length();
		v.add(displacement);
	}

	console.log('total displacement = ' + sum_moved);
}

// measure the number of hyperbolic vertices in the mesh
function measure_hyperbolic(g)  {
	var angles = [];
	var count = 0;

	// init sum of angles
	for(var i=0;i<g.vertices.length;++i)
		angles.push(0);

	// compute forces by elastic deformation
	for(var i=0;i<g.faces.length;++i) {
		var face = g.faces[i];					
		
		var e1 = g.vertices[face.b].clone().sub(g.vertices[face.a]).length();
    	var e2 = g.vertices[face.c].clone().sub(g.vertices[face.b]).length();
    	var e3 = g.vertices[face.a].clone().sub(g.vertices[face.c]).length();

    	var angle1 = Math.acos((e1*e1 + e3*e3 - e2*e2) / 2 / e1 / e3);
    	var angle2 = Math.acos((e1*e1 + e2*e2 - e3*e3) / 2 / e1 / e2);
    	var angle3 = Math.acos((e2*e2 + e3*e3 - e1*e1) / 2 / e2 / e3);

    	angles[face.a] += angle1;
    	angles[face.b] += angle2;
    	angles[face.c] += angle3;
	}

	for(var i=0;i<angles.length;++i) {
		if(angles[i]>Math.PI*2) count++;
	}

	return [angles, count];
}