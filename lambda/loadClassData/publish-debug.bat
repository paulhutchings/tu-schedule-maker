del index.zip 

robocopy ..\modules\ .\modules

7z a -r ./index.zip * -x!*.bat

aws lambda update-function-code --function-name load-class-data-test --zip-file fileb://index.zip

