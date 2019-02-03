const axios = require('../../test/node_modules/axios');
const querystring = require('querystring');

/**
 * @class BannerRequest - A subclass of the BannerAPI used for making requests to the server.
 */
class BannerRequest {
    /**
     * @constructor - Creates a new instance of Banner-Request with the (optional) timeout for requests
     * @param {number} timeout - The timeout for server requests in seconds (defaults to 30)
     * @member {string} baseURL - The base URL for the server requests. The end of the path is determined by the type of request being made
     * @member {axios} axios - The Axios object used to make requests
     * @return {BannerRequest} - A new instance of BannerRequest to be used with the BannerAPI
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
     * @method _getClassSearchPage - Returns the HTML for the class search page for the given term
     * @param {number} term - The term code for the desired semester. 
     * @returns {string} - The HTML of the response page
     */
    async classSearchPageReq(term){
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
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async classSearchReq(term, subjects, options={}){
        const path = 'bwckschd.p_get_crse_unsec';
        const referPath = 'bwckgens.p_proc_term_date';
        const headers = this._createHeaders(referPath);

        if (options.startTime){
            var startTime = this._parseTime(options.startTime);
        }

        if (options.endTime){
            var endTime = this._parseTime(options.endTime);
        }
        //most fields also require the 'dummy' option to be added even when a selection is provided
        const data = querystring.stringify({
            'sel_levl': 'dummy',
            'sel_schd': 'dummy',
            'term_in': term,
            'sel_subj': ['dummy'].concat(subjects), //dummy must come before any other subject codes
            'sel_day': options.days ? ['dummy'].concat(options.days) : 'dummy', 
            'sel_insm': options.instructMethod ? ['dummy'].concat(options.instructMethod) : ['dummy', '%'],
            'sel_camp': options.campus ? ['dummy'].concat(options.campus) : ['dummy', '%'],
            'sel_sess': options.sessions ? ['dummy'].concat(options.sessions) : ['dummy', '%'],
            'sel_instr': options.profs ? ['dummy'].concat(options.profs) : ['dummy', '%'],
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
     * @param {number} term 
     * @param {string} course 
     */
    async singleClassSearchReq(term, course){
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
     * @param {number} term 
     */
    async catalogSearchPageReq(term){
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
     * @param {number} term 
     * @param {[string]} subjects 
     * @param {object} options 
     */
    async catalogSearchReq(term, subjects, options={}){
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
     * @param {number} term 
     * @param {string} course 
     */
    async detailDescReq(term, course){
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
}

/**
 * @exports BannerRequest - The BannerRequest class.
 */
module.exports = BannerRequest;