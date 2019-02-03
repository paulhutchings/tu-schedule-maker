const BannerReq = require('./banner-req');
const BannerParse = require('./banner-parse');

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
     * * days: [string] - An array of day characters (mtwrf) that represent the days on which classes are desired
     * * campus: [string] - An array of campus codes representing the campuses on which to search for classes. See the 'campus' table for 
     * corresponding campus codes
     * * profs: [string] - An array of instructor IDs that represent desired professors (note, only courses taught by those professors will 
     * be returned by Banner). See the 'professors' table for corresponding professor IDs
 */
class BannerAPI {
    /**
     * @constructor - Creates a new instance of BannerAPI with the (optional) timeout for requests
     * @param {number} timeout - The timeout for server requests in seconds (defaults to 30)
     * @return {BannerAPI} - A new instance of BannerAPI
     */
    constructor(timeout=30){
        this.req = new BannerReq(timeout);
        this.parse = new BannerParse();
    }  

    /**
     * @private
     * @method _correctOptions - Converts certain fields of the request options to upper or lower
     * case depending of what the server requires.
     * @param {string} subjects - Either a string, or array of strings of subjects ID's
     * @param {object} options 
     */
    _correctOptions(subjects, options){
        subjects = typeof(subjects) === typeof(Array) ?
            subjects.map(s => s.toUpperCase()) :
            subjects.toUpperCase();
        ['campus', 'instructMethod', 'sessions', 'partOfTerm', 'division', 'attributes'].forEach(e => {
            if (options[e]) {
                options[e] = typeof (options[e]) === typeof (Array) ?
                    options[e].map(e => e.toUpperCase()) :
                    options[e] = options[e].toUpperCase();
            }
        });
        if (options.days) {
            options.days = options.days.length > 1 ?
                options.days.map(d => d.toLowerCase()) :
                options.days.toLowerCase();
        }      
        return [subjects, options];
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
            const html = await this.req.classSearchPageReq(term);
            return this.parse.classSearchPageParse(html);
        } catch (error) {
            throw new Error(error);
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
        [subjects, options] = this._correctOptions(subjects, options);
        try {
            const html = await this.req.classSearchReq(term, subjects, options);
            return this.parse.classSearchParse(html);
        } catch (error) {
            throw new Error(error);
        }
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
     * @method
     * @param {number} term 
     */
    async getCatalogSearchPage(term){
        if (!term){
            throw new Error('must provide term');
        }
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
     * @method
     * @param {number} term 
     * @param {string} course 
     */
    async getDetailedDesc(term, course){
        if (arguments.length < 2){
            throw new Error('must provide term and course');
        }
    }
}

/**
 * @exports BannerAPI - A singleton instance of the class.
 */
module.exports = new BannerAPI();