import { Stack, StackProps } from '@aws-cdk/core';
import * as core from '@aws-cdk/core';
import path = require('path')
const fs = require('fs-extra')

export class CdkV1ProjStack extends Stack {
  constructor(scope: core.Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    let basePath = path.join(__dirname,'..')
   
    new core.CfnParameter(this,'ImageId',{type: 'String', default: ''});
    new core.CfnCondition(this,'IsBucketEmpty',{
      expression: core.Fn.conditionEquals(core.Fn.ref('ImageId'),'')
    })
    

    let templatePath = path.join(basePath,'templates','template.json')
    console.log(templatePath)
    const templateContent= fs.readFileSync(templatePath,'utf-8');
    const cfnTemplate =  JSON.parse(templateContent)  ;
    new core.CfnInclude(this,'myBucket',{
      template: cfnTemplate
    })
  }
}
