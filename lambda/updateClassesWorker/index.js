/**
 * @description A worker Lambda that processes the classes within a single subject category
 */
const {DynamoDBUtil, S3Util} = require('./modules/aws-utils');
const Banner = require('./modules/banner');
const env = process.env;

//Create the DynamoDB object if it doesn't exist from a previous invocation
if (!dynamo){
    var dynamo = init_db();
}

//Create the banner object if it doesn't exist from a previous invocation
if (!banner){
    var banner = init_banner();
}

//Check if JSON maps exist from previous invocation
if (!maps){
    var maps = null; //initialized in handler
}

/**
 * @exports
 */
exports.handler = async(event) => {
    console.log(`Received ${event.subject}`);
    try {
        if (!maps){
            //read JSON from S3
            let s3 = new S3Util(env.bucket);
            maps = {
                campus: JSON.parse(await s3.read(env.campus)), 
                profs: JSON.parse(await s3.read(env.profs))
            };
        }
        return await update(event.subject);
    } catch (error) {
        return error;
    } 
};

/**
 * @async
 * @function update - Updates the sections for the given subject and updates the database
 * @param {string} subject 
 */
async function update(subject){
    console.log(`Sending request for ${subject}`);
    try {
        const sections = await banner.classSearch(subject);
        console.log('Request complete');
        const wrapped = dynamo.wrapSections(sections, maps);
        let pending = [];       

        while (wrapped.length > 0){
            //take up to 25 items at a time (will take whole array if less than 25)
            pending.push(dynamo.batchWrite(wrapped.splice(0, 25))); 
        }       
    
        await Promise.all(pending);
        console.log(`Successfully updated sections for ${subject}`);  
    } catch (error) {
        console.log(error);
    }
}

/**
 * @function init_banner - Initializes the Banner object
 * @returns {Banner}
 */
function init_banner(){
    //configure banner options
    const bannerOptions = {
        'term': env.term
    };
    return new Banner(bannerOptions);
}

/**
 * @function init_db - Initializes the DynamoDB object
 * @returns {DynamoDBUtil}
 */
function init_db(){
    //configure DynamoDB options
    const dbOptions = {'tableName': env.table};
    if (env.mode === 'test'){
        dbOptions.endpoint = `${env.url}:${env.dynamo}`;
        dbOptions.region = env.region;
    }

    return new DynamoDBUtil(dbOptions);
}