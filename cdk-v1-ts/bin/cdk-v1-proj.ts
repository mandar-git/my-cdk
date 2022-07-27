#!/usr/bin/env node
import 'source-map-support/register';
import * as core from '@aws-cdk/core';
import { CdkV1ProjStack } from '../lib/cdk-v1-proj-stack';

const app = new core.App({outdir: 'out'});
new CdkV1ProjStack(app, 'CdkV1ProjStack', {
});
app.synth()