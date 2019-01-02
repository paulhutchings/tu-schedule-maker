del index.zip 

robocopy ..\modules\ .\modules

7z a -r ./index.zip * -x!*.bat

