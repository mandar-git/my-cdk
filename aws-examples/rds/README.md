
# Test Locally

Navigate to rds directory and run below commands

npx ts-node mysql.ts

Output of cdk synth (we have added app.synth and outDir as dist in the mysql.ts) will be generated in the dist directory as a json file (MysqlStack.template.json) which is the Cloud Formation Template generated
by CDK