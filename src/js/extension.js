// set this matrix to a transform matrix that
// rotatie around a line segment for theta radian
// p1 : THREE.Vector3, start
// p2 : THREE.Vector3, end
// theta : rotation angle in radian
THREE.Matrix4.prototype.makeTransform = function(p1, p2, theta) {    
    var a = p1.x;
    var b = p1.y;
    var c = p1.z;

    var p = new THREE.Vector3();
    p.subVectors(p2, p1);
    p = p.normalize();

    var u = p.x;
    var v = p.y;
    var w = p.z;

    var uu = u * u;
    var uv = u * v;
    var uw = u * w;
    var vv = v * v;
    var vw = v * w;
    var ww = w * w;
    var au = a * u;
    var av = a * v;
    var aw = a * w;
    var bu = b * u;
    var bv = b * v;
    var bw = b * w;
    var cu = c * u;
    var cv = c * v;
    var cw = c * w;

    var costheta = Math.cos(theta);
    var sintheta = Math.sin(theta);

    var n11 = uu + (vv + ww) * costheta;
    var n21 = uv * (1 - costheta) + w * sintheta;
    var n31 = uw * (1 - costheta) - v * sintheta;
    var n41 = 0;

    var n12 = uv * (1 - costheta) - w * sintheta;
    var n22 = vv + (uu + ww) * costheta;
    var n32 = vw * (1 - costheta) + u * sintheta;
    var n42 = 0;

    var n13 = uw * (1 - costheta) + v * sintheta;
    var n23 = vw * (1 - costheta) - u * sintheta;
    var n33 = ww + (uu + vv) * costheta;
    var n43 = 0;

    var n14 = (a * (vv + ww) - u * (bv + cw)) * (1 - costheta) + (bw - cv) * sintheta;
    var n24 = (b * (uu + ww) - v * (au + cw)) * (1 - costheta) + (cu - aw) * sintheta;
    var n34 = (c * (uu + vv) - w * (au + bv)) * (1 - costheta) + (av - bu) * sintheta;
    var n44 = 1;

    this.set ( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 );

    return this;
}