# Temple University Schedule Maker
TU Schedule-Maker is a web application designed with integration with <a href="https://aws.amazon.com/">Amazon Web Services</a> that allows Temple Univeristy students to create and visualize custom schedules using various options as outlined below. Users can input their desired classes either by name (ex: CIS 1068), or by title (ex: "Calculus I"), with assistance from an auto-complete dropdown menu. Once the user sets all of the desired options, the program calculates and displays the top 5 schedules in a weekly calendar format, so that he/she can easily view how their schedule would look.

Class data is updated every 5 minutes during registration period, and daily outside of that to ensure accurate information. Given that for certain course lists, there may be dozens, or even hundreds of possible schedules, TUSM provides many options for narrowing down the displayed results, as well as algorithms for ranking the resulting schedules displayed to the user.

<h1>Features</h1>
<h3>Note: This list is subject to change as the application develops. New feature requests are welcome.</h3>

Note that it is possible to have no resulting schedules based on parameters that are either too restrictive, or due to sections of a course being closed. If the application cannot find any matching schedules, try adjusting your options.

<h4>Planned features (v1.0):</h5>
<ul>
  <li>Filters out time conflicts between sections</li>
  <li>Restricts based on start and end times (e.g., no classes before 10am or after 5pm)</li>
  <li>Set the maximum number of classes per day</li>
  <li>Filters out schedules with classes on certain days</li>
  <li>Will prioritize schedules with specified professor(s) and not display schedules with undesired professor(s)</li>
</ul>

<h4>Planned for future releases</h4>
<ul>
    <li>Plan around user-specified time blocks, such as sports/music practice, part-time job, etc.</li>
    <li>Prioritize schedules that minimize running around campus (e.g., if you have 2 classes that are in the same building, try to make them back-to-back. Work your way across campus, etc.)</li>
</ul>

<h1>Structure</h1>

The data for creating structures is broken down into 3 main classes:
<ul>
  <li><b>Course</b> - Represents a single course, that has a name (e.g., MATH 1041), title (e.g., Calculus I), and a List of Section objects representing all of the sections available for that course.</li>
  <li><b>Section</b> - Represents a section of a course. This contains the Course Registration Number (CRN), and one or more ClassTime objects, representing the lecture and lab/recitation, if applicable.</li>
  <li><b>ClassTime</b> - Represents either a lecture or lab/recitation meeting time. Contains the days the class meets, the start and end times, the location, and the instructor.</li>
</ul>

The structure for the data is outlined using the diagram below. Note that a Section may or may not contain a Lab/Recitation ClassTime object.

<img src="https://i.imgur.com/iPRAIsz.png">

<h1>Operation</h1>

Class data is loaded from the public search page and parsed into a DynamoDB table on AWS. S3 hosts the front-end page and Lambda in conjunction with the API Gateway are utilized for backend processing.

