
const Section = require('./section');

/**
 * @class
 * Represents a course entry in the catalog. Contains the course name, title, and a list of all the sections
 * for the course. Other commitments, such as jobs, sports/music practices, etc. are also defined as Courses.
 * In those situations, the Course will have no title (just a name), and only 1 section, which could contain
 * multiple CLassTime objects to represent shifts, practice times, etc.
 */
class Course {
    /**
     * @constructor
     * Creates a new Course object
     * @param {string} name - The abbreviation and course number (i.e. CIS 1068)
     * @param {string} title - The title for the course (i.e. "Program Design and Abstraction")
     */
    constructor(name, title, sections=[]){
        this.name = name;
        this.title = title;
        this.sections = sections;
    }

    /**
     * @method addSection - Adds a new Section object to the list
     * @param {Section} section 
     */
    addSection(section) {
        this.sections.push(section);
    }

    /**
     * @method
     * @return {number} - The number of sections there are for the course
     */
    get numSections(){
        return this.sections.length;
    }

    static parseCourse(obj){
        try{
            return new Course(obj.name, obj.title, Section.parseSections(obj.sections));
        }
        catch(error){
            console.log(error);
        }
    }
}

/**
 * @exports Course
 */

module.exports = Course;