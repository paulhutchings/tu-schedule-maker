using System;
using System.Collections.Generic;
using System.Text;

//each schedule is made of of n number of courses

namespace ScheduleMaker
{
    class Schedule
    {
        private IDictionary<string, Course> courses;
        private string name;
        //private int numClasses;

        public Schedule(string name)
        {
            this.name = name;
            //this.numClasses = numClasses;
            courses = new Dictionary<string, Course>();
        }

        public void AddCourse(Course newCourse)
        {
            courses.Add(newCourse.Name, newCourse);
        }

        public string Name
        {
            get { return this.name; }
            set { this.name = value; }
        }

        /*public int NumClasses
        {
            get { return this.numClasses; }
            set { this.numClasses = value; }
        }
        */
    }
}
