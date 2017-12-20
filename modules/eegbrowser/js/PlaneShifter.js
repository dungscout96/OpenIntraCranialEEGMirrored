(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.PlaneShifter = global.PlaneShifter || {})));
}(this, (function (exports) { 'use strict';

/*
* Author   Jonathan Lurie - http://me.jonahanlurie.fr
* License  MIT
* Link      https://github.com/jonathanlurie/PlaneDrag
* Lab       MCIN - Montreal Neurological Institute
*/


// the jacky way to get THREE from a browser or npm
var TROIS = null;


/**
* PlaneShifter is an helper for TROIS.Object3D that contains 3 orthogonal planes.
* The purpose is to make an easy translation of the whole container along each plane's normal vector, 
* and the same for rotation.
* The module THREE must be defined in advanced.
*/
class PlaneShifter {
  
  /**
  * @param {THREE.Object3D} planeContainer - an object that contains 3 orthogonal planes
  * @param {THREE.Camera} camera - camera
  * @param {Object} options - {mouse: THREE.Vector2, control: THREE.OrbitControl, rotationKey: String, translationKey: String}. 
  * Default values: rotationKey="KeyR" translationKey="KeyT"
  */
  constructor( planeContainer, camera, options = {}){
    this._requireThree();
    
    this._enabled = true;
    
    // contains the three planes
    this._planeContainer = planeContainer;
    
    // camera we use to cast rays
    this._camera = camera;
    
    // orbit control or trackball control
    this._controls = this._getOption(options, "controls", null);
    
    // the mouse coord can be passed by an extenal pointer
    this._mouse = this._getOption(options, "mouse", new TROIS.Vector2(Infinity, Infinity));
    this._useReferenceMouse = !!(options.mouse);
    
    // 3D position (world) of the clicking
    this._pointClicked3D = null;
    
    // equivalent to _pointClicked3D but in screen coordinates
    this._pointClicked2D = null;
    
    // to cast rays
    this._raycaster = new TROIS.Raycaster();
    
    // if true, the camera will follow the center of the container
    this._cameraFollowObject = false;
    
    // keep track of what keyboard/mouse key is pressed. In the form {"KeyT": true, "mouse": false} 
    this._keyPressed = {};
    
    // distance from the plane container to the camera
    this._originalDistanceToCam = this._camera.position.clone().sub( this._planeContainer.position ).length();
    
    // for the picker AND the shift. default is from -Infinity to +Infinity
    this._boundingBox = new TROIS.Box3( new TROIS.Vector3(-Infinity, -Infinity, -Infinity), new TROIS.Vector3(Infinity, Infinity, Infinity));
    
    // values involved in the rotation
    this._rotateConfig = {};
    
    // values involved in the rotation
    this._shiftConfig = {};
    
    // list of possible states
    this._states = {IDLE:0, TRANSLATION: 1, ROTATION:2};
    
    // current state
    this._activeState = this._states.IDLE;
    
    var rotationKey = this._getOption(options, "rotationKey", "KeyR");
    var translationKey = this._getOption(options, "rotationKey", "KeyT");
    
    // keys associated with states
    this._keysStates = {};
    this._keysStates[ rotationKey ] = this._states.ROTATION;
    this._keysStates[ translationKey ] = this._states.TRANSLATION;
    
    this._initNormals();
    this._initEvents();
    
    // all the following are array of events
    this._customEvents = {
      startInteraction: [],
      stopInteraction: [],
      rotation: [],
      translation: []
    };
    
  }
  

  /**
  * [PRIVATE]
  * Hacky way to make sure THREE is around, from with a browser or a npm package
  */
  _requireThree(){
    try {
      TROIS = (window && window.THREE) || require('three');
    } catch(e) {
      // here, window.THREE does not exist (or not yet)
      
      // trying to require
      try {
        TROIS = require("three"); 
      } catch (e) {
        // here, require is not possible (we are certainly in a browser)
        console.error( e );
      }
    }
  }
  
  
  /**
  * [PRIVATE]
  * get a value from the option argument in the constructor
  */
  _getOption(optionsObject, key, defaultValue){
    if(!optionsObject)
      return defaultValue;
      
    return optionsObject[ key ] || defaultValue;
  }
  
  
  /**
  * Define a boundingbox to restrict the raycasting and the shift
  * @param {TROIS.Box3} b - bounding box
  */
  setBoundingBox( b ){
    this._boundingBox = b.clone();
  }
  
  
  /**
  * [PRIVATE]
  * initialize a normal vector for each plane
  */
  _initNormals(){
    this._planeContainer.children.forEach( function(plane){
      plane.userData.normalV = new TROIS.Vector3(0, 0, 1).applyQuaternion(plane.quaternion).normalize();
    });
  }
  
  
  /**
  * [PRIVATE]
  * Initialize all the mouse/keyboard events
  */
  _initEvents(){
    window.addEventListener( 'mousemove', this._onMouseMove.bind(this), false );
    window.addEventListener( 'mousedown', this._onMouseDown.bind(this), false );
    window.addEventListener( 'mouseup', this._onMouseUp.bind(this), false );
    window.addEventListener( 'keyup', this._onKeyUp.bind(this), false );
    window.addEventListener( 'keydown', this._onKeyDown.bind(this), false );
  }
  
  
  /**
  * [PRIVATE - EVENT]
  * when mouse is moving, refreshes the internal normalized mouse position
  */
  _onMouseMove( evt ){
    if( !this._enabled )
      return;
    
    // do not recompute the unit mouse coord if we use an external mouse reference
    if(!this._useReferenceMouse){
      this._mouse.x = ( evt.clientX / window.innerWidth ) * 2 - 1;
      this._mouse.y = - ( evt.clientY / window.innerHeight ) * 2 + 1;
    }
    
    this._followInteraction();
  }
  
  
  /**
  * [PRIVATE - EVENT]
  * when mouse is clicked, cast a ray if the right keyboard key is maintained pushed
  */
  _onMouseDown( evt ){
    if( !this._enabled )
      return;
      
    this._keyPressed.mouse = true;
      
    if( this._activeState != this._states.IDLE )
      this._raycast();
  }
  
  
  /**
  * [PRIVATE - EVENT]
  * when mouse is releasing
  */
  _onMouseUp( evt ){
    if( !this._enabled )
      return;
      
    this._keyPressed.mouse = false;
    this._interacting = false;
  }
  
  
  /**
  * [PRIVATE]
  * tell if a key from the keyboard is pressed
  * @param {String} keycode - the keycode of the keypressed
  * @return {Boolean} true if yes, false if not
  */
  _isKeyPressed( keycode ){
    return ((keycode in this._keyPressed ) && this._keyPressed[keycode]);
  }
  
  
  /**
  * [PRIVATE - EVENT]
  * when a key from the keyboard is pressed. Refreshes the current state
  */
  _onKeyUp( evt ){
    if( !this._enabled )
      return;
      
    this._keyPressed[ evt.code ] = false;
    this._evaluateCurentState();
  }
  
  
  /**
  * [PRIVATE - EVENT]
  * when a key from the keyboard is released. Refreshes the current state
  */
  _onKeyDown( evt ){
    if( !this._enabled )
      return;
      
    this._keyPressed[ evt.code ] = true;
    this._evaluateCurentState();
  }


  /**
  * [PRIVATE]
  * Evaluate the current state and enable or disable the control upon this state
  */
  _evaluateCurentState(){
    var previousState = this._activeState;
    this._activeState = this._states.IDLE;
    
    var listOfKeys = Object.keys( this._keysStates );
    
    for(var i=0; i<listOfKeys.length; i++){
      if( listOfKeys[i] in this._keyPressed ){
        if( this._keyPressed[ listOfKeys[i] ] ){
          this._activeState = this._keysStates[ listOfKeys[i] ];
          break;
        }
      }
    }  
    
    // to trigger only once
    if( previousState != this._activeState){
      if( this._activeState == this._states.IDLE ){
        this._enableControl();
        this._triggerEvents( "stopInteraction" );
      }else{
        this._disableControl();
        this._triggerEvents( "startInteraction" );
      } 
    }
    
    
  }
  
  
  /**
  * Whether or not the camera should follow the object
  * @param {Boolean} b - true to follow, false to not follow
  */
  setCameraFollowObject(b){
    this._cameraFollowObject = b;
  }
  
  
  /**
  * [PRIVATE]
  * Get screen coordinates of a 3D position
  * @param {TROIS.Vector3} coord3D - 3D position.
  * Note: the project method is not reliable when the point is out of screen
  */
  _getScreenCoord(coord3D){
    var tempVector =  coord3D.clone();
    tempVector.project( this._camera );
    return new TROIS.Vector2(tempVector.x, tempVector.y);
  }
  
  
  /**
  * [PRIVATE]
  * Performs a raycasting on the children of the plane container, then based on the
  * active state, take a decision of what to do.
  */
  _raycast(){
    this._raycaster.setFromCamera( this._mouse, this._camera );
    var intersects = this._raycaster.intersectObject( this._planeContainer, true );
    
    for(var i=0; i<intersects.length; i++){
      if( this._boundingBox.containsPoint( intersects[i].point) ){

        switch (this._activeState) {
          case this._states.TRANSLATION :
            this._castedRayForTranslation( intersects[i] );
            break;
            
          case this._states.ROTATION :
            this._castedRayForRotation( intersects[i] );
            break
            
          default:
            
        }
        
        break;
      }
    }
    
  }
  
  
  /**
  * [PRIVATE]
  * Deals with an intersection in the context of a translation
  * @param {Object} intersect - result from a TROIS.Raycaster.intersectObject
  * (not the array, but rather the single object)
  */
  _castedRayForTranslation( intersect ){
    this._interacting = true;
    var intersectPlane = intersect.object;
    this._shiftConfig.originalObjectPosition = this._planeContainer.position.clone();
    
    this._shiftConfig.hitPoint3D = intersect.point.clone();
    this._shiftConfig.hitPoint2D = this._mouse.clone();  //this._getScreenCoord( this._shiftConfig.hitPoint3D );
    this._shiftConfig.planeNormalInternal3D = intersectPlane.userData.normalV.clone();
    this._shiftConfig.planeNormalWorld3D = intersectPlane.userData.normalV.clone().applyQuaternion(this._planeContainer.quaternion).normalize();
    this._shiftConfig.topPoint3D = this._shiftConfig.hitPoint3D.clone().add( this._shiftConfig.planeNormalWorld3D );
    this._shiftConfig.topPoint2D = this._getScreenCoord( this._shiftConfig.topPoint3D );
    
    // this one is not normalized in 2D because we need the real projection from the normalized 3D vector
    this._shiftConfig.planeNormal2D = new TROIS.Vector2( 
      this._shiftConfig.topPoint2D.x - this._shiftConfig.hitPoint2D.x,
      this._shiftConfig.topPoint2D.y - this._shiftConfig.hitPoint2D.y );
    
    this._shiftConfig.hitPoint3DInternal = this._planeContainer.worldToLocal( intersect.point.clone() );
  }
  
  
  /**
  * [PRIVATE]
  * Continue the interaction (but mostly decide which kind and delegate the work)
  */
  _followInteraction(){
    if( ! this._interacting )
      return;
      
    switch (this._activeState) {
      case this._states.TRANSLATION :
        this._followTranslation();
        break;
        
      case this._states.ROTATION :
        this._followRotation();
        break
        
      default:
        
    }
  }


  /**
  * [PRIVATE]
  * When a translation has started, this method keep updating the position of the
  * shifting plane.
  */
  _followTranslation(){

    // the 2D shift performed by the mouse since the last hit  
    var mouseShift = new TROIS.Vector2(
      this._mouse.x - this._shiftConfig.hitPoint2D.x,
      this._mouse.y - this._shiftConfig.hitPoint2D.y
    );
    
    // we are weighting the shift by the the camera distance ratio compared to the initial camera distance
    var newContainerToCamDistance = this._camera.position.clone().sub( this._planeContainer.position ).length();

    var normal2DLengthOnScreen = this._shiftConfig.planeNormal2D.length();
    var normalFactor = mouseShift.dot( this._shiftConfig.planeNormal2D.clone().normalize() ) / normal2DLengthOnScreen;
    var shift3D = this._shiftConfig.planeNormalWorld3D.clone().multiplyScalar( normalFactor );
    
    var newPosition = new TROIS.Vector3(
      this._shiftConfig.originalObjectPosition.x + shift3D.x,
      this._shiftConfig.originalObjectPosition.y + shift3D.y,
      this._shiftConfig.originalObjectPosition.z + shift3D.z
    );
    
    if(this._boundingBox.containsPoint( newPosition ) ){
      this._planeContainer.position.set(
        this._shiftConfig.originalObjectPosition.x + shift3D.x,
        this._shiftConfig.originalObjectPosition.y + shift3D.y,
        this._shiftConfig.originalObjectPosition.z + shift3D.z
      );
      
      // trigger the event
      this._triggerEvents( "translation" );
    }
    
    if( this._cameraFollowObject ){
      this._camera.lookAt( this._planeContainer.position );
    }
    
  }
  
  
  /**
  * [PRIVATE]
  * Disable the orbit/trackball control
  */
  _disableControl(){
    if(!this._controls)
      return;
      
    if(this._controls.enabled){
      this._saveOrbitData();
    }
      
    this._controls.enabled = false;
  }
  
  
  /**
  * [PRIVATE]
  * enable the orbit/trackball control
  */
  _enableControl(){
    if(!this._controls)
      return;
      
    // if already enables
    if( this._controls.enabled )
      return;
      
    this._controls.enabled = true;
    this._restoreOrbitData();
      
  }
  
  
  /**
  * [PRIVATE]
  * Helper method to call before disabling the controls
  */
  _saveOrbitData(){
    this._orbitData = {
      target: new TROIS.Vector3(),
      position: new TROIS.Vector3(),
      zoom: this._controls.object.zoom
    };

    this._orbitData.target.copy(this._controls.target);
    this._orbitData.position.copy(this._controls.object.position);
  }


  /**
  * [PRIVATE]
  * Helper method to call before re-enabling the controls
  */
  _restoreOrbitData(){
    this._controls.position0.copy(this._orbitData.position);
    
    if(this._cameraFollowObject){
      this._controls.target0.copy(this._planeContainer.position);
    }else{
      this._controls.target0.copy(this._orbitData.target);
    }
    
    this._controls.zoom0 = this._orbitData.zoom;
    this._controls.reset();
  }
  
  
  /**
  * [PRIVATE]
  * Deals with an intersection in the context of a rotation
  * @param {Object} intersect - result from a TROIS.Raycaster.intersectObject
  * (not the array, but rather the single object)
  */
  _castedRayForRotation( intersect ){
    this._interacting = true;
    var intersectPlane = intersect.object;
    this._rotateConfig.originalObjectRotation = this._planeContainer.rotation.clone();

    this._rotateConfig.hitPoint2D = this._mouse.clone(); 
    this._rotateConfig.planeNormalInternal3D = intersectPlane.userData.normalV.clone();
    this._rotateConfig.planeNormalWorld3D = intersectPlane.userData.normalV.clone().applyQuaternion(this._planeContainer.quaternion).normalize();
    this._rotateConfig.center3D = this._planeContainer.getWorldPosition();
    this._rotateConfig.center2D = this._getScreenCoord( this._rotateConfig.center3D );
    
    this._rotateConfig.cameraObjectVector = new TROIS.Vector3( 
      this._camera.position.x - this._rotateConfig.center3D.x,
      this._camera.position.y - this._rotateConfig.center3D.y,
      this._camera.position.z - this._rotateConfig.center3D.z
    ).normalize();
    
    // if the plane if facing front or back the camera, we have to apply a diferent sign to the rotation
    this._rotateConfig.cameraSign = Math.sign( this._rotateConfig.planeNormalWorld3D.dot( this._rotateConfig.cameraObjectVector ) );
    
  }
  

  /**
  * [PRIVATE]
  * When a translation has started, this method keep updating the position of the
  * shifting plane.
  */
  _followRotation(){
    var center = this._rotateConfig.center2D;
    var start = this._rotateConfig.hitPoint2D;
    var current = this._mouse.clone();
    
    var centerToStart = new TROIS.Vector3(
      start.x - center.x,
      start.y - center.y,
      start.z - center.z
    ).normalize();
    
    var centerToCurrent = new TROIS.Vector3(
      current.x - center.x,
      current.y - center.y,
      current.z - center.z
    ).normalize();
    
    // the rotation angle (unsigned)
    var angleRad = Math.acos( centerToStart.dot(centerToCurrent) );
    
    // the rotation direction depends on the normal of the angle
    var angleDirection = Math.sign( centerToStart.cross(centerToCurrent).z );

    // reseting from the original position (we dont play with little deltas here!)
    this._planeContainer.rotation.set(
      this._rotateConfig.originalObjectRotation.x,
      this._rotateConfig.originalObjectRotation.y,
      this._rotateConfig.originalObjectRotation.z
    );

    this._planeContainer.rotateOnAxis(this._rotateConfig.planeNormalInternal3D,  angleRad * angleDirection * this._rotateConfig.cameraSign );
    
    // trigger the event
    this._triggerEvents( "rotation" );
  }
  
  
  /**
  * Enable or disable the PlaneShifter instance
  * @param {Boolean} bool - true: enable, false: disable
  */
  enable( bool ){
    this._enabled = bool;
  }
  
  
  /**
  * specify an event
  */
  on( eventName, callback ){
    if(typeof(callback) === 'function'){
      if( eventName in this._customEvents ){
        this._customEvents[ eventName ].push( callback );
      }
    }
  }
  
  
  _triggerEvents( eventName ){
    if( eventName in this._customEvents ){
      var events = this._customEvents[eventName];
      
      for(var i=0; i<events.length; i++){
        events[i]();
      }
    }
  }
  
} /* END of class PlaneShifter */

exports.PlaneShifter = PlaneShifter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=PlaneShifter.js.map
