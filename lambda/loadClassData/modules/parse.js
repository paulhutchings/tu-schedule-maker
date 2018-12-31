//Various parsing functions for parsing the HTML response

//Parses the string in the entry row and extracts the CRN, class name, and class title
async function parseEntry(text){
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
        console.log(`Error: ${error}`);
    }
}

//Gets the associated data table for the given entry element
async function getTable($, listing){
    return (await getAdjEntry($, listing)).find('table.datadisplaytable tr');
}

//Gets the HTML table adjacent to the entry, which contains the class description, information, etc
async function getAdjEntry($, listing){
    try {
        return $(listing)
            .parent()
            .parent()
            .next();
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

//Returns whether a section is open based on the available seats #
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
        console.log(`Error: ${error}`);
    }
}

//Cleans up the Instructor field string
async function cleanInstructorString(str){
    return str.replace(/\s+/g, ' ')
        .replace("(P)", '')
        .replace(/\s+,/g, ',')
        .trim();
}

//Takes the array of time strings from the time column, and converts each to a 24 hour format number
async function parseTime(timeStrings){
    try {
        return timeStrings.map(x => {
            var time = Number(String(x).replace(/[apm:]/g,''));
            if (String(x).includes("pm") && time < 1200) {
                time += 1200;
            }
            return time;
        });
    } catch (error) {
        console.log(`Error: ${error}`);
    }   
}

module.exports = {parseEntry, parseTime, cleanInstructorString, getAdjEntry, getTable, isOpen}