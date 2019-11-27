const ClassTime = require('./classtime');
const Section = require('./section');
const AWS = require('aws-sdk');

/**
 * @class DynamoDBProxy - A util/proxy class used to manage sending/receiving items to/from the database
 */
class DynamoDBUtil {
    /**
     * Creates a new instance of the DynamoDBProxy class
     * @param {string} tableName - The name of the DynamoDB table to work with
     * @param {object} options - The options to provide the DynamoDB DocumentClient constructor
     */
    constructor(options={}){
        this.tableName = options.tableName;
        this.db = new AWS.DynamoDB.DocumentClient(options);
        this.totalIn = 0;
        this.totalWritten = 0;
        this.totalFailed = this.totalIn - this.totalWritten;
        this.totalRead = 0;
        this.failRate = () => {
            return this.totalIn === 0 ? 0 : this.totalFailed / this.totalIn;
        }
    }

    changeTable(name){
        this.tableName = name;
    }

    stats(){
        // console.log(`Total items received: ${this.totalIn}`);
        // console.log(`Total items written to database: ${this.totalWritten}`);
        // console.log(`Total items read: ${this.totalRead}`);
        // console.log(`Total failed items: ${this.totalFailed}`);
        // console.log(`Failure rate: ${this.failRate}`);
        return {
            'Input': this.totalIn,
            'Written': this.totalWritten,
            'Read': this.totalRead,
            'Failed': this.totalFailed,
            'FailRate': this.failRate
        }
    }

    async batchWrite(items, table=this.tableName){
        this.totalIn += items.length;
        const params = {
            'RequestItems': {
                [table]: items
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
                this.totalWritten += items.length;
                console.log('BatchWrite succeeded');
            }
        } catch (error) {
            console.log(error);
        }
    }
    
    async query(query){

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

    /**
     * 
     * @param {string} prof The professors name to map
     * @param {[{id, name}]} map A map of professor IDs to names
     */
    mapProf(prof, map){
        let result = map.find(obj => prof.split(' ')
                            .every(n => obj.name.includes(n)));

        if (result) { //handles undefined case if a TA
            return result.id;
        }
        else return 'TBA';
    }

    /**
     * 
     * @param {string} campus The campus name
     * @param {[{id, name}]} map A map of campus IDs to names 
     */
    mapCampus(campus, map){
        let result = map.find(obj => `${obj.name} Campus` === campus);
        if (result){
            return result.id;
        }   
        else return null;  
    }

    /**
     * 
     * @param {Section} item
     */
    wrapSection(item, maps){
        let item = {
            'PutRequest': {
                'Item': {
                    'crn': item.crn,
                    'title': item.title,
                    'name': item.name,
                    'section': item.section,
                    'classTimes': item.classtimes,
                    'isOpen': item.isOpen,
                    'campus': this.mapCampus(item.campus, maps.campus),
                    'profs': item.classtimes.length > 0 ? 
                                item.classtimes.map(ct => this.mapProf(ct.instructor, maps.profs)) 
                                : null,
                    'days': item.classtimes.length > 0 ? 
                                item.classtimes.every(ct => ct.days !== null) ?
                                    item.classtimes.map(ct => ct.days)
                                                    .join('')
                                                    .replace(/(.)(?=.*\1)/g, "") //Remove duplicate letters
                                                    .split('') //convert to array of characters
                                    : null 
                                : null,
                    'locations': item.classtimes.length > 0 ?
                                    item.classtimes.map(ct => ct.building)
                                    : null,
                    'start': item.classtimes.length > 0 ?
                                    item.classtimes.map(ct => ct.endTime)
                                                    .reduce((a, b) => Math.max(a, b))
                                    : -1,
                    'end': item.classtimes.length > 0 ? 
                                    item.classtimes.map(ct => ct.startTime)
                                                    .reduce((a, b) => Math.min(a, b))
                                    : -1
                }
            }
        };
    }

    wrapSections(sections){
        return sections.map(section => this.wrapSection(section));
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

    wrapSearchPageItem(item){
        return {
            'PutRequest': {
                'Item': {
                    'id': item.id,
                    'name': item.name
                }
            }
        };
    }

    wrapSearchPageItems(items){
        return items.map(item => this.wrapSearchPageItem(item));
    }
}

class S3Util {
    constructor(bucket, options={}){
        this.bucket = bucket;
        this.s3 = new AWS.S3(options);
    }

    changeBucket(bucket){
        this.bucket = bucket;
    }

    async upload(items, bucket=this.bucket){

    }

    async read(file, bucket=this.bucket){
        const params = {
            'Bucket': bucket,
            'Key': file
        };
        const response = await this.s3.getObject(params).promise();
        return response.Body;
    }

    readstream(file, bucket=this.bucket){
        const params = {
            'Bucket': bucket,
            'Key': file
        };
        return this.s3.getObject(params).createReadStream();
    }
}

/**
 * @exports
 * 2 Util classes for working with S3 and DynamoDB
 */
module.exports = {DynamoDBUtil, S3Util};

