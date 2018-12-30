const cheerio = require('cheerio');
const process = require('process');
const ClassTime = require('../modules/classtime');
const Section = require('../modules/section');
const Course = require('../modules/course');
const { parseEntry, 
        getTable, 
        isOpen, 
        parseTime, 
        cleanInstructorString 
    } = require('../../parse');
const {AsyncTransform} = require('./streams');

class ExtractStream extends AsyncTransform {
    constructor(){
        super();
    }

    //Extracts the courses and sections from the HTML. The function also logs the time taken to 
    //parse the HTML, extract the sections, and write them to the database;
    async _task(data){ 
        try {
            var courses = new Map();
            const selector = 'table.datadisplaytable th.ddtitle a';

            //Log start time of HTML processing
            const procStart = process.hrtime();
            console.log('Loading HTML...');
            const $ = cheerio.load(data);

            var listings = $(selector);  
            console.log('Creating sections...');
            var tasks = listings.map((i, result) => _createSection($, result, courses));
            await Promise.all(tasks);
            console.log(`${courses.size} courses extracted`);
            
            //Log the end time of the processing
            const procEnd = process.hrtime(procStart);
            console.log(`Processing took ${procEnd[0]}s`);

            return Array.from(courses.values());
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }

    //Creates a new section for a course given the entry row and the document root
    async _createSection($, listing, courses){
        var [name, title, crn] = await parseEntry($(listing).text());

        var table = await getTable($, listing);
        var classTimes = [];   
        for (let index = 2; index <= table.length; index++) {
            classTimes.push(await _createClassTime(table, index));       
        }

        var sec = new Section(crn, classTimes, await isOpen($, listing));

        if (!courses.has(name)) {
            courses.set(name, new Course(name, title));           
        }

        courses.get(name).addSection(sec);
    }

    //Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
    async _createClassTime(table, index){
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
    }
}

module.exports = ExtractStream;