using System;
using System.Collections.Generic;

namespace ScheduleMaker
{
    public class Course
    {
        //FIELDS
        private string name, title; //name is DEPT #### (ex CIS 1068) and the title would be for example "Calculus I"
        private List<Section> sections; //Section objects stored in a list for easy iteration

        //CONSTRUCTORS
        public Course(string name, string title)
        {
            this.name = name;
            this.title = title;
            sections = new List<Section>();
        }

        //ACCESSORS
        public string Name
        {
            get { return this.name; }
            set { this.name = value; }
        }

        public string Title
        {
            get { return this.title; }
            set
            {
                if (value.Contains("&amp"))
                {
                    value.Replace("&amp", "and"); //scraping the & character from HTML results in "&amp" in the text. This line fixes that
                }
                this.title = value;
            }
        }

        public List<Section> Sections
        {
            get { return this.sections; }
            set { this.sections = value; }
        }

        //METHODS
        public void AddSection(Section section)
        {
            sections.Add(section);
        }
    }
}
