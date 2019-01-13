//Various parsing functions for parsing the HTML response

/**
 * @function parseEntryTitle - Parses the string in the entry row and extracts the CRN, class name, and class title
 * @param {string} text - The title string containing the CRN, course name, and course title
 * @return {[string, string, number]} - A tuple containing the CRN, course name, and course title
 */
async function parseEntryTitle(text){
    try {
        var words = text.split(' - ');
        var name = words.length === 4 
            ? words[2] 
            : words[3];
        var title = words.length === 4 
            ? words[0] 
            : `${words[0]} - ${words[1]}`;
        var crn = words.length === 4 
            ? Number(words[1]) 
            : Number(words[2]);

        return [name, title, crn];
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function getTable - Gets the associated data table for the given entry element
 * @param {CheerioElement} $ - The document root
 * @param {CheerioElement} listing - The listing for the section on the page
 * @return {CheerioElement} - The data table within the entry
 */
async function getTable($, listing){
    return (await getAdjEntry($, listing)).find('table.datadisplaytable tr');
}

/**
 * @function getAdjEntry - Gets the next entry in the main table on the page
 * @param {CheerioElement} $ - The document root
 * @param {CheerioElement} listing - The listing for the section on the page
 * @return {CheerioElement} - The next entry in the table
 */
async function getAdjEntry($, listing){
    try {
        return $(listing)
            .parent()
            .parent()
            .next();
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function isOpen - Returns whether a section is open based on the available seats #
 * @param {CheerioElement} $ - The document root
 * @param {CheerioElement} listing - The listing for the section on the page
 * @return {boolean} - True if there are open seats, False otherwise
 */
async function isOpen($, listing){
    try {
        var td = (await getAdjEntry($, listing)).find('td.dddefault');
        var seats = $(td)
            .contents()
            .filter(function(){ //Lambda doesn't work
                return this.type == 'text' 
                    && this.prev != null 
                    && this.prev.name == 'b';
            })
            .text()
            .trim();
        return Number(seats) > 0;
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function cleanInstructorString - Cleans up the Instructor field string, removing the (P) and excessive whitespace
 * @param {string} str - The string containing the professor or TA's name
 * @return {string} - A cleaned up string containing the professor or TA's name 
 */
async function cleanInstructorString(str){
    return str.replace(/\s+/g, ' ')
        .replace("(P)", '')
        .replace(/\s+,/g, ',')
        .trim();
}

/**
 * @function parseTime - Takes the string from the time column, 
 * and converts it into a pair 24-hour based numbers, or -1 for both if the class has no set meeting time
 * @param {string} timeString - The string in the time column of the table
 * @return {[number, number]} - A tuple containing the start and end times for the class
 */
async function parseTime(timeString){
    try {
        if (timeString === "TBA"){
            return [-1, -1];
        }
        else return timeString
            .split(' - ')
            .map(str => {
                var time = Number(String(str).replace(/[apm:]/g,''));
                if (String(str).includes("pm") && time < 1200) {
                    time += 1200;
                }
                return time;
            });
    } catch (error) {
        console.log(error);
    }   
}

/**
 * @exports
 * A library of parsing functions
 */
module.exports = {parseEntryTitle, parseTime, cleanInstructorString, getAdjEntry, getTable, isOpen}