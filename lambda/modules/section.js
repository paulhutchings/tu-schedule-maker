import * as ClassTime from "./classtime";

class Section{
    constructor(crn, lecture, labrec){
        this.crn = crn;
        if (arguments.length === 3){
            this.classtimes = [lecture, labrec];
            this.hasLabRec =  true;
        }
        else {
            this.classtimes = [lecture];
            this.hasLabRec = false; 
        }
                   
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

modules.export = Section;