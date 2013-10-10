/**
 * Geopoint widget(s)
 */

( function( factory ) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD. Register as an anonymous module.
    define( [ 'jquery' ], factory );
  } else {
    // Browser globals
    factory( jQuery );
  }
}( function( $ ) {
  "use strict";
  /**
   * Geopoint widget Class
   * @constructor
   * @param {[type]} element [description]
   * @param {[type]} options [description]
   */
  var Geopointpicker = function( element, options ) {
    var detect =
      '<button name="geodetect" type="button" class="btn" title="detect current location" data-placement="top">' +
      '<i class="icon-crosshairs"></i></button>',
      search =
        '<div class="input-append">' +
        '<input class="geo ignore" name="search" type="text" placeholder="search for place or address" disabled="disabled"/>' +
        '<button type="button" class="btn add-on"><i class="icon-search"></i>' +
        '</div>',
      map = '<div class="map-canvas-wrapper"><div class="map-canvas"></div></div>';
    this.$inputOrigin = $( element );
    this.$form = this.$inputOrigin.closest( 'form' );
    this.$widget = $(
      '<div class="geopoint widget">' +
      '<div class="search-bar no-search-input no-map"></div>' +
      '<div class="geo-inputs">' +
      '<label class="geo">latitude (x.y &deg;)<input class="ignore" name="lat" type="number" step="0.0001" /></label>' +
      '<label class="geo">longitude (x.y &deg;)<input class="ignore" name="long" type="number" step="0.0001" /></label>' +
      '<label class="geo"><input class="ignore" name="alt" type="number" step="0.1" />altitude (m)</label>' +
      '<label class="geo"><input class="ignore" name="acc" type="number" step="0.1" />accuracy (m)</label>' +
      '</div>' +
      '</div>'
    );
    //if geodetection is supported, add the button
    if ( navigator.geolocation ) {
      this.$widget.find( '.search-bar' ).append( detect );
      this.$detect = this.$widget.find( 'button[name="geodetect"]' );
    }
    //if not on a mobile device, add the search field
    if ( options.touch !== true ) {
      this.$widget.find( '.search-bar' ).removeClass( 'no-search-input' ).append( search );
      this.$search = this.$widget.find( '[name="search"]' );
    }
    //if not on a mobile device or specifically requested, add the map canvas
    if ( options.touch !== true || ( options.touch === true && this.$inputOrigin.parents( '.jr-appearance-maps' ).length > 0 ) ) {
      this.$widget.find( '.search-bar' ).removeClass( 'no-map' ).after( map );
      this.$map = this.$widget.find( '.map-canvas' );
    }

    this.$lat = this.$widget.find( '[name="lat"]' );
    this.$lng = this.$widget.find( '[name="long"]' );
    this.$alt = this.$widget.find( '[name="alt"]' );
    this.$acc = this.$widget.find( '[name="acc"]' );

    this.$inputOrigin.hide( ).after( this.$widget );
    this.updateMapFn = "updateDynamicMap";
    this.touch = options.touch || false;
    this.init( );
  };

  Geopointpicker.prototype = {

    constructor: Geopointpicker,

    //TODO: this is where the Maps API script load function should be called
    init: function( ) {
      var that = this,
        inputVals = this.$inputOrigin.val( ).split( ' ' );

      this.$inputOrigin.parent( ).addClass( 'clearfix' );

      this.$widget.find( 'input:not([name="search"])' ).on( 'change change.bymap change.bysearch', function( event ) {
        //console.debug('change event detected');
        var lat = ( that.$lat.val( ) !== '' ) ? that.$lat.val( ) : 0.0,
          lng = ( that.$lng.val( ) !== '' ) ? that.$lng.val( ) : 0.0,
          alt = ( that.$alt.val( ) !== '' ) ? that.$alt.val( ) : 0.0,
          acc = that.$acc.val( ),
          value = ( lat === 0 && lng === 0 ) ? '' : lat + ' ' + lng + ' ' + alt + ' ' + acc;

        event.stopImmediatePropagation( );

        that.$inputOrigin.val( value ).trigger( 'change' );

        if ( event.namespace !== 'bymap' && event.namespace !== 'bysearch' ) {
          that.updateMap( lat, lng );
        }

        if ( event.namespace !== 'bysearch' && this.$search ) {
          that.$search.val( '' );
        }
      } );

      this.$widget.on( 'focus blur', 'input', function( event ) {
        that.$inputOrigin.trigger( event.type );
      } );

      if ( inputVals[ 3 ] ) this.$acc.val( inputVals[ 3 ] );
      if ( inputVals[ 2 ] ) this.$alt.val( inputVals[ 2 ] );
      if ( inputVals[ 1 ] ) this.$lng.val( inputVals[ 1 ] );
      if ( inputVals[ 0 ].length > 0 ) this.$lat.val( inputVals[ 0 ] ).trigger( 'change' );

      if ( this.$detect ) {
        this.enableDetection( );
      }

      if ( !this.touch ) {
        if ( that.dynamicMapAvailable( ) ) {
          that.updateMap( 0, 0, 1 );
          if ( that.$search ) {
            that.enableSearch( );
          }
        } else {
          this.$form.on( 'googlemapsscriptloaded', function( ) {
            if ( that.dynamicMapAvailable( ) ) {
              //default map view
              that.updateMap( 0, 0, 1 );
              if ( that.$search ) {
                that.enableSearch( );
              }
            }
          } );
        }
      } else if ( this.$map ) {
        this.updateMapFn = "updateStaticMap";
        this.updateMap( 0, 0, 1 );
        $( window ).on( 'resize', function( ) {
          var resizeCount = $( window ).data( 'resizecount' ) || 0;
          resizeCount++;
          $( window ).data( 'resizecount', resizeCount );
          window.setTimeout( function( ) {
            if ( resizeCount == $( window ).data( 'resizecount' ) ) {
              $( window ).data( 'resizecount', 0 );
              //do the things
              console.debug( 'resizing stopped' );
              that.updateMap( );
            }
          }, 500 );
        } );
      }
    },
    /**
     * Enables geo detection using the built-in browser geoLocation functionality
     */
    enableDetection: function( ) {
      var that = this;
      this.$detect.click( function( event ) {
        event.preventDefault( );
        navigator.geolocation.getCurrentPosition( function( position ) {
          that.updateMap( position.coords.latitude, position.coords.longitude );
          that.updateInputs( position.coords.latitude, position.coords.longitude, position.coords.altitude, position.coords.accuracy );
        } );
        return false;
      } );
    },
    /**
     * Enables search functionality using the Google Maps API v3
     */
    enableSearch: function( ) {
      var geocoder = new google.maps.Geocoder( ),
        that = this;
      this.$search.prop( 'disabled', false );
      this.$search.on( 'change', function( event ) {
        event.stopImmediatePropagation( );
        //console.debug('search field click event');
        var address = $( this ).val( );
        if ( typeof geocoder !== 'undefined' ) {
          geocoder.geocode( {
              'address': address,
              'bounds': that.map.getBounds( )
            },
            function( results, status ) {
              if ( status == google.maps.GeocoderStatus.OK ) {
                that.$search.attr( 'placeholder', 'search' );
                var loc = results[ 0 ].geometry.location;
                //console.log(loc);
                that.updateMap( loc.lat( ), loc.lng( ) );
                that.updateInputs( loc.lat( ), loc.lng( ), null, null, 'change.bysearch' );
              } else {
                that.$search.val( '' );
                that.$search.attr( 'placeholder', address + ' not found, try something else.' );
              }
            }
          );
        }
        return false;
      } );
    },
    /**
     * Whether google maps are available (whether scripts have loaded).
     */
    dynamicMapAvailable: function( ) {
      return ( this.$map && typeof google !== 'undefined' && typeof google.maps !== 'undefined' );
    },
    /**
     * Calls the appropriate map update function.
     * @param  {number=} lat  latitude
     * @param  {number=} lng  longitude
     * @param  {number=} zoom zoom level which defaults to 15
     */
    updateMap: function( lat, lng, zoom ) {
      if ( !this.$map ) {
        return;
      }
      lat = lat || Number( this.$lat.val( ) );
      lng = lng || Number( this.$lng.val( ) );
      zoom = zoom || 15;
      if ( lat === 0 && lng === 0 ) zoom = 1;
      return this[ this.updateMapFn ]( lat, lng, zoom );
    },
    /**
     * Loads a static map with placemarker. Does not use Google Maps v3 API (uses Static Maps API instead)
     * @param  {number} lat  latitude
     * @param  {number} lng  longitude
     * @param  {number} zoom default zoom level is 15
     */
    updateStaticMap: function( lat, lng, zoom ) {
      var params,
        width = this.$map.width( ),
        height = this.$map.height( ),
        mapsAPIKey = settings[ 'mapsStaticAPIKey' ] || '';

      params = "center=" + lat + "," + lng + "&size=" + width + "x" + height + "&zoom=" + zoom + "&sensor=false&key=" + mapsAPIKey;
      this.$map.empty( ).append( '<img src="http://maps.googleapis.com/maps/api/staticmap?' + params + '"/>' );
    },
    /**
     * Updates the dynamic (Maps API v3) map to show the provided coordinates (in the center), with the provided zoom level
     * @param  {number} lat  latitude
     * @param  {number} lng  longitude
     * @param  {number} zoom zoom
     */
    updateDynamicMap: function( lat, lng, zoom ) {
      var $map = this.$map,
        that = this;

      if ( this.dynamicMapAvailable( ) && typeof google.maps.LatLng !== 'undefined' ) {
        var mapOptions = {
          zoom: zoom,
          center: new google.maps.LatLng( lat, lng ),
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          streetViewControl: false
        };
        this.map = new google.maps.Map( this.$map[ 0 ], mapOptions );
        this.placeMarker( );
        // place marker where user clicks
        google.maps.event.addListener( this.map, 'click', function( event ) {
          that.updateInputs( event.latLng.lat( ), event.latLng.lng( ), '', '', 'change.bymap' );
          that.placeMarker( event.latLng );
        } );
      }
    },
    /**
     * Moves the existing marker to the provided coordinates or places a new one in the center of the map
     * @param  {Object.<string, number>=} latLng [description]
     */
    placeMarker: function( latLng ) {
      var that;
      latLng = latLng || this.map.getCenter( );
      if ( typeof this.marker !== 'undefined' ) {
        this.marker.setMap( null );
      }
      this.marker = new google.maps.Marker( {
        position: latLng,
        map: this.map,
        draggable: true
      } );
      that = this;
      // dragging markers for non-touch screens
      if ( !this.touch ) {
        google.maps.event.addListener( this.marker, 'dragend', function( ) {
          that.updateInputs( that.marker.getPosition( ).lat( ), that.marker.getPosition( ).lng( ), '', '', 'change.bymap' );
          that.centralizeWithDelay( );
        } );
        this.centralizeWithDelay( 5000 );
      }
      this.centralizeWithDelay( 0 );
    },
    /**
     * Shifts the map so that the marker is in the center after a small delay.
     */
    centralizeWithDelay: function( delay ) {
      var that = this;
      window.setTimeout( function( ) {
        that.map.panTo( that.marker.getPosition( ) );
      }, delay );
    },
    /**
     * Updates the (fake) input element for latitude, longitude, altitude and accuracy
     * @param  {number} lat [description]
     * @param  {number} lng [description]
     * @param  {?(string|number)} alt [description]
     * @param  {?(string|number)} acc [description]
     * @param  {string=} ev  [description]
     */
    updateInputs: function( lat, lng, alt, acc, ev ) {
      alt = alt || '';
      acc = acc || '';
      ev = ev || 'change';
      this.$lat.val( Math.round( lat * 10000 ) / 10000 );
      this.$lng.val( Math.round( lng * 10000 ) / 10000 );
      this.$alt.val( Math.round( alt * 10 ) / 10 );
      this.$acc.val( Math.round( acc * 10 ) / 10 ).trigger( ev );
    },
    /**
     * In enketo the loading of the GMaps resources is dealt with in the Connection class.
     */
    loadMapsScript: function( ) {}
  };

  $.fn.geopointpicker = function( option ) {
    var loadStarted = false;

    return this.each( function( ) {
      var $this = $( this ),
        data = $( this ).data( 'geopointwidget' ),
        options = typeof option == 'object' && option;
      //for some reason, calling this inside the Geopointpicker class does not work properly
      if ( !loadStarted && ( typeof connection !== 'undefined' ) && ( typeof google == 'undefined' || typeof google.maps == 'undefined' ) && !option.touch ) {
        loadStarted = true;
        console.debug( 'loading maps script asynchronously' );
        connection.loadGoogleMaps( function( ) {
          $( 'form.jr' ).trigger( 'googlemapsscriptloaded' );
        } );
      }

      if ( !data ) {
        $this.data( 'geopointwidget', ( data = new Geopointpicker( this, options ) ) );
      }
      if ( typeof option == 'string' ) {
        data[ option ]( );
      }
    } );
  };

  $.fn.geopointpicker.Constructor = Geopointpicker;

} ) );