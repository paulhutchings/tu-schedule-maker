class Course{
    constructor(name, title){
        this.name = name.replace("&amp", "and"); //Name is DEPT #### (e.g., CIS 1068) replace the HTML &amp with and
        this.title=title; //e.g., "Program Design and Abstraction"
        this.sections = [];
    }

    addSection(section) {
        this.sections.push(section);
    }

}

module.exports = Course;