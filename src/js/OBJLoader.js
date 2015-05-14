OBJLoader = function(manager) {
    this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
}

OBJLoader.prototype = {
    constrcutor: OBJLoader,
    load: function(url, onLoad, onProgress, onError) {
        var scope = this;

        var loader = new THREE.XHRLoader( scope.manager );
        loader.setCrossOrigin( this.crossOrigin );
        loader.load( url, function ( text ) {

            onLoad( scope.parse( text ) );

        }, onProgress, onError );
    },

    parse:function(text) {
        console.time( 'OBJLoader' );

        var vertices = [];
        var normals = [];
        var uvs = [];

        // v float float float

        var vertex_pattern = /v( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)( +[\d|\.|\+|\-|e|E]+)/;


        // f vertex vertex vertex ...

        var face_pattern1 = /f( +-?\d+)( +-?\d+)( +-?\d+)( +-?\d+)?/;

        // f vertex/uv vertex/uv vertex/uv ...

        var face_pattern2 = /f( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+))?/;

        // f vertex/uv/normal vertex/uv/normal vertex/uv/normal ...

        var face_pattern3 = /f( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))( +(-?\d+)\/(-?\d+)\/(-?\d+))?/;

        // f vertex//normal vertex//normal vertex//normal ...

        var face_pattern4 = /f( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))( +(-?\d+)\/\/(-?\d+))?/;

        var object, objects = [];
        var geometry, material;

        function parseVertexIndex( value ) {

            var index = parseInt( value );

            return index - 1;

        }

        function addVertex( x, y, z ) {

            geometry.vertices.push(
                new THREE.Vector3(x,y,z)
            );

        }

        function addFace(a, b, c) {

            var ia = parseVertexIndex( a );
            var ib = parseVertexIndex( b );
            var ic = parseVertexIndex( c );    

            geometry.faces.push( new THREE.Face3( ia, ib, ic ) );            
        }

        // create mesh if no objects in text

        if ( /^o /gm.test( text ) === false ) {

            geometry = new THREE.Geometry();

            material = {
                name: ''
            };

            object = {
                name: '',
                geometry: geometry,
                material: material
            };

            objects.push( object );

        }

       

        var lines = text.split( '\n' );

        for ( var i = 0; i < lines.length; i ++ ) {

            var line = lines[ i ];
            line = line.trim();

            var result;

            if ( line.length === 0 || line.charAt( 0 ) === '#' ) {

                continue;

            } else if ( ( result = vertex_pattern.exec( line ) ) !== null ) {

                // ["v 1.0 2.0 3.0", "1.0", "2.0", "3.0"]

                addVertex(
                    parseFloat( result[ 1 ] ),
                    parseFloat( result[ 2 ] ),
                    parseFloat( result[ 3 ] )
                );

             } else if ( ( result = face_pattern1.exec( line ) ) !== null ) {

                // ["f 1 2 3", "1", "2", "3", undefined]

                addFace(
                    result[ 1 ], result[ 2 ], result[ 3 ], result[ 4 ]
                );

            } else if ( ( result = face_pattern2.exec( line ) ) !== null ) {

                // ["f 1/1 2/2 3/3", " 1/1", "1", "1", " 2/2", "2", "2", " 3/3", "3", "3", undefined, undefined, undefined]

                addFace(
                    result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
                    result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
                );

            } else if ( ( result = face_pattern3.exec( line ) ) !== null ) {

                // ["f 1/1/1 2/2/2 3/3/3", " 1/1/1", "1", "1", "1", " 2/2/2", "2", "2", "2", " 3/3/3", "3", "3", "3", undefined, undefined, undefined, undefined]

                addFace(
                    result[ 2 ], result[ 6 ], result[ 10 ], result[ 14 ],
                    result[ 3 ], result[ 7 ], result[ 11 ], result[ 15 ],
                    result[ 4 ], result[ 8 ], result[ 12 ], result[ 16 ]
                );

            } else if ( ( result = face_pattern4.exec( line ) ) !== null ) {

                // ["f 1//1 2//2 3//3", " 1//1", "1", "1", " 2//2", "2", "2", " 3//3", "3", "3", undefined, undefined, undefined]

                addFace(
                    result[ 2 ], result[ 5 ], result[ 8 ], result[ 11 ],
                    undefined, undefined, undefined, undefined,
                    result[ 3 ], result[ 6 ], result[ 9 ], result[ 12 ]
                );
            } else {

                // console.log( "THREE.OBJLoader: Unhandled line " + line );

            }
        } // end for each line

        var container = new THREE.Object3D();

        for ( var i = 0, l = objects.length; i < l; i ++ ) {

            object = objects[ i ];                     

            material = new THREE.MeshPhongMaterial({
                 color: 0x996633, 
            specular: 0x050505,
            shininess: 50});
            material.name = object.material.name;

            object.geometry.computeFaceNormals ();
            //object.geometry.computeVertexNormals ();
            object.geometry.verticesNeedUpdate = true;
            object.geometry.elementsNeedUpdate = true;
            object.geometry.normalsNeedUpdate = true;

            var mesh = new THREE.Mesh( object.geometry, material );
            mesh.name = object.name;

            container.add( mesh );

        }

        console.timeEnd( 'OBJLoader' );

        return container;


    }


}