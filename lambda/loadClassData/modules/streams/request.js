const querystring = require('querystring');
const process = require('process');
const axios = require('axios');
const {AsyncTransform} = require('./streams');

class RequestStream extends AsyncTransform {
    constructor(url, refer, term){
        super();
        this.url = url;
        this.refer = refer;
        this.term = term;
    }

    //Encapsulates the POST request to the server
    async _task(subject){ 
        try {
            var [options, data] = await this._createReqParams(subject);
            //Log the start time of the request 
            console.log(`Sending POST request for ${subject}...`);
            const reqStart = process.hrtime();
            var response = await axios.post(this.url, data, options);
            const reqEnd = process.hrtime(reqStart);
            console.log(`Request for ${subject} took ${reqEnd[0]}s`);
            return response.data;
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    //Creates the request body and headers
    async _createReqParams(subject){
        const postData =  querystring.stringify({
            term_in: this.term,
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
            'Referer': this.refer
        };

        const options = {
            timeout: 30000,
            headers: headers
        };

        return [options, postData];
    }
}

module.exports = RequestStream;