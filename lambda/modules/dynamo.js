const ClassTime = require('./classtime');
const Section = require('./section');
const AWS = require('aws-sdk');

/**
 * @class DynamoDBProxy - A helper/proxy class used to manage sending/receiving items to/from the database
 */
class DynamoDBProxy {
    /**
     * Creates a new instance of the DynamoDBProxy class
     * @param {string} tableName - The name of the DynamoDB table to work with
     * @param {object} options - The options to provide the DynamoDB DocumentClient constructor
     */
    constructor(tableName, options){
        this.tableName = tableName;
        this.db = new AWS.DynamoDB.DocumentClient(options);
        this.totalIn = 0;
        this.totalWritten = 0;
        this.totalFailed = this.totalIn - this.totalWritten;
        this.totalRead = 0;
        this.failRate = () => {
            return this.totalIn === 0 ? 0 : this.totalFailed / this.totalIn;
        }
    }

    stats(){
        console.log(`Total items received: ${this.totalIn}`);
        console.log(`Total items written to database: ${this.totalWritten}`);
        console.log(`Total items read: ${this.totalRead}`);
        console.log(`Total failed items: ${this.totalFailed}`);
        console.log(`Failure rate: ${this.failRate}`);
        return {
            'Input': this.totalIn,
            'Written': this.totalWritten,
            'Read': this.totalRead,
            'Failed': this.totalFailed,
            'FailRate': this.failRate
        }
    }

    async batchWrite(items){
        this.totalIn += items.length;
        const params = {
            'RequestItems': {
                [this.tableName]: items
            },
            'ReturnConsumedCapacity': 'TOTAL',
            'ReturnItemCollectionMetrics': 'SIZE'
        };
        try {
            const response = await this.db.batchWrite(params).promise();
            const failedItems = Object.entries(response.UnprocessedItems).length;
            if (failedItems > 0){
                this.totalWritten += items.length - failedItems;
                this.totalFailed += failedItems;
                console.log(`Failed items: ${failedItems}`);
            } else {
                console.log('BatchWrite succeeded');
            }
        } catch (error) {
            console.log(error); 
        }
    }

    async scan(){
        const params = {
            'TableName': this.tableName
        };
        try {
            const response = await this.db.scan(params).promise();
            this.totalRead += response.Items.length;
            return response.Items;
        } catch (error) {
            console.log(error);
        }
    }

    wrapSection(item){
        return {
            'PutRequest': {
                'Item': {
                    'crn': item.crn,
                    'title': item.title,
                    'name': item.name,
                    'section': item.section,
                    'classTimes': item.classtimes,
                    'profs': item.classtimes.map(ct => ct.instructor),
                    'days': item.classtimes.every(ct => ct.days !== null) ?
                        item.classtimes.map(ct => ct.days)
                            .join('') :
                        null,
                    'locations': item.classtimes.map(ct => ct.building),
                    'maxTime': item.classtimes.map(ct => ct.endTime)
                        .reduce((a, b) => Math.max(a, b)),
                    'minTime': item.classtimes.map(ct => ct.startTime)
                        .reduce((a, b) => Math.min(a, b)),
                    'isOpen': item.isOpen,
                    'campus': item.campus
                }
            }
        };
    }
    
    unwrapSections(items){
         return items.map(obj => {
            return new Section([obj.crn, obj.name, obj.title, obj.section], this._parseClassTimes(obj.classTimes), obj.isOpen, obj.campus);
        });
    }
    
    _parseClassTimes(arr){
        return arr.map(obj => {
            return new ClassTime(obj.days, [obj.startTime, obj.endTime], obj.instructor, obj.location);
        });
    }
}

/**
 * @exports DynamoDBProxy class
 */
module.exports = DynamoDBProxy;

