// inflate the current geometry
// org : original mesh
// cur : current mesh
// p : pressure
// E : Young's modulus
// step : step for apply the force
// stiffRatio: ratio between rigid and flexible edges...
function inflate(org, cur, p, E, step, stiffRatio) {
	// forces vector
	var forces = [];
	var result = measure_section_angles(cur);
	var section_angles = result.section_angles;
	var sum_section_angles = result.sums;

	var edges = measure_folding_angles(cur);
	var concave_edges = countIf(edges, function(obj){return obj.folding_angle<0;});

	console.log('concave_edges = ' + concave_edges);
	
	// init forces
	for(var i=0;i<cur.vertices.length;++i) {
		forces.push(new THREE.Vector3(0,0,0));
	}

	// compute forces by pressure
	for(var i=0;i<cur.faces.length;++i) {
		var face = cur.faces[i];
		//var force = face.normal.clone().multiplyScalar(face.area(cur)*p);
		//don't times area
		var force = face.normal.clone().multiplyScalar(p);
		forces[face.a].add(force.clone().multiplyScalar(section_angles[i][0]/sum_section_angles[face.a]));
		forces[face.b].add(force.clone().multiplyScalar(section_angles[i][1]/sum_section_angles[face.b]));
		forces[face.c].add(force.clone().multiplyScalar(section_angles[i][2]/sum_section_angles[face.c]));
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

			
			var vid1 = es[j-1];
			var vid2 = es[j%3];
			var min_vid = Math.min(es[j%3], es[j-1]);
			var max_vid = Math.max(es[j%3], es[j-1]);
			var key = min_vid + '_' + max_vid;
			var edge = edges[key];

			var factor = 1.0;
			// if(angles[es[j%3]] < 2*Math.PI) factor *= stiffRatio;
			// if(angles[es[j-1]] < 2*Math.PI) factor *= stiffRatio;
			if(edge.folding_angle > 0) factor = stiffRatio;


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

	return sum_moved;
}

// measure the section of each vertex
function measure_section_angles(g)  {
	var sums = [];
	var section_angles = [];
	var count = 0;

	// init sum of angles
	for(var i=0;i<g.vertices.length;++i)
		sums.push(0);

	// compute forces by elastic deformation
	for(var i=0;i<g.faces.length;++i) {
		var face = g.faces[i];					
		
		var e1 = g.vertices[face.b].clone().sub(g.vertices[face.a]).length();
    	var e2 = g.vertices[face.c].clone().sub(g.vertices[face.b]).length();
    	var e3 = g.vertices[face.a].clone().sub(g.vertices[face.c]).length();

    	var angle1 = Math.acos((e1*e1 + e3*e3 - e2*e2) / 2 / e1 / e3);
    	var angle2 = Math.acos((e1*e1 + e2*e2 - e3*e3) / 2 / e1 / e2);
    	var angle3 = Math.acos((e2*e2 + e3*e3 - e1*e1) / 2 / e2 / e3);

    	sums[face.a] += angle1;
    	sums[face.b] += angle2;
    	sums[face.c] += angle3;

    	section_angles.push([angle1, angle2, angle3]);
	}

	for(var i=0;i<sums.length;++i) {
		if(sums[i]>Math.PI*2) count++;
	}

	var result =  {
		sums: sums, 
		count: count,
		section_angles: section_angles
	};

	return result;
}

// measure the folding angle for each edge
// return [{vid1, vid2, folding_angle}]
function measure_folding_angles(g) {
	var folding_angles = [];
	var edges = {};	
	var eid = 0;

	for(var i=0;i<g.faces.length;++i) {
		var face = g.faces[i];

		var vids = [face.a, face.b, face.c];

		for(var j=1;j<=3;++j) {
			var vid1 = vids[j-1];
			var vid2 = vids[j%3];
			var min_vid = Math.min(vids[j%3], vids[j-1]);
			var max_vid = Math.max(vids[j%3], vids[j-1]);
			var key = min_vid + '_' + max_vid;

			// folding edge shared by tow faces
			if (key in edges) {
				var edge = edges[key];
				edge.fids.push(i);

				// get two faces
				var f1 = g.faces[edge.fids[0]];
				var f2 = g.faces[edge.fids[1]];

				var dot = f1.normal.dot(f2.normal);

				var folding_angle = 0.0;				
				if(Math.abs(dot) < 1e-6) {
					// flat, do nothing	
				} else {
					folding_angle = Math.acos(dot);

					var cp = f1.normal.clone().cross(f2.normal);

					var sign = cp.clone().dot(edge.dir) > 0;

					if(!sign) folding_angle *= -1;
				}

				edge.folding_angle = folding_angle;

			} else {
				edges[key] = {
					vid1 : vid1,
					vid2 : vid2,
					dir  : g.vertices[vid2].clone().sub(g.vertices[vid1]),
					eid  : eid++,
					fids : [i]
				};
			}
		}
	}

	return edges;
}