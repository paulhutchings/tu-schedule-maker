const {TransformAsync} = require('../streams');

/**
 * @function prepItems - Breaks apart the array of courses and wraps each one in a PUT request
 * so that it can be written to the DynamoDB table
 * @param {[string, [Course]]} data - A tuple containing the relevent subject and an array of 
 * Course objects for the subject
 */
async function prepItems(data){
    try {
        const [subject, items] = data;
        console.log(`Creating PUT requests for ${subject}...`);
        items.forEach(item => {
            this.push({
                PutRequest: {
                    Item: {
                        name: item.name,
                        title: item.title,
                        sections: item.sections
                    }
                }
            });
        });
        console.log(`Database prep complete for ${subject}`); 
    } catch (error) {
        console.log(error);
    }
}

/**
 * @class 
 * Takes an array of PUT requests, creates a bathWrite request with it, then sends the request to the given
 * DynamoDB table using the given DocumentClient
 */
class DatabaseWriteStream extends AsyncTransform {
    /**
     * Creates a new instance of the DB WriteStream
     * @param {string} tableName - The name of the DynamoDB table to send the batchWrite requests to
     * @param {AWS.DynamoDB.DocumentClient} dbObj - The DocumentClient object used to send the requests
     */
    constructor(tableName, dbObj){
        super({objectMode: true});
        this.tableName = tableName;
        this.db = dbObj;
        this.totalIn = 0;
        this.totalOut = 0;
    }

    /**
     * @implements
     * Sends a batchWrite request to put items into the DynamoDB table
     * @param {[object]} items - An array of PUT requests to use in the batchWrite request
     */
    async _task(items){
        this.totalIn += items.length;
        try {
            var params = {
                RequestItems: {
                    [this.tableName]: items
                }
            };
            var response = await this.db.batchWrite(params).promise()
            var failedItems = Object.entries(response.UnprocessedItems).length;
            if (failedItems > 0){
                this.totalOut += items.length - failedItems;
                console.log(`Failed items: ${failedItems}`);
            } else {
                console.log('BatchWrite succeeded');
            }
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * @override
     * Logs the total input/output and failed items
     * @param {function} callback - The callback function to be invoked when done
     */
    _flush(callback){
        console.log(`Total items received: ${this.totalIn}`);
        console.log(`Total items written to database: ${this.totalOut}`);
        console.log(`Total failed items: ${this.totalIn - this.totalOut}`);
        callback();
    }
}

const DBPrepStream = new TransformAsync(prepItems, {objectMode: true});
/**
 * @exports
 * An instance of TransformAsync that preps items for the database, and the DataBaseWrite stream class 
 */
module.exports = {DBPrepStream, DatabaseWriteStream};