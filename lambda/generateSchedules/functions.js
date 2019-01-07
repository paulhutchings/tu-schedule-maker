const Course = require('./modules/course');
const ClassTime = require('./modules/classtime');
const Section = require('./modules/section');

/**
 * @function peek - Returns the last item in the array without removing it
 * @return {*} - The last item in the array
 */
Array.prototype.peek = function(){
    return this[this.length - 1];
}

/**
 * @function noConflict - Checks if the given section conflicts with any other sections in the schedule
 * @param {Section} section - The section to check against
 * @param {[[string, Section]]} schedule - An array of string-Section pairs representing the current schedule
 * @return {boolean} - TRUE if the section does not conflict with any other section in the array, FALSE otherwise
 */
function noConflict(section, schedule){
    return schedule.every(pair => 
        !section.hasTimeConflict(pair[1]));
}

/**
 * @function generateSchedules - Calculates all possible schedules that can be made with the given set of courses.
 * The function only tests for and eliminates time conflicts. The results from this function are futher filtered
 * based on the rest of the parameters the user provided. The algorithm "reaches forward" as far as it can go,
 * adding courses and sections until it has either built a schedule, or cannot find any non-conflicting sections.
 * When it cannot find any suitable sections, it will backtrack and try the next section of the previous course,
 * and continues to reach and backtrack until all possibilities have been exhausted.
 * @param {[Course]} courses - An array of Courses that the user has provided. This includes any "special courses" (job, 
 * sports/music practice, etc) that the user may have provided. Special courses should be first in the list to
 * optimize runtime.
 * @return {[Map<string, Section]} - An array of Maps, where each map represents a schedule, mapping each course
 * name to a section.
 */
function generateSchedules(courses){
    /**
     * @var temp - A stack used to build a temporary schedule. Sections are pushed onto the stack as non-conflicting
     * ones are found, and popped in the case of backtracking. When the stack reaches the same size as the number of
     * courses, it is shallow copied in the results list.
     */
    var temp = [];
    /**
     * @var current - A stack used to keep track of the current Course from the courses list that the algorithm
     * is processing. Courses are added to the stack once a suitable section fromt he previous course has been
     * added to temp. In the case of backtracking, Courses are popped off the stack.
     */
    var current = [];
    /**
     * @var index - A stack used to keep track of the index of the Section that was pushed onto temp from the Course
     * in current. The index that is pushed is 1 greater than the index at which the suitable Section was found, so
     * that in the case of backtracking, the algorithm can pick up where it left off with the next Section in the list.
     */
    var index = [];
    /**
     * @var results - An array of Maps, where each map represents a schedule. When temp reaches the same size as the
     * number of courses, a new map is created and added to results.
     */
    var results = [];

    //Preload all 3 stacks with initial values
    current.push(courses[0]);
    temp.push([courses[0].name, courses[0].sections[0]]);
    index.push(1);

    //i is the index of which course from the courses list the algorithm is currently on
    let i = 1;

    /*Once the first course that was preloaded has been popped off the stack (all sections have been tried), 
    the loop will break */
    while (current.length > 0) {
        /*If the 2 stacks do not contain the same # of items, that means that no compatible section was found
        previously, and we pop the placeholder off the stack to pick up where we left off with the previous course*/
        if (current.length !== temp.length) {
            var j = index.pop();
        }
        //Otherwise, we can push the next course onto the current stack and iterate through it's sections
        else {
            current.push(courses[i]);
            var j = 0;
        }

        /*Go through the sections of the top course in the stack. If a section is compatible with the current
        temporary schedule in temp, it is pushed onto temp, and the placeholder index for the next section in 
        the list is also saved onto the index stack. */
        let top = current.peek();
        while (j < top.sections.length) {
            let section = top.sections[j];
            if (noConflict(section, temp)) {
                temp.push([top.name, section]);
                index.push(j + 1);
                break;
            }
            j++;
        }

        /*Once the temp stack has the required number of sections, we do a shallow copy of temp in it's current
        state and convert it into a map, then place it in the results list. Lastly, remove the last section so 
        that any remaining sections of the current course can be tested.*/
        if (temp.length === courses.length) {
            // let schedule = new Map(temp);
            results.push(Array.from(temp));
            temp.pop();
        }
        /*If j is not less than the number of sections in the current course, then that means that so compatible
        section was found, so we need to backtrack to the previous course and try the remaining sections. We also
        decrement i to keep it aligned with which course in the list we're on*/
        else if (j >= top.sections.length) {
            current.pop();
            temp.pop();
            i--;
        }
        //Otherwise increment i to move onto the next course in the next loop iteration
        else i++;
    }

    return results;
}

function genSchedRecur(courses){
    var tempSched = new Map();
    var results = [];

    courses[0].sections.forEach(item => {
        tempSched.set(courses[0].name, item);
        testSections(tempSched, courses, results, 1);
        tempSched.delete(courses[0].name);
    });
    return results;
}

function testSections(tempSched, courses, results, index){
    if (tempSched.size < courses.length){
        courses[index].sections.filter(item => noConflict(item, Array.from(tempSched.entries())))
                                .forEach(element => {
                                    tempSched.set(courses[index].name, element);
                                    testSections(tempSched, courses, results, index + 1);
                                });
    }

    if (tempSched.size === courses.length){
        results.push(new Map(tempSched));
    }
    tempSched.delete(Array.from(tempSched.keys()).pop());
}

module.exports = {genSchedRecur, generateSchedules};

