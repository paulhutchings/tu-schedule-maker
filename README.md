# Temple University Schedule Maker
TU Schedule-Maker is a web application designed with integration with <a href="https://aws.amazon.com/">Amazon Web Services</a> that allows Temple Univeristy students to create and visualize custom schedules using various options as outlined below. Users can input their desired classes either by name (ex: CIS 1068), or by title (ex: "Calculus I"), with assistance from an auto-complete dropdown menu. Once the user sets all of the desired options, the program calculates and displays the top 5 schedules in a weekly calendar format, so that he/she can easily view how their schedule would look.

Class data is loaded from the public search page at https://prd-wlssb.temple.edu/prod8/bwckschd.p_disp_dyn_sched and parsed into a DynamoDB table on AWS. S3 hosts the front-end page and Lambda in conjunction with the API Gateway are utilized for backend processing.

Class data is updated every 5 minutes during registration period, and daily outside of that to ensure accurate information. Given that for certain course lists, there may be dozens, or even hundreds of possible schedules, TUSM provides many options for narrowing down the displayed results, as well as algorithms for ranking the resulting schedules displayed to the user.

<h1>Options</h1>
<h3>Note: This list is subject to change as the application develops. New feature requests are welcome.</h3>

