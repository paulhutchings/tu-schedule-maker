import * as ClassTime from "./classtime";

class Section{
    constructor(crn, lecture, labrec){
        this.crn = crn;
        this.lecture = lecture;
        this.labrec = labrec;
        this.classtimes = [lecture, labrec];
    }

    //Takes in 2 Section objects and returns whether or not they have any days in common
    static onSameDay(section1, section2){
        //Go through each ClassTime object, and see if they share any days
        section1.classtimes.forEach(function(element){
            section2.classtimes.forEach(function(item){
                if (ClassTime.onSameDay(element, item)){
                    return true;
                }
                //Add null filters to both loops in case there is no labrec (nessecary?)
            }).filter(x => x !== null)
        }).filter(x => x !== null);

        return false;
    }

    //Takes in 2 Section objects and returns whether or not they have a time conflict
    static hasTimeConflict(section1, section2){
        //First test if any days are shared. If not, than no need to test the times
        if(!Section.onSameDay(section1, section2)){
            return false;
        }

        //Go through each ClassTime object. If any of them have a time conflict, than the section as a whole has a time conflict
        section1.classtimes.forEach(function(element){
            section2.classtimes.forEach(function(item){
                if (ClassTime.hasTimeConflict(element, item)){
                    return true;
                }
                //Add null filters to both loops in case there is no labrec (nessecary?)
            }).filter(x => x !== null)
        }).filter(x => x !== null);

        return false;
    }
}

modules.export = Section;