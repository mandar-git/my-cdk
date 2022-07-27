#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkProjStack } from '../lib/cdk-proj-stack';

const app = new cdk.App({outdir: 'out'});
new CdkProjStack(app, 'CdkProjStack', {
});
app.synth({validateOnSynthesis:false})