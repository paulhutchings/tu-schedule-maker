const BannerAPI = require('./test/modules/bannerAPI');
const fs = require('fs');
const {promisify} = require('util');
const writeFile = promisify(fs.writeFile);
const path = './s3/json';

const Banner = new BannerAPI();

async function main(){
    try {
        console.log('getting data from Banner');
        const data = await Banner.getClassSearchPage(process.env.term);
        console.log('writing to JSON');
        let pending = [];
        pending.push(writeFile(`${path}/profs.json`, JSON.stringify(data.profs)))
        pending.push(writeFile(`${path}/subjects.json`, JSON.stringify(data.subjects)));
        pending.push(writeFile(`${path}/campus.json`, JSON.stringify(data.campus)));
        await Promise.all(pending);
        console.log('done');
    } catch (error) {
        console.log(error);
    }
}

main();
