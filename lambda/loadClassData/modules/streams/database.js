const {AsyncTransform} = require('./streams');
const AWS = require('aws-sdk');
const DB = new AWS.DynamoDB.DocumentClient();

class DatabasePrepStream extends AsyncTransform {
    constructor(){
        super();
    }

    //breaks apart the array of courses back into a stream
    async _task(items){
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
        }) 
    }
}

//creates the batchWrite request and writes to the given table
class DatabaseWriteStream extends AsyncTransform {
    constructor(tableName){
        super();
        this.tableName = tableName;
    }

    async _task(items){
        try {
            var params = {
                RequestItems: {
                    [this.tableName]: items
                }
            };
            var response = await DB.batchWrite(params).promise()
            var failedItems = Object.entries(response.UnprocessedItems).length;
            if (failedItems > 0){
                console.log(`Failed items: ${failedItems}`);
            } else {
                console.log('BatchWrite succeeded');
            }
        } catch (error) {
            console.log(`Error: ${error}`);
        }
    }
}

module.exports = {DatabasePrepStream, DatabaseWriteStream};