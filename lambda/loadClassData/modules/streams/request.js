const querystring = require('querystring');
const process = require('process');
const axios = require('axios');
const {TransformAsync} = require('./streams');

/**
 * @function sendPost - Sends a POST request for the provided subject to the server
 * @param {string} subject - The subject abbreviation to send in the request
 * @return {[string, string]}A tuple array containing the subject linked to the request, as well as the HTML response body
 */
async function sendPost(subject){ 
    try {
        var [options, data] = await createReqParams(subject);
        //Log the start time of the request 
        console.log(`Sending POST request for ${subject}...`);
        const reqStart = process.hrtime();
        var response = await axios.post(process.env.URL, data, options);
        const reqEnd = process.hrtime(reqStart);
        //Log end time of request
        console.log(`Request for ${subject} took ${reqEnd[0]}s`);
        return [subject, response.data];
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function createReqParams - Creates the headers, AXIOS options, and body for the POST 
 * request from the given subject
 * @param {string} subject - The subject abbreviation to send in the request body
 * @return {[object, string]}A tuple array contain the AXIOS options (including headers) and the request body
 */
async function createReqParams(subject){
    const postData =  querystring.stringify({
        term_in: process.env.TERM,
        sel_subj: ['dummy', subject],
        sel_day: 'dummy',
        sel_schd: 'dummy',
        sel_insm: ['dummy', '%'],
        sel_camp: ['dummy', '%'],
        sel_levl: 'dummy',
        sel_sess: ['dummy', '%'],
        sel_instr: ['dummy', '%'],
        sel_ptrm: ['dummy', '%'],
        sel_attr: ['dummy', '%'],
        sel_divs: ['dummy', '%'],
        sel_crse: '',
        sel_title: '',
        sel_from_cred: '',
        sel_to_cred: '',
        begin_hh: 0,
        begin_mi: 0,
        begin_ap: 'a',
        end_hh: 0,
        end_mi: 0,
        end_ap: 'a'  
    });
    
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': process.env.REFER
    };

    const options = {
        timeout: process.env.REQ_TIMEOUT,
        headers: headers
    };

    return [options, postData];
}

/**
 * @exports TransformAsync
 * A new instance of TransformAsync that sends and receives an HTTP request
 */
module.exports = new TransformAsync(sendPost, {objectMode: true});