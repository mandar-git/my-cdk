import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as core from 'aws-cdk-lib';
import path = require('path')
const fs = require('fs-extra')
import {CfnInclude} from 'aws-cdk-lib/cloudformation-include'

export class CdkProjStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    let basePath = path.join(__dirname,'..')

    
    new core.CfnParameter(this,'ImageId',{type: 'String', default: ''});
    new core.CfnCondition(this,'IsBucketEmpty',{
      expression: core.Fn.conditionEquals(core.Fn.ref('ImageId'),'')
    })
    
    let templatePath = path.join(basePath,'templates','template2.json')
    console.log(templatePath)

    new CfnInclude(this,'myBucket',{
      templateFile: templatePath
    })
    
  }
}
