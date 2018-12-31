const {AsyncTransform} = require('./streams');

class DatabasePrepStream extends AsyncTransform {
    constructor(){
        super();
    }

    //breaks apart the array of courses back into a stream
    async _task(data){
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
    }
}

//creates the batchWrite request and writes to the given table
class DatabaseWriteStream extends AsyncTransform {
    constructor(tableName, dbObj){
        super();
        this.tableName = tableName;
        this.db = dbObj;
        this.totalIn = 0;
        this.totalOut = 0;
    }

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
            console.log(`Error: ${error}`);
        }
        console.log(`Total items received: ${this.totalIn}`);
        console.log(`Total items written to database: ${this.totalOut}`);
    }
}

module.exports = {DatabasePrepStream, DatabaseWriteStream};