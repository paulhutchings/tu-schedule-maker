/**
 * @class
 * Represents a course entry in the catalog. Contains the course name, title, and a list of all the sections
 * for the course
 */
class Course {
    /**
     * @constructor
     * Creates a new Course object
     * @param {string} name - The abbreviation and course number (i.e. CIS 1068)
     * @param {string} title - The title for the course (i.e. "Program Design and Abstraction")
     */
    constructor(name, title){
        this.name = name;
        this.title = title;
        this.sections = [];
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
}

/**
 * @exports Course
 */
module.exports = Course;