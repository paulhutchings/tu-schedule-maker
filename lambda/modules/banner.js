const axios = require('axios');
const querystring = require('querystring');

/**
 * @class BannerAPI - An API for interfacing with the self-service banner to perform different functions, including class and catalog searches
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
     * @method getClassSearchPage - Returns the HTML for the class search page for the given term
     * @param {number} term - The numeric code for the desired semester. The codes follow the following pattern: 
     * <year><suffix> where the suffixes are:
     * Spring: 03
     * Summer 1: 20
     * Summer 2: 26
     * Fall: 36
     * Ex: Spring 2019 = 201903
     * @returns {string} - The HTML of the response page
     */
    async getClassSearchPage(term){
        if (!term){
            throw new Error('Error: must provide term');
        }

        const path = 'bwckgens.p_proc_term_date';
        const referPath = 'bwckschd.p_disp_dyn_sched';

        const headers = this._createHeaders(referPath);
        const data = querystring.stringify({
            'p_term': term,
            'p_calling_proc': referPath
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});

            if (response.status !== 200){
                throw new Error(`Error with ClassSearchPage request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with ClassSearchPage request: ${error}`);
        }
    }

    async classSearch(term, subjects, options={}){
        if (arguments.length < 2){
            throw new Error('Error: must provide term and at least 1 subject');
        }
        const path = 'bwckctlg.p_display_courses';
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
            'sel_subj': subjects.concat('dummy'),
            'sel_day': options.days ? options.days.concat('dummy') : 'dummy',
            'sel_insm': options.instructMethod ? options.instructMethod.concat('dummy') : ['dummy', '%'],
            'sel_camp': options.campus ? options.campus.concat('dummy') : ['dummy', '%'],
            'sel_sess': options.sessions ? options.sessions.concat('dummy') : ['dummy', '%'],
            'sel_instr': options.instruct ? options.instruct.concat('dummy') : ['dummy', '%'],
            'sel_ptrm': options.partOfTerm ? options.partOfTerm.concat('dummy') : ['dummy', '%'],
            'sel_attr': options.attributes ? options.attributes.concat('dummy') : ['dummy', '%'],
            'sel_divs': options.division ? options.division.concat('dummy') : ['dummy', '%'],
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
            
            if (response.status !== 200){
                throw new Error(`Error with ClassSearch request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with ClassSearch request: ${error}`);
        }
    }

    _parseTime(timeStr){
        let time = {};
        time.hr = Number(timeStr.slice(0, timeStr.indexOf(':')));
        time.min = Number(timeStr.slice(timeStr.indexOf(':') + 1, timeStr.indexOf(' ')));
        time.ap = timeStr.slice(timeStr.indexOf(' ') + 1).includes('am') ? 'a' : 'p';
        return time;
    }

    async singleClassSearch(term, course){
        if (arguments.length < 2){
            throw new Error('Error: Must provide term and course');
        }

        const path = 'bwckctlg.p_disp_listcrse';
        const referPath = 'bwckctlg.p_display_courses';
        const headers = this._createHeaders(referPath);

        const [subject, courseNumber] = course.split(' ');
        const params = querystring.stringify({
            'term_in': term,
            'subj_in': subject,
            'crse_in': courseNumber
        });
        const options = {
            'headers': headers,
            'params': params
        };

        try {
            const response = await this.axios.get(path, options);

            if (response.status !== 200){
                throw new Error(`Error with SingleClassSearch request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with SingleClassSearch request: ${error}`);
        }
    }

    async getCatalogSearchPage(term){
        if (!term){
            throw new Error('Error: must provide term');
        }

        const path = 'bwckctlg.p_disp_cat_term_date';
        const referPath = 'bwckctlg.p_disp_dyn_ctlg';
        const headers = this._createHeaders(referPath);

        const data = querystring.stringify({
            'cat_term_in': term,
            'call_proc_in': referPath
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});

            if (response.status !== 200){
                throw new Error(`Error with CatalogSearchPage request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with CatalogSearchPage request: ${error}`);
        }
    }

    async catalogSearch(term, subjects, options){
        if (arguments.length < 2){
            throw new Error('Error: must provide term and at least 1 subject')
        }
        const path = 'bwckctlg.p_display_courses';
        const referPath = 'bwckctlg.p_disp_cat_term_date';
        const headers = this._createHeaders(referPath);

        const data = querystring.stringify({
            'sel_levl': ['dummy', '%'],
            'sel_schd': ['dummy', '%'],
            'call_proc_in': 'bwckctlg.p_disp_dyn_ctlg',
            'term_in': term,
            'sel_subj': subjects.concat('dummy'),
            'sel_attr': options.attributes ? options.attributes.concat('dummy') : ['dummy', '%'],
            'sel_divs': options.division ? options.division.concat('dummy') : ['dummy', '%'],
            'sel_coll': options.college ? options.college.concat('dummy') : ['dummy', '%'],
            'sel_dept': options.department ? options.department.concat('dummy') : ['dummy', '%'],
            'sel_crse_strt': options.courseNumbers ? options.courseNumbers[0] : '',
            'sel_crse_end': options.courseNumbers ? options.courseNumbers[1] : '',
            'sel_title': options.title ? options.title : '',
            'sel_from_cred': options.credits ? options.credits[0] : '',
            'sel_to_cred': options.credits ? options.credits[1] : '',
        });

        try {
            const response = await this.axios.post(path, data, {'headers': headers});

            if (response.status !== 200){
                throw new Error(`Error with CatalogSearch request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with CatalogSearch request: ${error}`);
        }

    }

    async getDetailedDesc(term, course){
        if (arguments.length < 2){
            throw new Error('Error: must provide term and course');
        }

        const path = 'bwckctlg.p_disp_course_detail';
        const referPath = 'bwckctlg.p_display_courses';
        const headers = this._createHeaders(referPath);

        const [subject, courseNumber] = course.split(' ');
        const params = querystring.stringify({
            'cat_term_in': term,
            'subj_code_in': subject,
            'crse_numb_in': courseNumber
        });
        const options = {
            'headers': headers,
            'params': params
        };

        try {
            const response = await this.axios.get(path, options);

            if (response.status !== 200){
                throw new Error(`Error with DetailedCourseDescrption request: ${response.status} ${response.statusText}\n${response.data}`);
            }
            else return response.data;
        } catch (error) {
            throw new Error(`Error with DetailedCourseDescrption request: ${error}`);
        }
    }
}