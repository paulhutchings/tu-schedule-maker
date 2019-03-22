/**
 * @description A worker Lambda that processes the classes within a single subject category
 */
const {DynamoDBUtil} = require('./modules/aws-utils');
const Banner = require('./modules/banner');

//Create the DynamoDB object if it doesn't exist from a previous invocation
if (!dynamo){
    var dynamo = init_db();
}

//Declare the banner object if it doesn't exist from a previous invocation
if (!banner){
    var banner = null; //Initialized in handler
}

/**
 * @exports
 */
exports.handler = async(event) => {
    console.log(`Received ${event.subject}`);
    try {
        //Initialize Banner object
        if (!banner){
            banner = await init_banner();
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
        const wrapped = dynamo.wrapSections(sections);
        let pending = [];       

        while (wrapped.length > 0){
            //take up to 25 items at a time (will take whole array if less than 25)
            pending.push(dynamo.batchWrite(wrapped.splice(0, 25))); 
        }       
    
        await Promise.all(pending);
        return `Successfully updated sections for ${subject}`;  
    } catch (error) {
        return error;
    }
}

/**
 * @async
 * @function init_banner - Initializes the Banner object
 * @returns {Banner}
 */
async function init_banner(){
    try {
        //read JSON files from S3
        const s3 = new S3Util(env.bucket);
        var [campus, profs] = [JSON.parse(await s3.read(env.campusJSON)), JSON.parse(await s3.read(profsJSON))];
    } catch (error) {
        console.log(error);
        return null;
    }

    //configure banner options
    const bannerOptions = {
        'campus': campus,
        'profs': profs,
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