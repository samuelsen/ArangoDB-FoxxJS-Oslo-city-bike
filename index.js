'use strict';

const joi = require('joi');
const db = require('@arangodb').db;
const aql = require('@arangodb').aql;
const errors = require('@arangodb').errors;
const DOC_NOT_FOUND = errors.ERROR_ARANGO_DOCUMENT_NOT_FOUND.code;

const stations = db._collection('osloCityBike');

const createRouter = require('@arangodb/foxx/router');
const router = createRouter();

module.context.use(router);

router.get('/allstations', function(req, res) {
  try{
    const data = stations.all();
    res.send(data);
  } catch (e) {
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
})

router.get('/randomstation', function (req, res) {
  try{
    const data = stations.any();
    res.send(data);
  }
  catch (e){
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
})
.response(joi.object().required(), 'Returns a random entry.')
.summary('Retrieve a random bikestation entry.')
.description('Returns a random bikestation entry of the osloCityBike collection.');

router.get('/station/:id', function(req, res) {
  try{
    var id = req.pathParams.id;
    var q = `for n in osloCityBikeAvaiability filter n.id == ${id} collect AGGREGATE availability = AVERAGE(n.availability_bikes) return availability`;

    var data = db._query(q);
    res.send(data);
  } catch (e) {
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
});

router.get('/nearby/:lat/:long', function(req, res) {
  try{
    var lat = req.pathParams.lat;
    var long = req.pathParams.long;

    var q = `FOR n IN NEAR(osloCityBike, ${lat}, ${long}, 5) RETURN n`;

    //var q = `FOR n IN NEAR(osloCityBike, ${lat}, ${long}, 5) let avg = (for a in osloCityBikeAvaiability filter a.id == TO_NUMBER(n._key) collect AGGREGATE availability = AVERAGE(a.availability_bikes) return availability)[0] return {'_key':n._key, 'stations_title':n.stations_title, 'availability':avg, 'coordinate':n.coordinate}`;

    console.log(q);

    var data = db._query(q);
    res.send(data);
  } catch (e) {
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
});

router.get('/neighborhoods', function (req, res) {
  try {
    // const data = foxxColl.document(req.pathParams.key);
    const data = neighborhoods.any();
    res.send(data);
  } catch (e) {
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
})
.response(joi.object().required(), 'Returns a random entry.')
.summary('Retrieve a random neighborhood entry.')
.description('Returns a random neighborhoods entry of the neighborhoods collection.');

router.get('/pointsInNeighborhood/:id', function (req, res) {
  try {
    var id = req.pathParams.id;
    var neighborhood = neighborhoods.document(id);

    const keys = db._query(aql`
      FOR restaurant IN restaurants
      FILTER IS_IN_POLYGON(${neighborhood.geometry.coordinates[0]}, restaurant.location.coordinates[0], restaurant.location.coordinates[1])
      RETURN restaurant
    `);
    res.send(keys);
  } catch (e) {
    if (!e.isArangoError || e.errorNum !== DOC_NOT_FOUND) {
      throw e;
    }
    res.throw(404, 'The entry does not exist', e);
  }
})
.response(joi.object().required(), 'Returns restaurants within a given neighborhood.')
.summary('Restaurants in a neighborhood.')
.description('Returns restaurants within a given neighborhood.');
