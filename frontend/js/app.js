/* global L, $ */

(function () {
  'use strict';
  var map;
  var markers = [];
  var polygons = [];

  var initMap = function () {
    map = L.map('map', {
      center: [59.9182735,10.7175793],
      zoom: 13,
      zoomControl: false,
      //attributionControl: true
    }).on('click', mapOnClick);

    console.log(map.locate());

    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    initPoints();
  };

var initPoints = function(){
    $.ajax({
      cache: false,
      type: 'GET',
      url: 'allstations',
      contentType: 'application/json',
      processData: false,
      success: function(data){
        setMarkers(data);
      },
      error: function (data) {
        console.log(data);
      }
    });
  };

  var getInfoAboutStation = function (id, center) {
      var m = getMarker(id);
    $.ajax({
      cache: false,
      type: 'GET',
      url: 'station/'+id+'/',
      contentType: 'application/json',
      processData: false,
      success: function (data) {
        m.marker.options.avg = data;
        m.marker.getPopup().setContent('Name: ' + m.marker.options.Name + '.<br>Id: ' + m.marker.options.Id + '<br />Avrage avaiable bikes: ' + m.marker.options.avg);
        m.marker.openPopup();
        center ? centerLeafletMapOnMarker(m.marker) : '';
      },
      error: function (data) {
        console.log(data);
      }
    });
  };


  var getRandomRestaurant = function () {
    $.ajax({
      cache: false,
      type: 'GET',
      url: 'randomstation',
      contentType: 'application/json',
      processData: false,
      success: function (data) {
        getInfoAboutStation(data._key, true);
      },
      error: function (data) {
        console.log(data);
      }
    });
  };

  var getRandomNeighborhood = function () {
    $.ajax({
      cache: false,
      type: 'GET',
      url: 'neighborhoods',
      contentType: 'application/json',
      processData: false,
      success: function (data) {
        // create a red polygon from an array of LatLng points
        if (data.geometry.type === 'Polygon') {
          var latlngs = [];
          // fill latlng array
          data.geometry.coordinates[0].forEach(function (value) {
            latlngs.push([value[1], value[0]]);
          });
          var polygon = L.polygon(latlngs, {color: 'red', id: data._id}).addTo(map);
          polygons.push(polygon);
          polygon.on('click', function (x) {
            var id = x.target.options.id;
            getPointsInPolygon(id);
          });
          // zoom the map to the polygon
          map.fitBounds(polygon.getBounds());
        } else {
          getRandomNeighborhood();
        }
      },
      error: function (data) {
        console.log(data);
      }
    });
  };

  var getPointsInPolygon = function (id) {
    $.ajax({
      cache: false,
      type: 'GET',
      url: 'pointsInNeighborhood/' + encodeURIComponent(id),
      contentType: 'application/json',
      processData: false,
      success: function (data) {
        data.forEach(function (obj) {
          var marker = L.marker([obj.location.coordinate[1], obj.location.coordinate[0]]).addTo(map)
          .bindPopup('Name: ' + obj.name + '.<br>Id: ' + obj._id)
          .openPopup();
          markers.push(marker);
        });
      },
      error: function (data) {
        console.log(data);
      }
    });
  };

  var centerLeafletMapOnMarker = function (marker) {
    var latLngs = [ marker.getLatLng() ];
    var markerBounds = L.latLngBounds(latLngs);
    map.fitBounds(markerBounds);
  };

  var setMarkers = function(data) {
    data.forEach(function(place){        
      var marker = L.marker([place.coordinate[0], place.coordinate[1]]).on('click', markerOnClick).addTo(map)
      .bindPopup('Name: ' + place.stations_title + '.<br>Id: ' + place._key + '<br /> Avrage avaiable bikes: ' + (place.availability != undefined ? place.availability : 'not calculated'))
      marker.options['avg'] = place.availability != undefined ? place.availability : 'not calculated';
      marker.options['Name'] = place.stations_title;
      marker.options['Id'] = place._key;
      markers.push({'id': place._key, 'marker': marker});          
    })
  };

  var clearMarkers = function () {
    var i;
    for (i = 0; i < markers.length; i++) {
      map.removeLayer(markers[i].marker);
    }
    markers = [];
  };

  var getMarker = function(id) {
    if(markers.length == 0){
      initPoints();
    }
    var i;
    for(i = 0; i < markers.length; i++){
      if(markers[i].id == id){
        console.log(markers[i]);
        return markers[i];
      }
    }
    alert("No station with the id: " + id);
    return null;
  }

  var clearPolygons = function () {
    var i;
    for (i = 0; i < polygons.length; i++) {
      map.removeLayer(polygons[i]);
    }
    polygons = [];
  };

  function markerOnClick(e) {
    getInfoAboutStation(e.target.options.Id, false);
  }

  function mapOnClick(e) {
    clearMarkers();

    $.ajax({
      cache: false,
      type: 'GET',
      url: 'nearby/'+e.latlng.lat+'/'+e.latlng.lng,
      contentType: 'application/json',
      processData: false,
      success: function (data) {
        console.log(data);
        setMarkers(data);
      },
      error: function (data) {
        console.log(data);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function (event) {
    // init leaflet map
    initMap();

    // add bind events
    $('#randomStasjon').on('click', function () {
      getRandomRestaurant();
    });
    $('#stasjon').on('click', function () {
      getInfoAboutStation(260, true);
    });
    $('#randomNeighborhood').on('click', function () {
      getRandomNeighborhood();
    });
    
    $('#find-from-id').on('click', function () {
      getInfoAboutStation($('#id-input')[0].value, true);
    });

    $('#locate').on('click', function () {
      console.log('location');
      map.locate({setView: true, maxZoom: 15})
        .on('locationfound', function(e){
          console.log(e);
          var marker = L.marker([e.latitude, e.longitude]).bindPopup('Your are here :)');
          var circle = L.circle([e.latitude, e.longitude], e.accuracy/2, {
              weight: 1,
              color: 'red',
              fillColor: '#cacaca',
              fillOpacity: 0.9
          });
          mapOnClick(e);
          map.addLayer(marker);
          map.addLayer(circle);
          
      })
      .on('locationerror', function(e){
            console.log(e);
            alert("Location access denied.");
      });
    });

    $('#getAll').on('click', function () {
      initPoints();
    });

    $('#clearAll').on('click', function () {
      clearMarkers();
      clearPolygons();
    });
  });
}());
