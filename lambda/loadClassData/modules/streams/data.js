const cheerio = require('cheerio');
const ClassTime = require('../classtime');
const Section = require('../section');
const Course = require('../course');
const { parseEntryTitle, 
        getTable, 
        isOpen, 
        parseTime, 
        cleanInstructorString 
    } = require('../parse');
const {TransformAsync} = require('./streams');

/**
 * @function extractData - Extracts the courses and sections from the HTML response provided
 * @param {[string, string]} data - A tuple array containing the related subject and the HTML response
 * @return {[string, [Course]]} - A tuple containing the subject linked to the response, and an array of Course
 * objects containing all of the courses extracted from the response
 */
async function extractData(data){
    try {
        const [subject, html] = data;
        var courses = new Map();
        const selector = 'table.datadisplaytable th.ddtitle a';

        console.log(`Finding courses in ${subject}...`);
        const $ = cheerio.load(html);

        var listings = $(selector);
        var tasks = listings.map(async (i, result) => createSection($, result, courses));
        await Promise.all(tasks.toArray());
        console.log(`${courses.size} courses found for ${subject}`);

        return [subject, Array.from(courses.values())];
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function createSection - Creates a new section for a course given the entry row and the document root
 * @param {CheerioElement} $ - The HTML document root
 * @param {CheerioElement} listing - The CheerioElement corresponding to a section entry on the page
 * @param {Map<string, Course>} courses - A map of courses found on the page
 */
async function createSection($, listing, courses){
    try {
        var [name, title, crn] = await parseEntryTitle($(listing).text());

        var table = await getTable($, listing);
        var classTimes = [];
        for (let index = 2; index <= table.length; index++) {
            classTimes.push(await createClassTime(table, index));
        }

        var sec = new Section(crn, classTimes, await isOpen($, listing));

        if (!courses.has(name)) {
            courses.set(name, new Course(name, title));
        }

        courses.get(name).addSection(sec);
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function createClassTime - Creates a new ClassTime object given a data table element 
 * and the index of the row of the table to extract the data from
 * @param {CheerioElement} table - The table containing the class data within the section entry on the page
 * @param {number} index - The row of the table (except the first) to get data from
 * @return {ClassTime} A ClassTime object containing the data from the row
 */
async function createClassTime(table, index){
    try {
        const selector = `tr:nth-child(${index}) td.dddefault:nth-child`;

        var [startTime, endTime] = await parseTime(table
            .find(`${selector}(2)`)
            .text()
            .trim());
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
        var instructor = await cleanInstructorString(table
            .find(`${selector}(7)`)
            .text());

        return new ClassTime(days, startTime, endTime, instructor, location);

    } catch (error) {
        console.log(error);
    }
}

/**
 * @exports TransformAsync
 * A new instance of TransformAsync that parses the HTML data and organizes it into 
 * Course, Section, and ClassTime objects
 */
module.exports = new TransformAsync(extractData, {objectMode: true});