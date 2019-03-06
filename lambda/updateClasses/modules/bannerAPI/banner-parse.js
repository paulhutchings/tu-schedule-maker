const cheerio = require('cheerio');
const ClassTime = require('../classtime');
const Section = require('../section');

/**
 * @class BannerParse - Static class tp parse the server response from BannerRequest into useful objects
 */
class BannerParse {
    /**
     * @method classSearchPageParse - Parses the response from the class search page request
     * @param {string} html 
     * @returns {object} An object containing the different options from the Class Search Page 
     */
    static classSearchPageParse(html){
        try {
            const $ = cheerio.load(html);
            return {
                'subjects': BannerParse._extractSelectEntries($, 'sel_subj'),
                'divisions': BannerParse._extractSelectEntries($, 'sel_divs'),
                'instrMethods': BannerParse._extractSelectEntries($, 'sel_insm'),
                'campus': BannerParse._extractSelectEntries($, 'sel_camp'),
                'terms': BannerParse._extractSelectEntries($, 'sel_ptrm'),
                'profs': BannerParse._extractSelectEntries($, 'sel_instr'),
                'sessions': BannerParse._extractSelectEntries($, 'sel_sess'),
                'attributes': BannerParse._extractSelectEntries($, 'sel_attr')
            };           
        } catch (error) {
            throw new Error(`Error parsing Class Search Page: ${error}`);
        } 
    }

    /**
     * @private
     * @method _extractSelectEntries - Extracts the option entries from an HTML select element with the specified name
     * @param {CheerioStatic} $ 
     * @param {string} name - The name attribute of the given HTML select element
     * @returns An array of entries for the given HTML element
     */
    static _extractSelectEntries($, name){
        try {
            let s = new Set(); //used to help remove duplicates, as they exist on the Banner page
            return $(`select[name=${name}] option`)
                .map((i, e) => {
                    let id = $(e).val();
                    if(!s.has(id)){
                        s.add(id);
                        return {
                            'id': id,
                            'name': $(e).text()
                        }; 
                    }
                })
                .toArray()
                .filter(x => x.id != '%');
        } catch (error) {
            throw new Error(`Error extracting extries for ${name}: ${error}`);
        }
    }

    /**
     * @method classSearchParse - Parses the server response from a class search into Section objects
     * @param {string} html - The HTML server response
     * @param {string} mode - The mode for the API to operate in. Defaults to 'normal', which is for standalone
     * use. The other option is 'stream' to use the function as part of a stream.
     * @returns {[Section]} - An array of section objects for the classes returned from the server
     */
    static classSearchParse(html){
        const $ = cheerio.load(html);
        const listings = $('table.datadisplaytable th.ddtitle a');
        try {
            return listings
                .map((i, listing) => BannerParse._createSection($, listing))
                .toArray();
        } catch (error) {
            throw new Error(`Error parsing Class Search Response ${error}`);
        }
    }

    /**
     * @private
     * @method _createSection
     * @param {CheerioElement} $ 
     * @param {CheerioElement} listing 
     * @returns {Section}
     */
    static _createSection($, listing){
        return new Section(
            BannerParse._parseEntryTitle($(listing).text()), 
            BannerParse._getClassTimes($, listing), 
            BannerParse._isOpen($, listing),
            BannerParse._getCampus($, listing)
        );
    }

    /**
     * @private
     * @method parseEntryTitle - Parses the string in the entry row and extracts the CRN, class name, and class title
     * @param {string} text - The title string containing the CRN, course name, and course title
     * @return {[number, string, string, number]} - A tuple containing (in the following order):
     * - The CRN (course registration number) for the section
     * - The course name (MATH 1041)
     * - The course title (Calculus I)
     * - The section number
     */
    static _parseEntryTitle(text){
        const words = text.split(' - ');
        const name = words.length === 4
            ? words[2]
            : words[3];
        const title = words.length === 4
            ? words[0]
            : `${words[0]} - ${words[1]}`;
        const crn = words.length === 4
            ? Number(words[1])
            : Number(words[2]);
        const sectionNum = words.length === 4
            ? Number(words[3])
            : Number(words[4]);
        return [crn, name, title, sectionNum];
    }

    /**
     * @private
     * @method _getClassTimes - Gets the classtimes for the given section listing
     * @param {CheerioStatic} $ - The document root
     * @param {CheerioElement} listing - The listing for the section on the page
     * @return {[ClassTime]} - The classtimes associated with the given section
     */
    static _getClassTimes($, listing){
        const table = (BannerParse._getAdjRow($, listing)).find('table.datadisplaytable tr');
        var classTimes = [];
        for (let index = 2; index <= table.length; index++) {
            classTimes.push(BannerParse._createClassTime(table, index));
        }
        return classTimes;
    }

    /**
     * @private
     * @method _getAdjRow - Gets the next row in the main HTML table
     * @param {CheerioStatic} $ - The document root
     * @param {CheerioElement} listing - The listing for the section on the page
     * @return {CheerioElement} - The next entry in the table
     */
    static _getAdjRow($, listing){
        return $(listing)
            .parent()
            .parent()
            .next();
    }

    /**
     * @private
     * @method createClassTime - Creates a new ClassTime object given a data table element 
     * and the index of the row of the table to extract the data from
     * @param {CheerioElement} table - The table containing the class data within the section entry on the page
     * @param {number} index - The row of the table (except the first) to get data from
     * @return {ClassTime} A ClassTime object containing the data from the row
     */
    static _createClassTime(table, index){
        const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;
        const times = BannerParse._parseTime(table
            .find(`${selector}(2)`)
            .text()
            .trim());
        const days = table
            .find(`${selector}(3)`)
            .text()
            .trim();
        const location = table
            .find(`${selector}(4)`)
            .text()
            .trim();
        const instructor = BannerParse._cleanInstrStr(table
            .find(`${selector}(7)`)
            .text());
        return new ClassTime(days, times, instructor, location);
    }

    /**
     * @private
     * @method _parseTime - Takes the string from the time column, 
     * and converts it into a pair 24-hour based numbers, or -1 for both if the class has no set meeting time
     * @param {string} timeString - The string in the time column of the table
     * @return {[number, number]} - A tuple containing the start and end times for the class
     */
    static _parseTime(timeString){
        if (timeString === "TBA"){
            return [-1, -1];
        }
        else return timeString
            .split(' - ')
            .map(str => {
                let time = Number(String(str).replace(/[apm:]/g,''));
                if (String(str).includes("pm") && time < 1200) {
                    time += 1200;
                }
                return time;
            }); 
    }

    /**
     * @private
     * @method _cleanInstrStr - Cleans up the Instructor field string, removing the (P) and excessive whitespace
     * @param {string} str - The string containing the professor or TA's name
     * @return {string} - A cleaned up string containing the professor or TA's name 
     */
    static _cleanInstrStr(str){
        return str.replace(/\s+/g, ' ')
            .replace("(P)", '')
            .replace(/\s+,/g, ',')
            .trim();
    }

    /**
     * @private
     * @method _isOpen - Returns whether a section is open based on the available seats #
     * @param {CheerioElement} $ - The document root
     * @param {CheerioElement} listing - The listing for the section on the page
     * @return {boolean} - True if there are open seats, False otherwise
     */
    static _isOpen($, listing){
        const td = (BannerParse._getAdjRow($, listing)).find('td.dddefault');
        const seats = $(td)
            .contents()
            .filter(function () { //Lambda doesn't work
                return this.type == 'text'
                    && this.prev != null
                    && this.prev.name == 'b';
            })
            .text()
            .trim();
        return Number(seats) > 0;
    }

    /**
     * @private
     * @method _getCampus - Extracts the campus from the listing info
     * @param {CheerioStatic} $ 
     * @param {CheerioElement} listing 
     * @returns {string} - The campus where the section takes place
     */
    static _getCampus($, listing){
        return BannerParse._getAdjRow($, listing).find('td.dddefault')
            .contents()
            .filter(function(){
                return this.type == 'text' &&
                this.data.includes('Campus') &&
                this.prev != null &&
                this.prev.name == 'br';
            })
            .text()
            .trim();                                       
    }

    /**
     * @param {string} html 
     */
    static singleClassSearchParse(html){

    }

    /**
     * @param {string} html 
     */
    static catalogSearchPageParse(html){
        try {
            const $ = cheerio.load(html);
            return {
                'subjEntries': BannerParse._extractSelectEntries($, 'sel_subj'),
                'divEntries': BannerParse._extractSelectEntries($, 'sel_divs'),
                'schoolEntries': BannerParse._extractSelectEntries($, 'sel_coll'),
                'attributeEntries': BannerParse._extractSelectEntries($, 'sel_attr')
            };           
        } catch (error) {
            throw new Error(`Error parsing Catalog Search Page: ${error}`);
        } 
    }

    /**
     * @param {string} html 
     */
    static catalogSearchParse(html){
        const $ = cheerio.load(html);
        var courses = [];

        try {
            return $('table.datadisplaytable th.ddtitle a')
            .map((i, listing) => {
                
            })
            .toArray();
        } catch (error) {
            throw new Error(`Error parsing Catalog Search Response ${error}`);
        }
    }

    /**
     * @param {string} html 
     */
    static detailDescParse(html){

    }
}

/**
 * @exports
 * The BannerParse static class
 */
module.exports = BannerParse;