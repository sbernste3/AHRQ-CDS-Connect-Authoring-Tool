const rpn = require('request-promise-native');
const _ = require('lodash');


const VSAC_FHIR_ENDPOINT = 'https://cts.nlm.nih.gov/fhir';


/**
* Gets the value set for the given oid,

* @param {string} oid - the VSAC oid you are after
* @param {string} username the VSAC user to authenticate as
* @param {string} password the VSAC user's password
* @returns {Promise<object>} an object containing the FHIR response for the OID
*/
function getValueSet(oid, username, password) {
  const options = {
    method: 'GET',
    url: `${VSAC_FHIR_ENDPOINT}/ValueSet/${oid}/$expand`,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`
    }
  };

  return rpn(options).then((res) => {
    const response = JSON.parse(res);
    return {
      oid: response.id,
      version: response.meta.versionId,
      displayName: response.name,
      codes: response.expansion.contains.map((c) => {
        return {
          code: c.code,
          codeSystemName: c.system,
          codeSystemVersion: c.version,
          displayName: c.display
        }
      })
    }
  });
}

//
//
// "E10.10"
// codeSystem
// :
// "2.16.840.1.113883.6.90"
// codeSystemName
// :
// "ICD10CM"
// codeSystemVersion
// :
// "2018"
// displayName
// :
// "Type 1 diabetes mellitus with ketoacidosis without coma"

function searchForValueSets(search, username, password) {
  // TODO: Consider filtering to only published (not draft) value sets, but NLM doesn't support that
  // via search params yet, so we'd need to do the filter client-side.
  const options = {
    method: 'GET',
    url: `${VSAC_FHIR_ENDPOINT}/ValueSet?name:contains=${search}`,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`
    }
  };

  return rpn(options).then((res) => {
    const response = JSON.parse(res);
    const results = response.entry.map((v, i) => {
      return {
        name: v.resource.name,
        steward: v.resource.publisher,
        oid: v.resource.id,
        codeSystem: []
      }
    });
    return {
      _total: response.total,
      count: results.length,
      page: 1,
      results
    }
  });
}

function getCode(code, system, username, password) {
  const options = {
    method: 'GET',
    url: `${VSAC_FHIR_ENDPOINT}/CodeSystem/$lookup?code=${code}&system=${system}`,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`
    }
  };
  return rpn(options).then((res) => {

    const codeJSON = JSON.parse(res).parameter;
    let codeObject = _.zipObject(_.map(codeJSON, 'name'), _.map(codeJSON, 'valueString'));
    return {
      system,
      systemName: codeObject.name,
      systemOID: codeObject.Oid,
      version: codeObject.version,
      code,
      display: codeObject.display
    };
  })
}

module.exports = {
  getValueSet,
  searchForValueSets,
  getCode
}
