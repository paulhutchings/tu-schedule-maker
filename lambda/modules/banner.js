const querystring = require('querystring');
const cheerio = require('cheerio');
const axios = require('../test/node_modules/axios');

/**
 * @class BannerAPI - An API for interfacing with the self-service banner to perform different functions, including class and catalog searches,
 * as well as parsing the resulting server responses into usable objects.
 * @example Term codes: The numeric codes for the term parameter adhere to the following pattern: 
 * * <year><suffix> where the suffixes are:
     *  * Spring: 03
     *  * Summer 1: 20
     *  * Summer 2: 26
     *  * Fall: 36
     *  * Ex: Spring 2019 = 201903  
 * @example Options object: The options object for catalog and class searches should be in the following format:
     * * days: [string] - An array of day characters (MTWRF) that represent the days on which classes are desired
     * * campus: [string] - An array of campus codes representing the campuses on which to search for classes. See the 'campus' table for 
     * corresponding campus codes
     * * instruct: [string] - An array of instructor IDs that represent desired professors (note, only courses taught by those professors will 
     * be returned by Banner). See the 'professors' table for corresponding professor IDs
 */
class BannerAPI {
    /**
     * @constructor - Creates a new instance of BannerAPI with the (optional) timeout for requests
     * @param {number} timeout - The timeout for server requests in seconds (defaults to 30)
     * @member {string} baseURL - The base URL for the server requests. The end of the path is determined by the type of request being made
     * @member {axios} axios - The Axios object used to make requests
     * @return {BannerAPI} - A new instance of BannerAPI
     */
    constructor(timeout=30){
        this.baseURL = 'https://prd-wlssb.temple.edu/prod8/';
        this.axios = axios.create({
            'baseURL': this.baseURL,
            'timeout': timeout * 1e3
        });
    }

    /**
     * @private
     * @method _createHeaders - Creates the headers object for the request. Currently, the only required header is the Referer in order for
     * the request to succeed
     * @param {string} referPath - the end of the url path to be used in the Referer header field
     * @returns {object} - An object containing the request headers
     */
    _createHeaders(referPath){
        return {
            'Referer': this.baseURL + referPath
        }
    }

    /**
     * @private
     * @method _parseTime - Converts the caller - provided string representing time into it's components to send with the
     * server request.
     * @param {string} timeStr - A string representing time in 12-hour format. Hour and minute should be separated
     * by a colon, and there should be a space between minute and am/pm.
     * @example "12:30 pm"
     */
    _parseTime(timeStr){
        let time = {};
        time.hr = Number(timeStr.slice(0, timeStr.indexOf(':')));
        time.min = Number(timeStr.slice(timeStr.indexOf(':') + 1, timeStr.indexOf(' ')));
        time.ap = timeStr.slice(timeStr.indexOf(' ') + 1).includes('am') ? 'a' : 'p';
        return time;
    }

    /**
     * @method
     * @param {number} term 
     */
    async getClassSearchPage(term){
        if (!term){
            throw new Error('must provide term');
        }
        try {
            const html = await this._classSearchPageReq(term);
            return this._classSearchParse(html);
        } catch (error) {
            throw new Error(error);
        }
    }

    /**
     * @private
     * @method _getClassSearchPage - Returns the HTML for the class search page for the given term
     * @param {number} term - The term code for the desired semester. 
     * @returns {string} - The HTML of the response page
     */
    async _classSearchPageReq(term){
        const path = 'bwckgens.p_proc_term_date';
        const referPath = 'bwckschd.p_disp_dyn_sched';

        const headers = this._createHeaders(referPath);
        const data = querystring.stringify({
            'p_term': term,
            'p_calling_proc': referPath
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});
            return response.data;
        } catch (error) {
            throw new Error(`Error with ClassSearchPage request: ${error}`);
        }
    }

    /**
     * @private
     * @param {string} html 
     */
    _classSearchPageParse(html){
        try {
            const $ = cheerio.load(html);
            return {
                'subjEntries': this._extractEntries($, 'sel_subj'),
                'divEntries': this._extractEntries($, 'sel_divs'),
                'instrMethodEntries': this._extractEntries($, 'sel_insm'),
                'campusEntries': this._extractEntries($, 'sel_camp'),
                'partOfTermEntries': this._extractEntries($, 'sel_ptrm'),
                'profEntries': this._extractEntries($, 'sel_instr'),
                'sessionEntries': this._extractEntries($, 'sel_sess'),
                'attributeEntries': this._extractEntries($, 'sel_attr')
            };           
        } catch (error) {
            throw new Error(`Error parsing Class Search Page: ${error}`);
        } 
    }

    /**
     * @private
     * @param {CheerioStatic} $ 
     * @param {string} name - The name attribute of the given HTML form select element
     */
    _extractEntries($, name){
        try {
            return $(`select[name=${name}] option`)
            .map((i, e) => {
                return {
                    'id': $(e).val(),
                    'name': $(e).text()
                };   
            })
            .toArray()
            .filter(x => x.id != '%');
        } catch (error) {
            throw new Error(`Error extracting extries for ${name}: ${error}`);
        }
    }

    /**
     * @method
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async classSearch(term, subjects, options={}){
        if (arguments.length < 2){
            throw new Error('must provide term and at least 1 subject');
        }
    }

    /**
     * @private
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async _classSearchReq(term, subjects, options={}){
        const path = 'bwckschd.p_get_crse_unsec';
        const referPath = 'bwckgens.p_proc_term_date';
        const headers = this._createHeaders(referPath);

        if (options.startTime){
            var startTime = this._parseTime(options.startTime);
        }

        if (options.endTime){
            var endTime = this._parseTime(options.endTime);
        }
        const data = querystring.stringify({
            'sel_levl': 'dummy',
            'sel_schd': 'dummy',
            'term_in': term,
            'sel_subj': ['dummy'].concat(subjects), //dummy must come before any other subject codes
            'sel_day': options.days ? ['dummy'].concat(options.days) : 'dummy',
            'sel_insm': options.instructMethod ? ['dummy'].concat(options.instructMethod) : ['dummy', '%'],
            'sel_camp': options.campus ? ['dummy'].concat(options.campus) : ['dummy', '%'],
            'sel_sess': options.sessions ? ['dummy'].concat(options.sessions) : ['dummy', '%'],
            'sel_instr': options.instruct ? ['dummy'].concat(options.instruct) : ['dummy', '%'],
            'sel_ptrm': options.partOfTerm ? ['dummy'].concat(options.partOfTerm) : ['dummy', '%'],
            'sel_attr': options.attributes ? ['dummy'].concat(options.attributes) : ['dummy', '%'],
            'sel_divs': options.division ? ['dummy'].concat(options.division) : ['dummy', '%'],
            'sel_crse': options.course ? options.course : '',
            'sel_title': options.title ? options.title : '',
            'sel_from_cred': options.credits ? options.credits[0] : '',
            'sel_to_cred': options.credits ? options.credits[1] : '',
            'begin_hh': startTime ? startTime.hr : 0,
            'begin_mi': startTime ? startTime.min : 0,
            'begin_ap': startTime ? startTime.ap : 'a',
            'end_hh': endTime ? endTime.hr : 0,
            'end_mi': endTime ? endTime.min : 0,
            'end_ap': endTime ? endTime.ap :'a'
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});          
            return response.data;
        } catch (error) {
            throw new Error(`Error with ClassSearch request: ${error}`);
        }
    }

    /**
     * @private
     * @param {string} html 
     */
    _classSearchParse(html){

    }

    /**
     * @method
     * @param {number} term 
     * @param {string} course 
     */
    async singleClassSearch(term, course){
        if (arguments.length < 2){
            throw new Error('Must provide term and course');
        }
    }

    /**
     * @private
     * @param {number} term 
     * @param {string} course 
     */
    async _singleClassSearchReq(term, course){
        const path = 'bwckctlg.p_disp_listcrse';
        const referPath = 'bwckctlg.p_disp_course_detail';
        const headers = this._createHeaders(referPath);

        const [subject, courseNumber] = course.split(' ');
        const params = {
            'term_in': term,
            'subj_in': subject,
            'crse_in': courseNumber,
            'schd_in': ''
        };
        const options = {
            'headers': headers,
            'params': params
        };

        try {
            const response = await this.axios.get(path, options);
            return response.data;
        } catch (error) {
            throw new Error(`Error with SingleClassSearch request: ${error}`);
        }
    }

    /**
     * @private
     * @param {string} html 
     */
    _singleClassSearchParse(html){

    }

    /**
     * @method
     * @param {number} term 
     */
    async getCatalogSearchPage(term){
        if (!term){
            throw new Error('must provide term');
        }
    }

    /**
     * @private
     * @param {number} term 
     */
    async _catalogSearchPageReq(term){
        const path = 'bwckctlg.p_disp_cat_term_date';
        const referPath = 'bwckctlg.p_disp_dyn_ctlg';
        const headers = this._createHeaders(referPath);

        const data = querystring.stringify({
            'cat_term_in': term,
            'call_proc_in': referPath
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});
            return response.data;
        } catch (error) {
            throw new Error(`Error with CatalogSearchPage request: ${error}`);
        }
    }

    /**
     * @private
     * @param {string} html 
     */
    _catalogSearchPageParse(html){

    }

    /**
     * @method
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async catalogSearch(term, subjects, options={}){
        if (arguments.length < 2){
            throw new Error('must provide term and at least 1 subject')
        }
    }

    /**
     * @private
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async _catalogSearchReq(term, subjects, options={}){
        const path = 'bwckctlg.p_display_courses';
        const referPath = 'bwckctlg.p_disp_cat_term_date';
        const headers = this._createHeaders(referPath);

        const data = querystring.stringify({
            'sel_levl': ['dummy', '%'],
            'sel_schd': ['dummy', '%'],
            'call_proc_in': 'bwckctlg.p_disp_dyn_ctlg',
            'term_in': term,
            'sel_subj': ['dummy'].concat(subjects),
            'sel_attr': options.attributes ? ['dummy'].concat(options.attributes) : ['dummy', '%'],
            'sel_divs': options.division ? ['dummy'].concat(options.division) : ['dummy', '%'],
            'sel_coll': options.college ? ['dummy'].concat(options.college) : ['dummy', '%'],
            'sel_dept': options.department ? ['dummy'].concat(options.department) : ['dummy', '%'],
            'sel_crse_strt': options.courseNumbers ? options.courseNumbers[0] : '',
            'sel_crse_end': options.courseNumbers ? options.courseNumbers[1] : '',
            'sel_title': options.title ? options.title : '',
            'sel_from_cred': options.credits ? options.credits[0] : '',
            'sel_to_cred': options.credits ? options.credits[1] : '',
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});
            return response.data;
        } catch (error) {
            throw new Error(`Error with CatalogSearch request: ${error}`);
        }

    }

    /**
     * @private
     * @param {string} html 
     */
    _catalogSearchParse(html){

    }

    /**
     * @method
     * @param {number} term 
     * @param {string} course 
     */
    async getDetailedDesc(term, course){
        if (arguments.length < 2){
            throw new Error('must provide term and course');
        }
    }

    /**
     * @private
     * @param {number} term 
     * @param {string} course 
     */
    async _detailDescReq(term, course){
        const path = 'bwckctlg.p_disp_course_detail';
        const referPath = 'bwckctlg.p_display_courses';
        const headers = this._createHeaders(referPath);

        const [subject, courseNumber] = course.split(' ');
        const params = {
            'cat_term_in': term,
            'subj_code_in': subject,
            'crse_numb_in': courseNumber
        };
        const options = {
            'headers': headers,
            'params': params
        };

        try {
            const response = await this.axios.get(path, options);
            return response.data;
        } catch (error) {
            throw new Error(`Error with DetailedCourseDescrption request: ${error}`);
        }
    }

    /**
     * @private
     * @param {string} html 
     */
    _detailDescParse(html){

    }
}

/**
 * @exports BannerAPI - A singleton instance of the class.
 */
module.exports = new BannerAPI();