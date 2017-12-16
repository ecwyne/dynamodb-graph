// @ts-nocheck
'use strict';

var cuid = require('cuid');
var g = require('../src/index.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodesWithTypeOnGSI()', () => {
  var type = 'Test';
  var node = cuid() + '#' + cuid();
  var gsik = utils.calculateGSIK({ node });

  var db = () => ({
    query: params => ({ promise: () => Promise.resolve(params) })
  });

  test('should return a function', () => {
    expect(typeof g.getNodesWithTypeOnGSI({ type, gsik })).toEqual('function');
  });

  test('should fail if type is undefined', () => {
    expect(() => g.getNodesWithTypeOnGSI({ db, table })({ type })).toThrow(
      'GSIK is undefined'
    );
  });

  test('should fail if type is undefined', () => {
    expect(() => g.getNodesWithTypeOnGSI({ db, table })({ gsik })).toThrow(
      'Type is undefined'
    );
  });

  test('should return a valid DynamoDB query params object', () => {
    return g
      .getNodesWithTypeOnGSI({ db: db(), table })({ type, gsik })
      .then(params =>
        expect(params).toEqual({
          ExpressionAttributeNames: {
            '#Data': 'Data',
            '#GSIK': 'GSIK',
            '#Node': 'Node',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':GSIK': gsik,
            ':Type': type
          },
          IndexName: 'ByType',
          KeyConditionExpression: '#GSIK = :GSIK AND #Type = :Type',
          ProjectionExpression: '#Data,#Node',
          TableName: 'ExampleTable'
        })
      );
  });

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () => Promise.resolve(dynamoResponse.raw())
      })
    };
    return g
      .getNodesWithTypeOnGSI({ db: database, table })({ type: 1, gsik: 2 })
      .then(response => {
        expect(response).toEqual(dynamoResponse.parsed());
      });
  });
});

describe('#getNodesWithType()', () => {
  var type = 'Testing';
  var tenant = cuid();
  var maxGSIK = 3;

  var db = () => ({
    query: params => ({
      promise: () => {
        var gsik = params.ExpressionAttributeValues[':GSIK'];
        if (gsik === tenant + '#' + 0)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 1 }] }));
        if (gsik === tenant + '#' + 1)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 2 }] }));
        if (gsik === tenant + '#' + 2)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 3 }] }));
        return Promise.resolve();
      }
    })
  });

  test('should return a function', () => {
    expect(typeof g.getNodesWithType({ tenant, type })).toEqual('function');
  });

  test('should return an error if maxGSIK is undefined', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, type })
      .catch(error => expect(error.message).toEqual('Max GSIK is undefined'));
  });

  test('should return an error if type is undefined', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, maxGSIK })
      .catch(error => expect(error.message).toEqual('Type is undefined'));
  });

  test('should return a response object with all nodes', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, type, maxGSIK })
      .then(response => {
        expect(response).toEqual({
          Count: 3,
          Items: [{ Data: 1 }, { Data: 2 }, { Data: 3 }],
          ScannedCount: 30
        });
      })
      .catch(error => expect(error).toEqual(null));
  });
});
