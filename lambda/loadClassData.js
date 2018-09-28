// import * as ClassTime from "./modules/classtime"
// import * as Section from "./modules/section"
// import * as Course from "./modules/course"

const fs = require('fs');
const cheerio = require('cheerio');
var courses = new Map();

console.log('Reading file');
fs.readFile('./classes.html', 'UTF-8', function(err, data){
    if (err) console.log(err);

    console.log('Loading HTML...');
    const html = cheerio.load(data);
    console.log('HTML loaded, querying DOM...');
    var listings = html('table.datadisplaytable th.ddtitle a');  
    console.log('Query complete, creating sections...');
    listings.each((i, element) => createSection(html, element));
    console.log('Section creation complete, writing to file...');
    courses.forEach(x => {
        //console.log(x);
        fs.appendFile('classes.json', `${JSON.stringify(x)}\n\n`, "UTF-8", function(err){
            if (err) {
                console.log(err);
            }
        });
    });
    console.log("File saved");
});

//HELPER FUNCTIONS

//Creates a new section for a course given the entry row and the document
function createSection(html, element){
    var rowItems = parseEntry(html(element).text());
    var name = rowItems[0];
    var title = rowItems[1];
    var crn = rowItems[2];

    var table = getTable(html, element);
    var classTimes = [];   
    for (let index = 2; index <= table.length; index++) {
        classTimes.push(createClassTime(table, index));       
    }

    var sec = new Section(crn, classTimes);

    if (!courses.has(name)) {
        courses.set(name, new Course(name, title));           
    }
    courses.get(name).addSection(sec);
}

//Parses the string in the entry row and extracts the CRN, class name, and class title
function parseEntry(text){
    words = text.split(' - ');
    var name = words.length === 4 ? words[2] : words[3];
    var title = words.length === 4 ? words[0] : `${words[0]} - ${words[1]}`;
    var crn = words.length === 4 ? Number(words[1]) : Number(words[2]);

    return [name, title, crn];
}

//Gets the associated data table for the given entry element
function getTable(html, element){
    return html(element
        .parent
        .parent
        .next
        .next)
        .find('table.datadisplaytable tr');
}

//Creates a new ClassTime object given a data table element and the index of the row of the table to extract the data from
function createClassTime(table, index){
    var path = `tr:nth-child(${index}) td.dddefault:nth-child`;
    var times = parseTime(table
        .find(`${path}(2)`)
        .text()
        .trim()
        .split(' - '));
    var startTime = times[0];
    var endTime = times[1]; 
    var days = table
        .find(`${path}(3)`)
        .text()
        .trim();
    var location = table
        .find(`${path}(4)`)
        .text()
        .trim();
    var building = location === "TBA" ? null : location
    .slice(0, location
        .lastIndexOf(' '));
    var instructor = cleanInsString(table
        .find(`${path}(7)`)
        .text());
    
    return new ClassTime(days, startTime, endTime, instructor, location, building);
}

//Cleans up the Instructor field string
function cleanInsString(str){
    return str.replace(/\s+/g, ' ')
    .replace("( P)", '')
    .replace(/\s+,/g, ',')
    .trim();
}

//Takes the array of time strings from the tie column, and converts each to a 24 hour format number
function parseTime(timeStrings){
    return timeStrings.map(x => {
        var time = Number(String(x).replace(/[apm:]/g,''));
        if (String(x).includes("pm")) {
            if (time < 1200) {
                time += 1200;
            }
        }
        return time;
    });
}

//CLASSES

class ClassTime{
    constructor(days, startTime, endTime, instructor, location, building){
        this.days = days;
        this.startTime = startTime;
        this.endTime = endTime;
        this.instructor = instructor;
        this.location = location;
        this.building = building;
    }

    //Takes 2 ClassTime objects and returns whether they have any days in common
    static onSameDay(class1, class2){
        var combined = class1.days + class2.days; //Add all of the characters together
        return (/([a-zA-Z]).*?\1/).test(combined); //Regex will match any duplicates, therefore the 2 classes share days
    }

    //Takes 2 ClassTime objects and returns whether they have a time conflict
    static hasTimeConflict(class1, class2){
        if (!ClassTime.onSameDay(class1, class2)){ //If both classes are not on the same day, we don't need to check the times
            return false;
        }

        //See if the start or end time for class1 falls in between class2's start and end times
        var startConflict = class1.startTime >= class2.startTime && class1.startTime <= class2.endTime;
        var endConflict = class1.endTime >= class2.startTime && class1.endTime <= class2.endTime;

        return startConflict || endConflict;
    }
}

class Section{
    constructor(crn, classtimes){
        this.crn = crn;
        this.classtimes = classtimes;
        this.hasLabRec = this.classtimes.length > 1 ? true : false;                  
    }

    //Takes in 2 Section objects and returns whether or not they have any days in common
    static onSameDay(section1, section2){
        //Go through each ClassTime object, and see if they share any days
        section1.classtimes.forEach(x =>{
            section2.classtimes.forEach(y =>{
                if (ClassTime.onSameDay(x, y)){
                    return true;
                }
            })
        });

        return false;
    }

    //Takes in 2 Section objects and returns whether or not they have a time conflict
    static hasTimeConflict(section1, section2){
        //First test if any days are shared. If not, than no need to test the times
        if(!Section.onSameDay(section1, section2)){
            return false;
        }

        //Go through each ClassTime object. If any of them have a time conflict, than the section as a whole has a time conflict
        section1.classtimes.forEach(x =>{
            section2.classtimes.forEach(y =>{
                if (ClassTime.hasTimeConflict(x, y)){
                    return true;
                }
            })
        });

        return false;
    }
}

class Course{
    constructor(name, title){
        this.name = name; //ex: CIS 1068
        this.title=title; //ex: "Program Design and Abstraction"
        this.sections = [];
    }

    addSection(section) {
        this.sections.push(section);
    }
}