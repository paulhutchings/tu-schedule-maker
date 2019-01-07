del index.zip 

7z a -r ./index.zip * -x!*.bat

aws lambda update-function-code --function-name update-subjects-test --zip-file fileb://index.zip