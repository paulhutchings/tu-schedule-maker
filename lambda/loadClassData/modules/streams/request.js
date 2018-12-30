const querystring = require('querystring');
const process = require('process');
const https = require('https');
const {AsyncTransform} = require('./streams');

class RequestStream extends AsyncTransform {
    constructor(host, path, refer, term){
        super();
        this.host = host;
        this.path = path;
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
            const req = https.request(options, (res) => {
                console.log(res.statusCode);
                let body;
                res.on('DATA', (chunk) => body += chunk);
                res.on('END', () => {
                    //Log the end time of the request.
                    const reqEnd = process.hrtime(reqStart);
                    console.log(`Request for ${subject} took ${reqEnd[0]}s`);

                    return body;      
                });
            });
            req.on('ERROR', (err) => console.log(err));
            req.write(data);
            req.end();
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
            hostname: this.host,
            port: 443,
            path: this.path,
            method: 'POST',
            headers: headers
        };

        return [options, postData];
    }
}

module.exports = RequestStream;