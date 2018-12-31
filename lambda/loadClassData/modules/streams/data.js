const cheerio = require('cheerio');
const process = require('process');
const ClassTime = require('../classtime');
const Section = require('../section');
const Course = require('../course');
const { parseEntry, 
        getTable, 
        isOpen, 
        parseTime, 
        cleanInstructorString 
    } = require('../parse');
const {AsyncTransform} = require('./streams');

class ExtractStream extends AsyncTransform {
    constructor(){
        super();
    }

    //Extracts the courses and sections from the HTML. The function also logs the time taken to 
    //parse the HTML, extract the sections, and write them to the database;
    async _task(data){ 
        try {
            const [subject, html] = data;
            var courses = new Map();
            const selector = 'table.datadisplaytable th.ddtitle a';

            //Log start time of HTML processing
            console.log(`Finding courses in ${subject}...`);
            const procStart = process.hrtime();
            const $ = cheerio.load(html);

            var listings = $(selector);  
            var tasks = listings.map(async (i, result) => this._createSection($, result, courses));
            await Promise.all(tasks.toArray());
            console.log(`${courses.size} courses found for ${subject}`);
            
            //Log the end time of the processing
            const procEnd = process.hrtime(procStart);
            console.log(`Processing ${subject} took ${procEnd[0]}s`);

            return [subject, Array.from(courses.values())];
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    //Creates a new section for a course given the entry row and the document root
    async _createSection($, listing, courses){
        try {
            var [name, title, crn] = await parseEntry($(listing).text());
        
            var table = await getTable($, listing);
            var classTimes = [];   
            for (let index = 2; index <= table.length; index++) {
                classTimes.push(await this._createClassTime(table, index));       
            }

            var sec = new Section(crn, classTimes, await isOpen($, listing));

            if (!courses.has(name)) {
                courses.set(name, new Course(name, title));           
            }

            courses.get(name).addSection(sec);
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    //Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
    async _createClassTime(table, index){
        try {
            const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;

            var times = await parseTime(table
                .find(`${selector}(2)`)
                .text()
                .trim()
                .split(' - '));       
            var startTime = Number.isNaN(times[0]) 
                ? -1 
                : times[0];
            var endTime = times.length > 1 
                ? times[1] 
                : -1;

            var days = table
                .find(`${selector}(3)`)
                .text()
                .trim();
            days = days === "" 
                ? null 
                : days;
            var location = table
                .find(`${selector}(4)`)
                .text()
                .trim();
            var building = location === "TBA" 
                ? null 
                : location
                .slice(0, location.lastIndexOf(' '));
            var instructor = await cleanInstructorString(table
                .find(`${selector}(7)`)
                .text());
            
            return new ClassTime(days, startTime, endTime, instructor, location, building);
            
        } catch (error) {
            console.log(`Error: ${error}`);
        }       
    }
}

module.exports = ExtractStream;