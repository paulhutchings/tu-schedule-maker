class Course {
    constructor(name, title){
        this.name = name; //ex: CIS 1068
        this.title = title; //ex: "Program Design and Abstraction"
        this.sections = [];
    }

    addSection(section) {
        this.sections.push(section);
    }

    get numSections(){
        return this.sections.length;
    }
}

module.exports = Course;